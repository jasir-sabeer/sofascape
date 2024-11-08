const { name } = require("ejs");
const User = require("../../models/userschema");
const  Product=require('../../models/prductschema')
const env = require('dotenv').config();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Page not found handler
const pagenotfound = async (req, res) => {
    try {
        res.render("page-404");
    } catch (error) {
        res.redirect('/pagenotfound');
    }
};

// Load home page
const loadhomepage = async (req, res) => {
    try {
        const user = req.session.user;
        if (user) {
            const userData = await User.findOne({ _id: user._id }); 
            res.render("home", { user: userData }); 
        } else {
            return res.render("home"); 
        }
    } catch (error) {
        console.log("Home page not found.", error); 
        res.status(500).send('Server error');
    }
};


// Load product page
const loadproductpage = async (req, res) => {
    try {
        const products = await Product.find({ isListed: true });
        res.render("shop", { products }); 
    } catch (error) {
        console.error("Product page load error:", error);
        res.status(500).send('Server error');
    }
};



const loadloginpage = async (req, res) => {
    try {
        console.log("Session User:", req.session.user); 
        if (!req.session.user) {
            return res.render('login'); 
        } else {
            res.redirect('/'); 
        }
    } catch (error) {
        console.error("Error loading login page:", error);
        res.redirect("/pagenotfound");
    }
};



const loadsignuppage = async (req, res) => {
    try {
        return res.render("signup");
    } catch (error) {
        console.log("Signup page not found.");
        res.status(500).send('Server error');
    }
};


const securePassword = async (password) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        console.error("Password hashing error:", error);
        throw error;
    }
};

// Load OTP page
const loadotppage = async (req, res) => {
    try {
        const { otp } = req.body;
        if (otp === req.session.userOtp) {
            
            const hashedPassword = await securePassword(req.session.userData.password);
            const newUser = new User({
                name: req.session.userData.name,
                phone: req.session.userData.phone,
                email: req.session.userData.email,
                password: hashedPassword,
            });

            await newUser.save();

            res.json({ success: true, redirectUrl: "/homepage" });
        } else {
            res.json({ success: false, message: "Invalid OTP, please try again" });
        }
    } catch (error) {
        console.error("OTP verification error:", error);
        res.status(500).json({ success: false, message: "An error occurred" });
    }
};

// OTP generation
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}


async function sendVerification(email, otp) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            },
        });

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Verify Your Account",
            text: `Thank you for signing up with Sofascape. Your OTP is ${otp}`,
            html: `<h1>Welcome!</h1> <p>Thank you for signing up with Sofascape.</p><b>Your OTP: ${otp}</b>`,
        });

        return info.accepted.length > 0;
    } catch (error) {
        console.error("Error sending email:", error);
        return false;
    }
}

// Signup handler
const signup = async (req, res) => {
    try {
        const { name, phone, email, password, confirmpassword } = req.body;

        if (password !== confirmpassword) {
            return res.render("signup", { message: "Passwords do not match" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render("signup", { message: "User with this email already exists" });
        }

        const otp = generateOtp();
        const emailSent = await sendVerification(email, otp);

        if (!emailSent) {
            return res.render("signup", { message: "Failed to send email, please try again" });
        }

        req.session.userOtp = otp;
        req.session.userData = { name, phone, email, password };
        res.render("otp-verification");
        console.log("OTP sent:", otp);

    } catch (error) {
        console.error("Signup error:", error);
        res.redirect("pagenotfound");
    }
};

// Resend OTP handler
const resendOTP = async (req, res) => {
    try {
        const { email } = req.session.userData;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in session" });
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerification(email, otp);
        if (emailSent) {
            console.log("Resent OTP:", otp);
            res.status(200).json({ success: true, message: "OTP Resent Successfully" });
        } else {
            res.status(500).json({ success: false, message: "Failed to resend OTP, please try again" });
        }
    } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(500).json({ success: false, message: "Internal server error. Please try again" });
    }
};

// Login handler
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            req.session.message = "Email and password are required";
            return res.redirect('/userlogin');
        }
        const findUser = await User.findOne({ isadmin: 0, email: email });
        if (!findUser) {
            return res.render('login', { message: "User not found" });
        }

        if (findUser.isblocked) {
            return res.render('login', { message: "User is blocked by admin" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render('login', { message: "Incorrect password" });
        }

        req.session.user = findUser._id;
        res.redirect('/homepage');

    } catch (error) {
        console.error("Login error:", error);
        res.render('login', { message: "Login failed. Please try again later" });
    }
};

const loadsingleproductpage = async (req, res) => {
    const productId=req.params.id
    try {
        const product=await Product.findById(productId).populate('category')
        res.render("single-product",{product})
    } catch (error) {
        console.error("Product page load error:", error);
        res.status(500).send('Server error');
    }
};
const loadprofile = async (req,res) => {
   
    if (!req.session.user) {
        return res.render('login'); 
    }
    try {
        return res.render("profile");
    } catch (error) {
        console.log("profile page not found.");
        res.status(500).send('Server error');
    }
}
const userlogout = async (req, res) => {
    req.session.user = false; 


    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out.');
        }
        res.render('login'); 
    })
}


module.exports = {
    loadhomepage,
    pagenotfound,
    loadproductpage,
    loadloginpage,
    loadsignuppage,
    signup,
    loadotppage,
    resendOTP,
    login,
    loadsingleproductpage,
    loadprofile,
    userlogout
};
