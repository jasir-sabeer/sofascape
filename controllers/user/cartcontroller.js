const { name } = require("ejs");
const mongoose = require("mongoose");
const Cart = require('../../models/cartSchema')
const User = require('../../models/userschema')
const Product = require('../../models/prductschema')
const Coupon = require('../../models/couponSchema')
const Category=require('../../models/categoryschema')


const loadCartPage = async (req, res) => {
    const id = req.session.user;

    try {
        const users = await User.findOne({ _id: id, isblocked: false });

        if (!users) {
            return res.status(404).render('login');
        }

        const userId = req.session.user;
        const cart = await Cart.findOne({ userId }).populate('products.productId').exec();

        if (!cart) {
            return res.render('cart', { cartProducts: [], subtotal: 0, cartCount: 0 });
        }

        const validProducts = [];
        let subtotal = 0;
        let cartCount = 0;

        for (const item of cart.products) {
            const product = item.productId;
            const category = await Category.findById(product.category);

            if (product.isListed && category && category.isListed) {
                let productTotal = 0;

                if (product.discountPrice && product.discountPrice < product.regularprice) {
                    productTotal = item.quantity * product.discountPrice;
                } else {
                    productTotal = item.quantity * product.regularprice;
                }

                item.subtotal = productTotal;
                validProducts.push(item);
                subtotal += productTotal;
                cartCount++;
            }
        }

        res.render('cart', { cartProducts: validProducts, subtotal, cartCount });

    } catch (error) {
        console.error('Error loading cart page:', error);
        res.redirect('/page-404');
    }
};



const addCart = async (req, res) => {
    const productId = req.params.id;
    const userId = req.session.user;
    const quantity = parseInt(req.body.qty, 10) || 1;

    if (!userId) {
        return res.status(401).send("Please login");
    }

    if (quantity < 1) {
        return res.status(400).send("Invalid quantity");
    }

    if (quantity > 10) {
        return res.status(400).send("You can only add up to 10 products at a time.");
    }

    try {
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(400).send("Product not found");
        }

        if (product.stock < quantity) {
            return res.status(400).send(`Only ${product.stock} units available`);
        }

        let cart = await Cart.findOne({ userId });
        if (!cart) {
            
            cart = new Cart({
                userId,
                products: [
                    {
                        productId,
                        quantity,
                        name: product.productname,
                        images: product.images[0],
                        price: product.discountPrice && product.discountPrice < product.regularprice
                            ? product.discountPrice
                            : product.regularprice,
                    },
                ],
            });
        } else {
            
            const existingProductIndex = cart.products.findIndex(
                (item) => item.productId.toString() === productId
            );

            if (existingProductIndex > -1) {
                return res.status(200).send("Product already in cart. Please go to the cart psge.");
            }

        
            cart.products.push({
                productId,
                quantity,
                name: product.productname,
                images: product.images[0],
                price: product.discountPrice && product.discountPrice < product.regularprice
                    ? product.discountPrice
                    : product.regularprice,
            });
        }

        await cart.save();

        

        return res.status(200).send('product added in cart');
    } catch (error) {
        console.error("Error adding product to cart:", error);
        res.status(500).send("Internal server error");
    }
};

const updateCartQuantity = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.user;

        if (!productId || quantity == null) {
            return res.status(400).json({ success: false, message: 'Product ID and quantity are required.' });
        }

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User is not logged in.' });
        }

        const cart = await Cart.findOne({ userId }).populate('products.productId');
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found.' });
        }

        const productIndex = cart.products.findIndex(item => item.productId._id.toString() === productId.toString());
        if (productIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product not found in cart.' });
        }

        const product = cart.products[productIndex].productId;
        const availableStock = product.stock;

        if (quantity > availableStock) {
            return res.status(400).json({
                success: false,
                message: `Only ${availableStock} units are available for this product.`,
            });
        }

        if (quantity ===11) {
            return res.status(400).json({
                success: false,
                message: 'You cannot add more than 10 units of a single product to the cart.',
            });
        }

        cart.products[productIndex].quantity = quantity;

        let subtotal = 0;
        cart.products.forEach(item => {
            const applicablePrice = item.productId.discountPrice || item.productId.regularprice;
            const productTotal = item.quantity * applicablePrice;
            item.subtotal = productTotal;
            subtotal += productTotal;
        });

        await cart.save();

        res.json({
            success: true,
            message: 'Cart quantity updated successfully.',
            newPrice: cart.products[productIndex].subtotal,
            newSubtotal: subtotal,
        });
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        res.status(500).json({ success: false, message: 'Server error occurred while updating cart quantity.' });
    }
};




const cancelProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.session.user;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const cart = await Cart.findOne({ userId }).populate('products.productId').exec();

        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const productIndex = cart.products.findIndex(
            (item) => item.productId._id.toString() === productId
        );

        if (productIndex === -1) {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        const product = cart.products[productIndex].productId;
        const quantityToRemove = cart.products[productIndex].quantity;
        const newStock = product.stock + quantityToRemove;


        await Product.findByIdAndUpdate(productId, { stock: newStock });


        cart.products.splice(productIndex, 1);

        if (cart.products.length === 0) {

            await Cart.deleteOne({ _id: cart._id });
            return res.json({ success: true, message: 'Cart deleted as no products are left' });
        } else {

            await cart.save();
            return res.json({ success: true, message: 'Product removed from cart and stock updated' });
        }
    } catch (error) {
        console.error('Error canceling product:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};





module.exports = {
    loadCartPage,
    addCart,
    updateCartQuantity,
    cancelProduct,

}