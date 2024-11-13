
function adminlogin (req,res,next){
    
    if(req.session.adminlogin){
        next()
    }else{
        res.redirect('/admin/adminLogin')
    }
    
}



module.exports={
    adminlogin,

}