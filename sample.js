const cancelOrder = async (req, res) => {
    const { userId, orderId, productId } = req.params;
    const { cancelRreason } = req.body;
  
    if (!productId || !orderId || !userId) {
      return res.status(400).json({ message: "Missing parameters." });
    }
    if (!cancelRreason) {
      return res.status(400).json({ message: "Missing cancel reason." });
    }
  
    try {
      const user = await User.findById(userId);
  
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }
  
      const order = await Order.findOne({ userId, _id: orderId, "orderItems.productId": productId }).populate(
        "orderItems.productId",
        "offerPrice"
      );
  
      if (!order) {
        return res.status(404).json({ message: "Order or product not found." });
      }
  
      const orderItem = order.orderItems.find((item) => item.productId._id.toString() === productId);
  
      if (!orderItem) {
        return res.status(404).json({ message: "Product not found in the order." });
      }
  
      if (["cancelled", "returned","delivered"].includes(orderItem.itemStatus)) {
        return res.status(400).json({
          message: `Cannot cancel a product with status '${orderItem.itemStatus}'.`,
        });
      }
  
      orderItem.itemStatus = "cancelled";
      order.reasons.cancelReason = cancelRreason;
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found." });
      }
  
     
      product.stock += orderItem.quantity;
      await product.save();
  
      if (order.paymentMethord !== "COD") {
        
        if (orderItem.itemStatus !== "payment failed") {
          const wallet = await Wallet.findOne({ userId });
          if (!wallet) {
            return res.status(404).json({ message: "Wallet not found." });
          }
  
          let refundAmount = orderItem.quantity * (product.offerPrice ? product.offerPrice : product.price);
  
         
          if(order.minPurchase && refundAmount>=order.minPurchase){
            refundAmount-=order.discountValue
          }else if(order.minPurchase){
            const cancellingItems = order.orderItems.filter(
              (item) =>
                item.itemStatus === "cancelled" &&
                item.productId._id.toString() !== productId
            );
            let discountApplied=false
            for(const item of cancellingItems){
              const itemRefundAmount=item.quantity*(item.productId.offerPrice ? item.productId.offerPrice : item.productId.price)
              console.log("item refund",itemRefundAmount);
              console.log("coupen minPurchase",order.minPurchase)
              if(itemRefundAmount>=order.minPurchase){
                console.log("amound",refundAmount-order.discountValue);
              }
              
              if(itemRefundAmount>=order.minPurchase){
                discountApplied=true;
                break;
              }
            }
            if(!discountApplied){
              console.log("No product satisfy coupen min purchse");
            }
          }
          wallet.balance+=refundAmount;
          wallet.transactions.push({
            type:"credit",
            amount:refundAmount,
            description:`Refund for canceled product (${order.orderNumber})`
          })
  
          await wallet.save();
        } else {
          console.log("Item status is 'failed'. No refund will be processed.");
        }
      }
      await order.save();
  
      res.status(200).json({ message: "Order canceled successfully." });
    } catch (error) {
      console.error("Error canceling order:", error);
      res.status(500).json({ message: "Error occurred while canceling the order.", error: error.message });
    }
  };