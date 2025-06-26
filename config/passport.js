require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userschema');

const callbackURL = process.env.GOOGLE_CALLBACK_URL;

console.log('Google Auth Config:', {
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  NODE_ENV: process.env.NODE_ENV,
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let foundUser = await User.findOne({ googleid: profile.id });
        if (foundUser) return done(null, foundUser);

        const newUser = new User({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleid: profile.id,
          referralCode: Math.random().toString(36).substr(2, 8).toUpperCase(),
        });

        await newUser.save();
        return done(null, newUser);
      } catch (err) {
        console.error('Google OAuth Error:', err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
