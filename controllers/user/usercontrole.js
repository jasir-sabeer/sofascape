const { name } = require("ejs");
const User = require("../../models/userschema");
const Product = require('../../models/prductschema')
const Category = require('../../models/categoryschema')
const env = require('dotenv').config();
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const Review = require('../../models/reviewSchema');
const session = require('express-session')

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

        if (req.session.passport && req.session.passport.user) {
            req.session.user = req.session.passport.user;
        }

        return res.render("home", {
            user: req.session.user,
        });
    } catch (error) {
        console.log("Home page not found.", error);
        res.status(500).send('Server error');
    }
};

const loadHomepage = (req, res) => {
    const user = req.session.passport ? req.session.passport.user : null;
    res.render('home', { user });
};



const loadproductpage = async (req, res) => {
    try {
        const { category, sort, minPrice, maxPrice } = req.query;
        let filter = { isListed: true };

        if (category) {
            filter.category = category;
        }
        if (minPrice) {
            filter.regularprice = { ...filter.regularprice, $gte: Number(minPrice) };
        }
        if (maxPrice) {
            filter.regularprice = { ...filter.regularprice, $lte: Number(maxPrice) };
        }

        let sortOption = {};
        if (sort === "priceLowHigh") {
            sortOption.regularprice = 1;
        } else if (sort === "priceHighLow") {
            sortOption.regularprice = -1;
        } else if (sort === "newArrivals") {
            sortOption._id = -1;
        } else if (sort === "nameAsc") {
            sortOption.productname = 1;
        } else if (sort === "nameDesc") {
            sortOption.productname = -1;
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const skip = (page - 1) * limit;

        const totalProducts = await Product.countDocuments(filter);
        const products = await Product.find(filter)
            .populate('offer')
            .sort(sortOption)
            .skip(skip)
            .limit(limit);
        const categories = await Category.find({ isListed: true });
        const offerPrices = products.map(product => product.offer?.discountValue);
        console.log('Offer prices:', offerPrices);



        const totalPages = Math.ceil(totalProducts / limit);
        const previousPage = page > 1 ? page - 1 : null;
        const nextPage = page < totalPages ? page + 1 : null;
        console.log(products);

        res.render('shop', {
            categories,
            products,
            currentPage: page,
            totalPages,
            previousPage,
            nextPage,
        });

    } catch (error) {
        console.error("Product page load error:", error);
        res.status(500).send('Server error');
    }
};





const loadloginpage = async (req, res) => {
    try {
        res.render('login');
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

            req.session.user = newUser._id

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
        res.redirect("/pagenotfound");
    }
};

// Resend OTP 
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

// Login 
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            req.session.message = "Email and password are required";
            return res.render('login', { message: "Email and password are required" });
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
    const productId = req.params.id
    const id = req.session.user
    try {
        const product = await Product.findById(productId).populate('category')
        const productCategory = product.category
        const users = await User.findOne({ _id: id, isblocked: false });
        const relatedProducts = await Product.find({ category: productCategory })
        const productReviews = await Review.find({ productId }).populate('productId')
        const totalReviews = await Review.countDocuments({ productId })
        const Ratings = await Review.aggregate([
            { $match: { productId: product._id } },
            {
                $group: {
                    _id: "$productId",
                    averageRating: { $avg: "$rating" }
                }
            }
        ]);
        console.log(Ratings);
        let avg = 0
        if (Ratings.length > 0) {
            avg = Ratings[0].averageRating.toFixed(2)
        }



        res.render("single-product", { product, relatedProducts, productReviews, users, avg, totalReviews })
    } catch (error) {
        console.error("Product page load error:", error);
        res.status(500).send('Server error');
    }
};

const productReview = async (req, res) => {
    const { name, email, number, comment, rating } = req.body;
    console.log(req.body);
    const userId = req.session.user;


    if (!name || !comment) {
        return res.status(400).json({ message: 'All fields are required' });
    }


    const phoneRegex = /^[0-9]{10,15}$/;
    if (!phoneRegex.test(number)) {
        return res.status(400).json({ message: 'Invalid phone number' });
    }

    try {

        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        const newReview = new Review({
            userId: userId,
            name: name,
            email: email,
            number: number,
            comment: comment,
            rating: rating,
            productId: product._id
        });


        await newReview.save();

        res.status(201).json(product);
    } catch (error) {
        console.log(error);

        res.status(500).json({ message: 'Error adding review', error });
    }
};



const loadForgetPass = async (req, res) => {
    try {
        res.render('forgetPassword')
    } catch (error) {
        console.error("Signup error:", error);
        res.redirect("/pagenotfound");
    }

}


const forgetPassValid = async (req, res) => {
    try {
        const { email } = req.body;


        const findUser = await User.findOne({ email: email })

        if (findUser) {
            const otp = generateOtp();
            const emailSent = await sendVerification(email, otp)
            if (emailSent) {
                req.session.userOtp = otp;
                req.session.email = email;
                res.render('forgetPassOtp')
                console.log('otp', otp);

            } else {
                res.json({ success: false, message: 'failed to sent OTP  .please try again' })
            }
        } else {
            res.render('forgetPassword', {
                message: "user with this email does not exist"
            })
        }


    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error adding review', error });
    }
}


const otpChecking = async (req, res) => {
    try {
        const enteredOTP = req.body.otp;
        if (enteredOTP === req.session.userOtp) {
            res.json({ success: true, redirectUrl: "/resetPassword" })
        } else {
            res.json({ success: false, message: "Otp not Matching" })
        }
    } catch (error) {
        res.status(500).json({ success: false, message: " an errror occured plese try again" })
    }
}




const resendOTPF = async (req, res) => {
    try {
        const email = req.session.email;



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

const loadResetPassword = async (req, res) => {
    try {
        res.render('resetPassword')
    } catch (error) {
        console.error("Signup error:", error);
        res.redirect("/pagenotfound");
    }
}


const setNewPassword = async (req, res) => {
    const email = req.session.email;

    if (!email) {
        return res.render('resetPassword', { message: 'Session expired. Please log in again.' });
    }

    try {
        const { password, confirmPassword } = req.body || {};


        if (!password || !confirmPassword) {
            return res.render('resetPassword', { message: 'All fields are required.' });
        }


        const user = await User.findOne({ email: email });
        if (!user) {
            return res.render('resetPassword', { message: 'User not found.' });
        }


        if (password !== confirmPassword) {
            return res.render('resetPassword', { message: 'Passwords do not match.' });
        }


        const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
        if (!password.match(passwordPattern)) {
            return res.render('resetPassword', { message: 'Password must be at least 8 characters long and include letters and numbers.' });
        }


        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
            await user.save();
        } catch (hashError) {
            console.error('Error hashing or saving password:', hashError);
            return res.render('resetPassword', { message: 'Could not update password. Please try again.' });
        }


        res.redirect('/homepage');
    } catch (error) {
        console.error('Error changing password:', error);
        return res.render('resetPassword', { message: 'An error occurred. Please try again later.' });
    }
};


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
    productReview,
    loadHomepage,
    loadForgetPass,
    forgetPassValid,
    otpChecking,
    loadResetPassword,
    resendOTPF,
    setNewPassword

};
