let express=require('express')
let app=express()
const path=require('path')
const session =require('express-session')
const passport=require("./config/passport")
require("dotenv").config();
const db=require("./config/db");
const userRouter=require('./routes/user/userRouter')
const nocache = require("nocache");
const adminRouter=require('./routes/admin/adminRouter')
const profileRouter=require('./routes/user/profileRouter')
const cartRouter=require('./routes/user/cartRouter')
const fash=require('connect-flash')
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


const loadHomepage = (req, res) => {
    const user = req.session.passport ? req.session.passport.user : null;
    res.render('home', { user }); 
};


app.get('/', loadHomepage);
app.use('/',cartRouter)
app.use('/',userRouter)
app.use('/',profileRouter)
app.use('/admin',adminRouter)



app.listen(3000,()=>{
    console.log("server running")
});

module.exports = app;