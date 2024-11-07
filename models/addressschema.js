const mongoose=require('mongoose')
const {schema}=mongoose;

const addressschema = new schema({
    userid:{
        type:schema.Types.ObjectId,
        ref:"user",
        required:true
    },
    address:[{
        addresstype:{
            type:String,
            required:true
        },
        name:{
            type:String,
            required:true
        },
        city:{
            type:String,
            required:true,

        },
        landmark:{
            type:String,
            required:true,

        },
        state:{
            type:String,
            required:true
        },
        pincode:{
            type:Number,
            required:true
        },
        phone:{
            type:String,
            required:true
        },
        altphone:{
            type:String,
            required:true
        }
    }]
})


const address=mongoose.model("address",addressschema)
module.exports=address;