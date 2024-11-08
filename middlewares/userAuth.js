const user=require('../models/userschema')


const checkSession=(req,res,next)=>{
    if(req.session.user){
        user.findById(req.session.user)
        .then(data=>{
              if(data&&!data.isblocked){
                next();
              }else{
                res.redirect('/login')
              }
        })
        .catch(error=>{
            console.log("error in user auth middleware")
            res.status(500).send("internal server error")
        })
    }else{
        res.redirect('/login')
    }
}

module.exports={
    checkSession,
    
}