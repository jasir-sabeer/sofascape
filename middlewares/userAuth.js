

function userLogin (req,res,next){
    
    if(req.session.user ){
        next()
    }else{
        res.render('login')
    }
    
}




module.exports={
    userLogin
    
}