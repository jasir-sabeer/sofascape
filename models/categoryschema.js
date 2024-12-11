const mongoose=require('mongoose')
const categorySchema=new mongoose.Schema({

   name:{
    type:String,
    required:true,
    trim:true
   },
   variant:{
    type:String,
    trim:true
   },
   isListed:{
    type:Boolean,
    trim:true
   }, offer: {
      type: mongoose.Schema.Types.ObjectId,
     ref: 'offer',
   },

},{timestamps:true})
module.exports=mongoose.model('category',categorySchema)
