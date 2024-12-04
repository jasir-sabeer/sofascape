const { name } = require("ejs");
const mongoose = require("mongoose");
const User = require("../../models/userschema");
const Address = require('../../models/addressschema')
const Cart=require('../../models/cartSchema')
const Order=require('../../models/orderSchema')


const loadCheckout=async(req,res)=>{
    const user = req.session.user
try {
  
    const addresses = await Address.find({ user:user })

    const cartProduct=await Cart.findOne({userId:user}).populate("products.productId").exec()
    let subtotal = 0;
          cartProduct.products.forEach(item => {
            const productTotal = item.quantity * item.productId.regularprice; 
            item.subtotal = productTotal; 
            subtotal += productTotal; 
          });

    const shipping=50;
    const total=subtotal+shipping;      
    
    res.render("checkout", {  addresses,cartProduct: cartProduct.products,subtotal,total })


} catch (error) {
    res.status(500).json({ error: 'Server error, please try again later.' });
}
}


const addAddressCheckout=async(req,res)=>{
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

const editAddressCheckout=async(req,res)=>{
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


const saveOrder=async(req,res)=>{
    console.log(req.body)
 const {addressId,cartItems,subtotal,shippingCost, total,paymentMethod}=req.body;
 const userId = req.session.user;
    try {
        const orderProducts = cartItems.map(item => {
            return {
                productId: item.productId,
                quantity: item.quantity,
                name: item.name,
                price: item.price,
                image:item.image,
                status: item.status
            };
        });

    const oders=new Order({
        userId,
        products:orderProducts,
        address:addressId,
        total:total,
        subtotal:subtotal,
        shippingCost:shippingCost,
        paymentMethod:paymentMethod,
        createdAt:new Date()

    })
    await oders.save()
    const cartClearResult = await Cart.findOneAndUpdate(
        { userId },
        { products: [] }, 
        { new: true }
    );
    if (!cartClearResult) {
        return res.status(404).json({
            success: false,
            message: "Cart not found or already empty.",
        });
    }


    res.json({ success: true, orderId:oders._id});
    
    
       
    } catch (error) {
        console.log(error);

        res.status(500).json({ message: 'Error adding order', error });
    }
}

const loadThankyou = async (req, res) => {
    const { orderId } = req.query;
    const user = req.session.user;

    try {
        const orders= await Order.findOne({ _id: orderId, userId: user }).populate('address');
        console.log('Order with address:', orders);
        res.render('thankyou', { orders });
    } catch (error) {
        console.error('Error loading thank you page:', error);
        res.status(500).json({ message: 'Error adding order', error });
    }
};

const loadOrderTable=async (req,res)=>{
    const userId=req.session.user;
    try {
        const orders = await Order.find({ userId })
        .populate('products.productId')    
        .populate('address')

        
        
        res.render('orderTable',{orders})
    } catch (error) {
        console.error('Error loading thank you page:', error);
        res.status(500).json({ message: 'Error adding order', error });
    }
}

const loadOrderDetails=async(req,res)=>{
    const { orderId } = req.params;
    const user = req.session.user;
    console.log('ithann order id',orderId);
    
    try {
        const orders = await Order.findOne({ _id: orderId, userId: user}).populate('address');
        console.log(orders);
        
        if (!orders) {
            return res.status(404).json( { message: 'Order not found' });
        }
        res.render('orderDetails', { orders })
    } catch (error) {
        res.status(500).json({ message: 'Error adding order', error });
    }

}


const cancelProduct = async (req, res) => {
    const { orderId, productId } = req.params;
    const user = req.session.user;

    try {

        const updatedOrder = await Order.findOneAndUpdate(
            { _id: orderId, userId: user._id, 'products.productId': productId },
            { 'products.$.status': 'Cancelled' }, 
            { new: true } 
        );

        if (!updatedOrder) {
            return res.status(404).json({ message: 'Product not found in the order or not authorized to cancel' });
        }

        res.json({ message: 'Product cancelled successfully', order: updatedOrder });
    } catch (error) {
        console.error('Error cancelling product:', error);
        res.status(500).json({ message: 'Error cancelling product', error });
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
cancelProduct
}







