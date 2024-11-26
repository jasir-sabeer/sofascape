const { name } = require("ejs");
const mongoose = require("mongoose");
const Cart = require('../../models/cartSchema')
const User = require('../../models/userschema')
const Product = require('../../models/prductschema')


const loadCartPage = async (req, res) => {
  const id = req.session.user;
    try {
        
         const users = await User.findOne({ _id: id, isblocked: false });
        
 
         if (!users) {
             res.status(404).render('login')
         }


         const userId=req.session.user;
         const cart=await Cart.findOne({userId}).populate('products.productId').exec()
         if (!cart) {
            return res.render('cart', { cartProducts: [] }); 
          }
          let subtotal = 0;
          cart.products.forEach(item => {
            const productTotal = item.quantity * item.productId.regularprice; 
            item.subtotal = productTotal; 
            subtotal += productTotal; 
          });
      
          res.render('cart', { cartProducts: cart.products ,subtotal});
        } catch (error) {
          console.error('Error loading cart page:', error);
          res.redirect('/page-404');
        }
    }

const addCart = async (req, res) => {
    const productId = req.params.id;
    const userId = req.session.user; 
  
    if (!userId) {
      return res.status(401).send("User not authenticated");
    }
  
    try {
      
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).send("Product not found");
      }
  
    
      let cart = await Cart.findOne({ userId });
  
      if (!cart) {
        cart = new Cart({
          userId,
          products: [
            {
              productId,
              quantity: 1,
              name: product.productname,
              images: product.images[0],
              price: product.regularprice,
            },
          ],
        });
      } else {
        const existingProductIndex = cart.products.findIndex(
          (item) => item.productId.toString() === productId
        );
  
        if (existingProductIndex > -1) {
          cart.products[existingProductIndex].quantity += 1;
        } else {

          cart.products.push({
            productId,
            quantity: 1,
            name: product.productname,
            images: product.images[0],
            price: product.regularprice,
          });
        }
      }
  
      await cart.save();
      res.redirect("/cartPage");
    } catch (error) {
      console.error("Error adding product to cart:", error);
      res.status(500).send("Internal server error");
    }
  };


  const updateCartQuantity = async (req, res) => {
    const { productId,quantity } = req.body;
    const userId = req.session.user;

    try {
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        if (quantity < 1 || quantity > 10) {
            return res.status(400).json({ success: false, message: 'Invalid quantity' });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const product = cart.products.find(item => item.productId.toString() === productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not in cart' });
        }

        product.quantity = quantity;
        await cart.save();

        res.json({ success: true, message: 'Quantity updated', products: cart.products });
    } catch (error) {
        console.error("Error updating quantity:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

  


module.exports = {
    loadCartPage,
    addCart,
    updateCartQuantity 
}