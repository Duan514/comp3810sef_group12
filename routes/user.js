const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.redirect("/login");
});

// Render login page
router.get("/login", (req, res) => {
  res.render("login");
});

// Render register page
router.get("/register", (req, res) => {
  res.render("register");
});

// Handle login submission
router.post("/doLogin", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "123456") {
    req.session.user = username;
    return res.redirect("/list");
  }
  res.redirect("/login");
});

// Handle register submission
router.post("/doRegister", (req, res) => {
  res.redirect("/login");
});

// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;