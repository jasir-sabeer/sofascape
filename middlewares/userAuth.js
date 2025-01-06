const User =require('../models/userschema')

async function userLogin(req, res, next) {
    try {
        if (req.session.user) {
            const user = await User.findById(req.session.user);
            
            if (!user || user.isblocked === true) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error('Session destruction error:', err);
                    }
                    return res.render("login", { message: "User is blocked by admin" });
                });
            } else {
                next(); 
            }
        } else {
            res.render('login');
        }
    } catch (error) {
        console.error('Error during user login check:', error);
        res.status(500).send('Internal Server Error');
    }
}





module.exports={
    userLogin
    
}