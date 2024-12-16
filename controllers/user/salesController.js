const { name } = require("ejs");
const mongoose = require("mongoose");
const User = require("../../models/userschema");
const Address = require('../../models/addressschema')
const Cart = require('../../models/cartSchema')
const Order = require('../../models/orderSchema')
const Coupon = require('../../models/couponSchema')
const razorpay = require('razorpay')
const Wishlist = require('../../models/wishlist')
const Product = require('../../models/prductschema')
const Wallet=require('../../models/walletSchema')
const crypto = require('crypto');



const loadCheckout = async (req, res) => {
    const user = req.session.user
    try {
       
        const addresses = await Address.find({ user: user })
        const coupons = await Coupon.find({ isListed: true, isExpired: false })
        const cartProduct = await Cart.findOne({ userId: user }).populate("userId").populate("products.productId").exec()
        
        let subtotal = 0;
        let productTotal;
        cartProduct.products.forEach(item => {
            if (item.productId.discountPrice && item.productId. discountPrice < item.productId.regularprice) {
                productTotal = item.quantity * item.productId.discountPrice;
            } else {
                productTotal = item.quantity * item.productId.regularprice;
            }
            item.subtotal = productTotal;
            subtotal += productTotal;
        });

        const shipping = 50;
        const total = subtotal + shipping;

        res.render("checkout", { addresses, cartProduct: cartProduct.products, subtotal, total, coupons })


    } catch (error) {
        res.status(500).json({ error: 'Server error, please try again later.' });
    }
}


const addAddressCheckout = async (req, res) => {
    const { firstName, lastName, email, phoneNumber, address, street, city, state, pincode } = req.body;
    console.log(req.body)
    const userId = req.session.user;
    try {
        const addresses = new Address({
            user: userId,
            firstName,
            lastName,
            email,
            phoneNumber,
            address,
            street,
            city,
            state,
            pincode
        })
        await addresses.save()
        res.redirect('/checkout?success=address added successfully.');


    } catch (error) {
        console.log(error);

        res.status(500).json({ message: 'Error adding adress', error });
    }
}

const editAddressCheckout = async (req, res) => {
    const addressId = req.params.id;
    const updatedData = {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
        street: req.body.street,
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
    };

    try {
        const address = await Address.findByIdAndUpdate(addressId, updatedData, { new: true });
        if (!address) {
            return res.status(404).send('Address not found');
        }


        res.redirect('/checkout');
    } catch (error) {
        console.error('Error updating address:', error);
    }
}


const saveOrder = async (req, res) => {
    console.log('Received request body:', req.body);

    const { addressId, cartItems, subtotal, shippingCost, total, paymentMethod, couponDiscountValue, finalDiscountAmount } = req.body;
    const userId = req.session?.user;

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'User not logged in or session expired.'
        });
    }

    try {
        if (!Array.isArray(cartItems)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid cart data.'
            });
        }

        const orderProducts = cartItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            name: item.name,
            price: item.price,
            image: item.image,
            status: item.status,
            offerPrice:item.offerPrice
        }));

        const newOrder = new Order({
            userId,
            products: orderProducts,
            address: addressId,
            total: total,
            subtotal: subtotal,
            shippingCost: shippingCost,
            paymentMethod: paymentMethod,
            createdAt: new Date(),
            couponDiscountValue: couponDiscountValue,
            finalDiscountAmount: finalDiscountAmount
        });

        const savedOrder = await newOrder.save();
        console.log('Saved order:', savedOrder);

        const cartClearResult = await Cart.findOneAndUpdate(
            { userId },
            { products: [] },
            { new: true }
        );

        if (!cartClearResult) {
            console.warn('Cart not found or already empty.');
            return res.status(404).json({
                success: false,
                message: "Cart not found or already empty."
            });
        }

        return res.status(200).json({
            success: true,
            orderId: savedOrder._id
        });

    } catch (error) {
        console.error('Error during order processing:', error);
        return res.status(500).json({
            success: false,
            message: 'Error adding order',
            error: error.message
        });
    }
};


const loadThankyou = async (req, res) => {
    const { orderId } = req.query;
    const user = req.session.user;
    try {
        const orders = await Order.findOne({ _id: orderId, userId: user }).populate('address');
        console.log('Order with address:', orders);
        res.render('thankyou', { orders });
    } catch (error) {
        console.error('Error loading thank you page:', error);
        res.status(500).json({ message: 'Error adding order', error });
    }
};


const loadOrderTable = async (req, res) => {
    const userId = req.session.user;
    try {
        const orders = await Order.find({ userId })
            .populate('products.productId')
            .populate('address')
            .sort({ _id: -1 })



        res.render('orderTable', { orders })
    } catch (error) {
        console.error('Error loading thank you page:', error);
        res.status(500).json({ message: 'Error adding order', error });
    }
}

const loadOrderDetails = async (req, res) => {
    const { orderId } = req.params;
    const user = req.session.user;

    try {
        const orders = await Order.findOne({ _id: orderId, userId: user }).populate('address');

        if (!orders) {
            return res.status(404).json({ message: 'Order not found' });
        }


        res.render('orderDetails', { orders });
    } catch (error) {
        res.status(500).json({ message: 'Error loading order details', error });
    }
};



const cancelProduct = async (req, res) => {
    const { orderId, productId } = req.params;

    try {
        const order = await Order.findById(orderId);
        if (!order) return res.status(404).send('Order not found');

        const product = order.products.find(p => p.productId.toString() === productId);
        if (!product) return res.status(404).send('Product not found in the order');

        const originalProduct = await Product.findById(productId);
        product.status = 'Cancelled';
        originalProduct.stock += product.quantity;
        await originalProduct.save();

        const priceToRefund = product.offerPrice || product.price;
        let refundAmount = priceToRefund * product.quantity;

        if (order.couponDiscount > 0 && order.products.every(p => p.status === 'Cancelled')) {
            refundAmount -= order.couponDiscount;
        }

        let newSubtotal = order.products.reduce((sum, p) => {
            if (p.status !== 'Cancelled') {
                return sum + (p.offerPrice || p.price) * p.quantity;
            }
            return sum;
        }, 0);
        order.subtotal = newSubtotal;

        if (order.products.every(p => p.status === 'Cancelled')) {
            order.shippingCost = 0; 
            order.total = 0;      
            order.status = 'Cancelled'; 
        } else {
            order.total -= priceToRefund * product.quantity; 
            if (order.total < 0) order.total = 0;
        }

        let wallet = await Wallet.findOne({ userId: order.userId });
        if (!wallet) {
            wallet = new Wallet({
                userId: order.userId,
                balance: refundAmount,
                transactions: [{
                    type: 'refund',
                    amount: refundAmount,
                    description: `Refund for cancelled product (${product.name}) in order ${orderId}`
                }]
            });
        } else {
            wallet.balance += refundAmount;
            wallet.transactions.push({
                type: 'refund',
                amount: refundAmount,
                description: `Refund for cancelled product (${product.name}) in order ${orderId}`
            });
        }

        await wallet.save();
        await order.save();

        res.redirect('/wallet');
    } catch (error) {
        console.error("Error cancelling product:", error);
        res.status(500).send({ message: 'Error processing cancellation', error });
    }
};








const loadWishList = async (req, res) => {
    const id = req.session.user;

    try {

        const users = await User.findOne({ _id: id, isblocked: false });


        if (!users) {
            res.status(404).render('login')
        }


        const userId = req.session.user;
        const wishlist = await Wishlist.findOne({ userId }).populate('products.productId').exec()
        if (!wishlist) {
            return res.render('wishlist', { wishlistProducts: [] });
        }

        res.render('wishlist', { wishlistProducts: wishlist.products });
    } catch (error) {
        console.error('Error loading wishlist page:', error);
        res.redirect('/page-404');
    }
}


const discountCoupon = async (req, res) => {
    const { coupuncode } = req.body;
    console.log('Received coupon code:', coupuncode);
    const userId = req.session.user;

    try {

        let discountCode = await Coupon.findOne({
            code: coupuncode,
            isListed: true,
            isExpired: false
        });

        if (!discountCode) {
            console.log('No matching coupon found.');
            return res.status(404).json({ message: 'Coupon not found' });
        }

        const cart = await Cart.findOne({ userId }).populate('products.productId').exec();
        const discountValue = discountCode.discountValue;


        let subtotal = 0;
        cart.products.forEach(item => {
            const price = item.productId.discountPrice && item.productId.discountPrice < item.productId.regularprice
                ? item.productId.discountPrice
                : item.productId.regularprice;
            const productTotal = item.quantity * price;
            item.subtotal = productTotal;
            subtotal += productTotal;
        });


        const afterCoupon = subtotal - (subtotal * discountValue / 100);
        const discountAmount = ((subtotal + 50) * discountValue) / 100;
        console.log('Subtotal:', subtotal);
        console.log('Total after applying coupon:', afterCoupon);

        return res.json({ discountCode, afterCoupon, discountAmount });
    } catch (error) {
        console.error('Error during coupon query:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const addWishlist = async (req, res) => {
    const productId = req.params.id;
    console.log('ppppppppppp', productId);

    const userId = req.session.user;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            const newWishlist = await Wishlist.create({
                userId,
                products: [
                    {
                        productId,
                        productname: product.productname || 'Unknown',
                        image: product.images?.length ? product.images[0] : '',
                        regularprice: product.discountPrice && product.discountPrice < product.regularprice
                            ? product.discountPrice
                            : product.regularprice || 0,
                    },
                ],
            });

            return res.status(201).json({ message: 'Product added to wishlist', wishlist: newWishlist });
        }

        const existingProductIndex = wishlist.products.findIndex(
            (item) => item.productId.toString() === productId
        );

        if (existingProductIndex > -1) {
            return res.status(200).json({ message: 'Product already in wishlist', wishlist });
        }

        wishlist.products.push({
            productId,
            productname: product.productname || 'Unknown',
            image: product.images?.length ? product.images[0] : '',
            regularprice: product.discountPrice && product.discountPrice < product.regularprice
                ? product.discountPrice
                : product.regularprice || 0,
        });

        await wishlist.save();

        return res.status(200).json({ message: 'Product added to wishlist', wishlist });
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

const cancelProductWshlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const wishlist = await Wishlist.findOne({ userId }).populate('products.productId').exec();

        if (!wishlist) {
            return res.status(404).json({ success: false, message: 'product not found' });
        }

        const productIndex = wishlist.products.findIndex(
            (item) => item.productId._id.toString() === productId
        );

        if (productIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        wishlist.products.splice(productIndex, 1);

        if (wishlist.products.length === 0) {

            await Wishlist.deleteOne({ _id: wishlist._id });
            return res.json({ success: true, message: ' deleted as no products are left' });
        } else {

            await wishlist.save();
            return res.json({ success: true, message: 'Product removed from wishlist' });
        }
    } catch (error) {
        console.error('Error canceling product:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

const instance = new razorpay({
    key_id: process.env.RAZOR_PAY_ID,
    key_secret: process.env.RAZOR_PAY_SECRET
});

const createOrder = async (req, res) => {
 const { addressId, cartItems, subtotal, shippingCost, total, paymentMethod, couponDiscountValue, finalDiscountAmount } = req.body;
    const userId = req.session?.user;
    try {
        const finalAmount = finalDiscountAmount
            ? parseFloat(finalDiscountAmount)
            : parseFloat(total);

        const options = {
            amount: finalAmount * 100,
            currency: "INR",
            receipt: "order_receipt_" + new Date().getTime(),
            payment_capture: 1
        };

        const order = await instance.orders.create(options);

        res.status(200).json({
            success: true, 
            orderId: order.id,
            amount: options.amount
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({
            success: false, 
            error: 'Failed to create Razorpay order'
        });
    }
};

const verifyPayment = async (req, res) => {
    const { paymentResponse, orderData } = req.body;
    const userId = req.session?.user;

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentResponse;

    
    const shasum = crypto.createHmac('sha256', process.env.RAZOR_PAY_SECRET); 
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest === razorpay_signature) {
        try {
        
            const newOrder = new Order({
                userId: req.session?.user,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                products: orderData.cartItems.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    name: item.name,
                    price: item.price,
                    image: item.image,
                    offerPrice:item.offerPrice
                })),
                address: orderData.addressId,
                subtotal: orderData.subtotal,
                shippingCost: orderData.shippingCost,
                total: orderData.total,
                paymentMethod: "Razorpay", 
                couponDiscountValue: orderData.couponDiscountValue,
                finalDiscountAmount: orderData.finalDiscountAmount,
                paymentStatus: "Completed", 
                status: "Pending", 
                createdAt: new Date(),
            });
            

            const savedOrder = await newOrder.save();

            console.log("Order saved successfully:", savedOrder);
            const cartClearResult = await Cart.findOneAndUpdate(
                { userId },
                { products: [] },
                { new: true }
            );
    
            if (!cartClearResult) {
                console.warn('Cart not found or already empty.');
                return res.status(404).json({
                    success: false,
                    message: "Cart not found or already empty."
                });
            }
            return res.status(200).json({
                success: true,
                orderId: savedOrder._id
                
            });
        } catch (error) {
            console.error("Error saving order:", error);
            return res.status(500).json({
                success: false,
                message: "Payment verified but failed to save order details."
            });
        }
    } else {
        return res.status(400).json({
            success: false,
            message: "InvalidPpayment signature."
        });
    }
};


const loadWalletPage = async (req, res) => {
    const userId = req.session.user;
    try {
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = {
                balance: 0, 
                transactions: [], 
            };
        }
        res.render('wallet', { wallet });
    } catch (error) {
        console.error("Error loading wallet page:", error);
        res.status(500).send('An error occurred while loading the wallet page.');
    }
};


module.exports = {
    loadCheckout,
    addAddressCheckout,
    editAddressCheckout,
    saveOrder,
    loadThankyou,
    loadOrderTable,
    loadOrderDetails,
    cancelProduct,
    loadWishList,
    discountCoupon,
    addWishlist,
    cancelProductWshlist,
    createOrder,
    verifyPayment,
    loadWalletPage
}







