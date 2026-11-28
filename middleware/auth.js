// This middleware function checks if the user is authenticated by verifying if the session contains a user object. 

module.exports = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
};
