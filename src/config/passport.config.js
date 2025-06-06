import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import UserModel from '../models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();

//our signin functionality
passport.use(
  new LocalStrategy(
    { usernameField: 'email' }, // Specify the field for username (in this case, email)
    async (email, password, done) => {
      try {
        const user = await UserModel.findOne({ email });

        // User not found in database
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        // Compare password hashes
        const isMatch = await user.comparePassword(password);

        // Incorrect password
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect credentials' });
        }
       
        // Authentication successful
        return done(null, user,{ message:"Login successful" });
      } catch (error) {
        // Handle unexpected errors
        return done(error);
      }
    }
  )
);

//google signin functionality
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'https://auth-template-nodejs-skill-test.onrender.com/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        let user = await UserModel.findOne({ googleId: profile.id });

        if (!user) {
          user = new UserModel({
            googleId: profile.id,
            email: profile.emails[0].value,
            signUpMethod: 'google', // Indicate sign-up method
            username: profile.emails[0].value,
          });
          await user.save();
        }
        return cb(null, user);
      } catch (error) {
        return cb(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export default passport;
