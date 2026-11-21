const express = require("express");
const session = require("express-session");
const userRouter = require("./routes/user");
const auth = require("./middleware/auth");

const app = express();
const port = 3000;

// Set ejs as the template engine
app.set("view engine", "ejs");
// Parse form data
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: "my-secret-key",
  resave: false,
  saveUninitialized: false
}));

// Use user routing
app.use("/", userRouter);

// Protected routes, require login authentication
app.get("/list", auth, (req, res) => {
  res.render("list", { user: req.session.user });
});
app.get("/add", auth, (req, res) => {
  res.render("add", { user: req.session.user });
});
app.get("/edit", auth, (req, res) => {
  res.render("edit", { user: req.session.user });
});

app.listen(port, () => {
  console.log(`Server started: http://localhost:${port}`);
});
