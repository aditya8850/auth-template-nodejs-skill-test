// Middleware function to check authentication status
export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {// This method is provided by Passport.js and returns true if there is an authenticated user session.
    
    return next();// If user is authenticated, proceed to the next middleware
  } else {
    // If user is not authenticated, redirect to sign-in page
    req.flash('error', 'User Session expired');
    res.redirect('/signin');
  }
};
