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
   }

},{timestamps:true})
module.exports=mongoose.model('category',categorySchema)
