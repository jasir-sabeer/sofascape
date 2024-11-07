const user=require('../models/userschema')


const userAuth=(req,res,next)=>{
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
const adminAuth=(req,res,next)=>{
  user.findOne({isadmin:true})
  .then(data=>{
    if(data){
        next()
    }else{
        res.redirect("/admin/adminLogin")
    }
  })
  .catch(error=>{
    console.log("error in admin auth middleware")
    res.status(500).send('internal server error')
  })



}


module.exports={
    userAuth,
    adminAuth
}