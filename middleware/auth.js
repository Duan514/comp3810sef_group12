// This middleware function checks if the user is authenticated by verifying if the session contains a user object. 
// If the user is authenticated, it calls the next middleware function in the stack. If not, it redirects the user to the login page.

module.exports = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};