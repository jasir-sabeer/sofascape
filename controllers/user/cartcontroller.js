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
      console.log(req.body.qty);
  
      if (!userId) {
          return res.status(401).send("Please login ");
      }
  
      try {
          // Fetch the product
          const product = await Product.findById(productId);
          if (!product) {
              return res.status(404).send("Product not found");
          }
  
          // Check if stock is available
          if (product.stock <= 0) {
              return res.status(400).send("Product is out of stock");
          }
  
          // Fetch or create the user's cart
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
              // Check if the product is already in the cart
              const existingProductIndex = cart.products.findIndex(
                  (item) => item.productId.toString() === productId
              );
  
              if (existingProductIndex > -1) {
                  // Increase the quantity of the existing product in the cart
                  cart.products[existingProductIndex].quantity += 1;
              } else {
                  // Add the new product to the cart
                  cart.products.push({
                      productId,
                      quantity: 1,
                      name: product.productname,
                      images: product.images[0],
                      price: product.regularprice,
                  });
              }
          }
  
          // Save the cart
          await cart.save();
  
          // Decrease the product stock
          product.stock -= 1;
          await product.save();
  
          // Redirect to the cart page
          res.redirect("/cartPage");
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
            return res.status(400).json({
                success: false,
                message: 'Product ID and quantity are required.',
            });
        }

        if (quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be at least 1.',
            });
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User is not logged in.',
            });
        }

      
        const cart = await Cart.findOne({ userId }).populate('products.productId');

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found.',
            });
        }

        
        const productIndex = cart.products.findIndex(
            item => item.productId._id.toString() === productId.toString()
        );

        if (productIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Product not found in cart.',
            });
        }

        const product = cart.products[productIndex].productId;

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product data unavailable.',
            });
        }

        const availableStock = product.stock;
        const currentQuantity = cart.products[productIndex].quantity;
        const quantityDifference = quantity - currentQuantity;

        if (quantity > availableStock + currentQuantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${availableStock + currentQuantity} units available for this product.`,
            });
        }

        
        cart.products[productIndex].quantity = quantity;

        
        const newStock = availableStock - quantityDifference;
        const stockUpdateResult = await Product.findByIdAndUpdate(
            productId,
            { stock: newStock },
            { new: true }
        );

        if (!stockUpdateResult) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update product stock.',
            });
        }

        
        await cart.save();

        const updatedPrice = product.regularprice * quantity;
    
        res.json({
            success: true,
            message: 'Cart quantity updated successfully.',
            newPrice: updatedPrice,
        });
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        res.status(500).json({
            success: false,
            message: 'Server error occurred while updating cart quantity.',
        });
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
    cancelProduct
}