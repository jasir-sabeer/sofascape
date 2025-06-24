require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userschema');
const isProd = process.env.NODE_ENV === 'production';

console.log('Environment Variables:', {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  NODE_ENV: process.env.NODE_ENV,
  callbackURL: isProd ? 'https://sofascape.webhop.me/auth/google/callback' :'http://localhost:3000/auth/google/callback'
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: isProd
        ? 'https://sofascape.webhop.me/auth/google/callback'
        : 'http://localhost:3000/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let foundUser = await User.findOne({ googleid: profile.id });
        if (foundUser) {
          console.log('Existing user found:', foundUser.email);
          return done(null, foundUser);
        } else {
          let newUser = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleid: profile.id,
            referralCode: Math.random().toString(36).substr(2, 8).toUpperCase()
          });
          await newUser.save();
          console.log('New user created:', newUser.email);
          return done(null, newUser);
        }
      } catch (error) {
        console.error('Google OAuth Error:', error.message, error.stack);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  console.log('Serializing user:', user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    console.log('Deserializing user:', user ? user.email : 'Not found');
    done(null, user);
  } catch (err) {
    console.error('Deserialize Error:', err.message, err.stack);
    done(err, null);
  }
});

module.exports = passport;