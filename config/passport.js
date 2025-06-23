require("dotenv").config({ path: require('path').resolve(__dirname, '../.env') });
const passport = require('passport');
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userschema'); 
const isProd = process.env.NODE_ENV === 'production';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,  
      callbackURL: isProd
      ? 'https://sofasacpe.3utilities.com/auth/google/callback'
      : 'http://localhost:3000/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let foundUser = await User.findOne({ googleid: profile.id });
        if (foundUser) {
          return done(null, foundUser);
        } else {
          let newUser = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleid: profile.id,
            referralCode:Math.random().toString(36).substr(2, 8).toUpperCase()

          });
          
          await newUser.save();
          return done(null, newUser);
        }
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => done(null, user))
    .catch((err) => done(err, null));
});

module.exports = passport;

