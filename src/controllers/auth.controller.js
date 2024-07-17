import UserModel from '../models/user.model.js';
import passport from '../config/passport.config.js';
import crypto from "crypto"
import { sendPasswordResetEmail } from '../config/nodemailer.config.js';
import bcrypt from "bcrypt"
// controller to render the index page
export const getIndexPage = (req, res) => {
  const messageSuccess = req.flash('success');
  req.flash('success', null);
  console.log(messageSuccess)
  res.render('index', { messageSuccess });
};

// controller to render the signup page
export const getSignUpPage = (req, res) => {
  const messageError = req.flash('error');
  req.flash('error', null);
  res.render('signup', { messageError });
};

//controller to add user in database and send response
export const registerUser = async (req, res) => {
  const { email, password, cnfPassword } = req.body;
  try {
    if (password !== cnfPassword) {
      req.flash('error', 'Passwords do not match.');
      return res.redirect('/signup');
    }
    const user = await UserModel.create({
      email,
      password,
      username: email,
      googleId: null,
    });
    req.flash('success', 'User signed up successfully!');
    res.redirect('/');
  } catch (error) {
    const messageArr = error.message.split(':');
    const message = messageArr[messageArr.length - 1].trim();
    req.flash('error', message);
    res.redirect('/signup');
  }
};

//controller to render the signin page
export const getSignInPage = (req, res) => {
  const messageError = req.flash('error');
  const messageSuccess = req.flash('success');
  res.render('signin', { messageError, messageSuccess });
};


// Controller middleware to handle sign-in form submissions
export const loginUser = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      // Handle failed login
      req.flash('error', info.message); // info.message contains the failure message
      return res.redirect('/signin');
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      // Set success flash message upon successful login
      req.flash('success', info.message);
      return res.redirect('/home');
    });
  })(req, res, next);
};

// Controller middleware to render the home page
export const getHomePage = (req, res) => {
  // Pass the flash message to the view
  const flashMessage = req.flash('success');
  req.flash('success', null);
  res.render('home', { messages: flashMessage });
};

// Controller middleware to handle sign-out
export const signOutUser = (req, res) => {
  // Passport's logout function is used to terminate the login session
  req.logout((err) => {
    if (err) {
      console.error('Error signing out:', err);
      res.status(500).send('Error signing out');
    } else {
      // Redirect the user to the sign-in page after successful sign-out
      const messageSuccess = req.flash('success', "user logged out")
      res.render('index', { messageSuccess });
    }
  });
};

// Controller middleware to render the reset password page
export const getResetPasswordPage = (req, res) => {
  const messageError = req.flash('error');
  req.flash('error', null);
  res.render('resetpassword', { messageError });
};

// Controller middleware to handle form submission for resetting the password
export const resetPassword = async (req, res) => {
  const { email, password } = req.body;
  const userId = req.user.id; // user ID is stored in the session

  try {
    // Get the user from the database
    const user = await UserModel.findById(userId);
    if (!user) {
      // Handle case where user is not found
      req.flash('error', 'User not found');
      return res.redirect('/resetpassword');
    }

    // Verify that the provided email matches the authenticated user's email
    if (user.email !== email) {
      // Handle case where email does not match
      req.flash('error', 'Email does not match authenticated user');
      return res.redirect('/resetpassword');
    }

    // Update the user's password in the database with the hashed password
    user.password = password;
    await user.save();

    // Redirect to the homepage with a success message
    req.flash('success', 'Password reset successfully');
    res.redirect('/home');
  } catch (error) {
    const messageArr = error.message.split(':');
    const message = messageArr[messageArr.length - 1].trim();
    req.flash('error', message);
    return res.redirect('/resetpassword');
  }
};

// Controller middleware to handle Google authentication
export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
});

// Controller middleware to handle Google authentication callback
export const googleAuthCallback = (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      // Handle authentication failure by redirecting to the signup page
      req.flash('error', 'Google Sign In Failed');
      return res.redirect('/signup');
    }
    // Log in the user
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      // Redirect to home page with success message
      req.flash('success', 'You have successfully logged in with Google.');
      res.redirect('/home');
    });
  })(req, res, next);
};

//controller to get forgot password view
export const forgotPasswordView = (req, res, next) => {
  const message = req.flash('success', null)|| req.flash('error');;
  res.render('forgot', { message });

}
//controller function to password reset via forgot password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      req.flash('error', `${email} is not registered with us.`);
      return res.redirect('/forgot-password');
    }

    // Generate a random token
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour
    await user.save();

    // Send password reset email
    await sendPasswordResetEmail(email, token);

    req.flash('success', 'Password reset email sent. Please check your email.');
    return res.redirect('/');
  } catch (err) {
    console.error('Error in forgotPassword:', err);
    req.flash('error', 'Error sending password reset email. Please try again later.');
    return res.redirect('/forgot-password');
  }
};

// route to reset password via email link
export const resetViaEmailView = (req, res, next) => {
  const { token } = req.params; // Get token from URL params
  const message = req.flash('success') || req.flash('error');
  res.render('resetViaEmail', { token, message});
};

export const resetViaEmailPost = async (req, res, next) => {
  try {
    const { token } = req.params
    const newPassword = req.body.password
    const user = await UserModel.findOne({
      resetPasswordToken: token // Ensure the token has not expired
    });
    console.log(user)
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot-password');
    }

    

    // Update the user's password and clear the reset token and expiration
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    req.flash('success', 'Password has been reset successfully.');
    res.redirect('/signin');
  } catch (error) {
    req.flash('error', 'err updating password try again.');
    res.redirect('/')
  }
}