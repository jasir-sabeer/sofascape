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
   
    
    res.json({ success: true, orderId:oders._id});
    
    
       
    } catch (error) {
        console.log(error);

        res.status(500).json({ message: 'Error adding order', error });
    }
}

const loadThankyou = async (req, res) => {
    const { orderId } = req.query;
    const user = req.session.user;
    console.log(orderId);
    console.log('User ID:', user);

    

    try {
        const orders= await Order.findOne({ _id: orderId, userId: user }).populate('address');
        console.log('Order with address:', orders);
        res.render('thankyou', { orders });
    } catch (error) {
        console.error('Error loading thank you page:', error);
        res.status(500).json({ message: 'Error adding order', error });
    }
};






module.exports = {
loadCheckout,
addAddressCheckout,
editAddressCheckout,
saveOrder,
loadThankyou
}







