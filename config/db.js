const mongoose=require("mongoose")


const connectDB= async()=>{
    try{
        await mongoose.connect('mongodb+srv://SOFASCAPE:jasir&jasi@cluster0.9eegw.mongodb.net/sofascape?retryWrites=true&w=majority&appName=Cluster0')
        console.log("DB connected")
    }catch(error){
       console.log("DB connection Error",error.message)
       process.exit(1)
    }
}

module.exports=connectDB