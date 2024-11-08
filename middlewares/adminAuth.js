
function adminlogin (req,res,next){
    console.log("admin indoo", req.session.adminlogin)
    if(req.session.adminlogin){
        next()
    }else{
        res.redirect('/admin/adminLogin')
    }
    
}



module.exports={
    adminlogin,

}