const mongoose=require("mongoose")


const connectDB= async()=>{
    try{
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("DB connected")
    }catch(error){
       console.log("DB connection Error",error.message)
       process.exit(1)
    }
}

module.exports=connectDB