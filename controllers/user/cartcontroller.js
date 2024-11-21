const { name } = require("ejs");
const mongoose = require("mongoose");
const Cart = require('../../models/user/cartSchema')
const User = require('../../models/admin/userschema')
const Product = require('../../models/admin/prductschema')


const loadCartPage = async (req, res) => {

    try {
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
      res.redirect("/cart");
    } catch (error) {
      console.error("Error adding product to cart:", error);
      res.status(500).send("Internal server error");
    }
  };
  const updateCartQuantity = async (req, res) => {
    const { productId, quantity } = req.body; // Extract productId and new quantity
    const userId = req.session.user; // Get the logged-in user's ID from the session

    try {
        // Check if user is authenticated
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        // Validate quantity
        if (quantity < 1 || quantity > 10) {
            return res.status(400).json({ success: false, message: 'Invalid quantity value' });
        }

        // Find the user's cart
        const cart = await Cart.findOne({ userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        // Find the product in the cart
        const product = cart.products.find(item => item.productId.toString() === String(productId));
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        // Update the quantity of the product
        product.quantity = quantity;

        // Save the cart back to the database
        await cart.save();

        // Respond with success and updated products
        return res.json({ 
            success: true, 
            message: 'Quantity updated successfully', 
            products: cart.products 
        });
    } catch (error) {
        console.error(`Error updating cart quantity for user ${userId} and product ${productId}:`, error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

  


module.exports = {
    loadCartPage,
    addCart,
    updateCartQuantity 
}