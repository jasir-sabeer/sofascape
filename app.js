let express=require('express')
let app=express()
const path=require('path')
const session =require('express-session')
const passport=require("./config/passport")
require("dotenv").config();
const db=require("./config/db");
const nocache = require("nocache");
//schma
const Cart=require('./models/cartSchema')
//admin routers
const adminRouter=require('./routes/admin/adminRouter')
const orderRouter=require('./routes/admin/orderRouter')
const stockRouter=require('./routes/admin/stockRouter')
const couponRouter=require('./routes/admin/couponRouter')
const offerRouter=require('./routes/admin/offerRouter')
const salesReportRouter=require('./routes/admin/salesReportRouter')

//user routers
const userRouter=require('./routes/user/userRouter')
const profileRouter=require('./routes/user/profileRouter')
const cartRouter=require('./routes/user/cartRouter')
const salesRouter=require('./routes/user/salesRouter')


const fash=require('connect-flash')
const methodOverride = require('method-override');
db()


app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(nocache())
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
    
}))



app.use(fash())
app.use(passport.initialize())
app.use(passport.session())
app.use('/uploads', express.static('uploads'));

app.set("view engine","ejs");
app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')]);
app.use(express.static(path.join(__dirname, 'public')));




app.use('/',salesRouter)
app.use('/',cartRouter)
app.use('/',userRouter)
app.use('/',profileRouter)
app.use('/admin',adminRouter)
app.use('/admin',orderRouter)
app.use('/admin',stockRouter)
app.use('/admin',couponRouter)
app.use('/admin',offerRouter)
app.use('/admin',salesReportRouter)


app.use(methodOverride('_method'));

app.use((err, req, res, next) => {
    console.error("Error: ", err.message); 
    console.error(err.stack); 
    res.status(err.status || 500).render('page-404')
});

app.use(async (req, res, next) => {
    res.locals.cartCount = 0; 
    if (req.session.user && req.session.user._id) {
        const userId = req.session.user._id;
        const cart = await Cart.findOne({ userId });
        res.locals.cartCount = cart ? cart.items.length : 0;
    }
    next();
});


app.listen(3000,()=>{
    console.log("server running")
});

module.exports = app;