// Auth routes: Register / Email verification / Resend code / Login / Forgot password / Reset password / Logout
const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');

const router = express.Router();

// Mail sender (lazy load nodemailer)
let nodemailer = null;
try {
    nodemailer = require('nodemailer');
} catch (err) {
    nodemailer = null;
}

// Read global constants (defined in server.js) or environment variables
const smtpHost = typeof SMTP_HOST !== 'undefined' ? SMTP_HOST : process.env.SMTP_HOST;
const smtpPort = typeof SMTP_PORT !== 'undefined' ? SMTP_PORT : process.env.SMTP_PORT;
const smtpSecure = typeof SMTP_SECURE !== 'undefined' ? SMTP_SECURE : process.env.SMTP_SECURE;
const smtpUser = typeof SMTP_USER !== 'undefined' ? SMTP_USER : process.env.SMTP_USER;
const smtpPass = typeof SMTP_PASS !== 'undefined' ? SMTP_PASS : process.env.SMTP_PASS;
const mailFrom = typeof MAIL_FROM !== 'undefined' ? MAIL_FROM : process.env.MAIL_FROM;

const transporter = (nodemailer && smtpHost)
? nodemailer.createTransport({
host: smtpHost,
port: Number(smtpPort || 465),
secure: String(smtpSecure || 'true') === 'true',
auth: { user: smtpUser, pass: smtpPass }
})
: null;

async function sendMail(to, subject, html) {
if (!transporter) {
        console.warn('[mail] SMTP not configured or nodemailer missing, mail content printed to console');
        console.log('  To      :', to);
        console.log('  Subject :', subject);
        console.log('  Content :', html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
return false;
    }
try {
await transporter.sendMail({
from: mailFrom || smtpUser,
to: to,
subject: subject,
html: html
        });
        console.log('[mail] ✅ Email sent successfully');
        console.log('  To      :', to);
        console.log('  Subject :', subject);
        console.log('  Content :', html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
return true;
    } catch (err) {
        console.warn('[mail] Failed to send, fallback to console:', err.message);
        console.log('  To      :', to);
        console.log('  Subject :', subject);
        console.log('  Content :', html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
return false;
    }
}

function sixDigitCode() {
return String(Math.floor(100000 + Math.random() * 900000));
}

// Page routes 
router.get('/', (req, res) => res.redirect('/login'));
router.get('/login', (req, res) => res.render('login', { message: null }));
router.get('/register', (req, res) => res.render('register', { message: null }));

// Register
router.post('/doRegister', async (req, res) => {
const body = req.body || {};
const username = body.username;
const password = body.password;
const email = body.email;

try {
if (!username || !password || !email) {
return res.render('register', { message: 'Please fill in username, password and email.' });
        }
// ONLY check duplicate username (allowing unlimited same email registration)
if (await User.findOne({ username: username })) {
return res.render('register', { message: 'This username is taken, please choose another.' });
        }

const code = sixDigitCode();
await User.create({
username: username,
email: email,
password: User.hashPassword(password),
verificationCode: code,
verificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
isVerified: false
        });

await sendMail(email, '[HKMU Second-hand] Registration Verification Code',
'<p>Your verification code is: <b>' + code + '</b>. Valid for 10 minutes. Do not share it.</p>');

        res.redirect('/verify?email=' + encodeURIComponent(email));
    } catch (err) {
        console.error('Registration failed:', err.message);
        res.render('register', { message: 'Registration failed: ' + err.message });
    }
});

// Email verification page
router.get('/verify', (req, res) => {
    res.render('verify', { email: req.query.email, message: null });
});

router.post('/doVerify', async (req, res) => {
const body = req.body || {};
const email = body.email;
const cleanCode = String(body.code || '').trim();
// ADDED .sort({ _id: -1 }) TO FIND THE LATEST REGISTERED ACCOUNT
const user = await User.findOne({ email: email }).sort({ _id: -1 });

if (!user) return res.status(400).send('User not found');

const expired = user.verificationCodeExpires && user.verificationCodeExpires.getTime() < Date.now();
if (expired) {
return res.render('verify', { email: email, message: 'Verification code expired, please resend.' });
    }
if (user.verificationCode !== cleanCode) {
return res.render('verify', { email: email, message: 'Incorrect code, please try again.' });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
await user.save();
    res.redirect('/login');
});

// Resend verification code 
router.post('/resend-code', async (req, res) => {
try {
const email = (req.body || {}).email;
// ADDED .sort({ _id: -1 }) TO FIND THE LATEST REGISTERED ACCOUNT
const user = await User.findOne({ email: email }).sort({ _id: -1 });
if (!user) return res.json({ success: false, message: 'No account found with this email' });
if (user.isVerified) return res.json({ success: false, message: 'This email is already verified' });

const code = sixDigitCode();
        user.verificationCode = code;
        user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
await user.save();

const sent = await sendMail(email, '[HKMU Second-hand] New Verification Code',
'<p>Your new verification code is: <b>' + code + '</b>. Valid for 10 minutes.</p>');

        res.json({
success: true,
message: sent ? 'Verification code resent' : 'Mail service not configured, code printed to server console'
        });
    } catch (err) {
        console.error('Failed to resend code:', err.message);
        res.json({ success: false, message: 'Send failed, please try again later' });
    }
});

// Login 
router.post('/doLogin', async (req, res) => {
    try {
        const body = req.body || {};
        const username = body.username;
        const password = body.password;

        console.log("Received login request, user:", username);

        const user = await User.findOne({ username: username });
        
        if (!user || !user.verifyPassword(password)) {
            console.log("Invalid password or user not found");
            return res.render('login', { message: 'Invalid username or password' });
        }
        if (!user.isVerified) {
            console.log("Email not verified");
            return res.render('login', { message: 'Email not verified, please complete verification first' });
        }

        console.log("Password verified, writing to Session...");

        // Safely construct session object to ensure no undefined values
        req.session.user = {
            username: user.username,
            _id: user._id.toString(),
            role: user.role || 'user' // Prevent session save failure due to undefined role
        };

        req.session.save((err) => {
            if (err) {
                console.error('Session save failed (callback error):', err);
                return res.render('login', { message: 'Session error, please try again.' });
            }
            console.log("Session saved successfully! Redirecting to /list");
            res.redirect('/list');
        });

    } catch (err) {
        console.error("Fatal error in login route:", err);
        res.render('login', { message: 'Server error: ' + err.message });
    }
});

// Forgot password
router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { message: null, success: null });
});

router.post('/forgot-password', async (req, res) => {
try {
const email = (req.body || {}).email;
// ADDED .sort({ _id: -1 }) TO RESET PASSWORD FOR THE LATEST ACCOUNT
const user = await User.findOne({ email: email }).sort({ _id: -1 });
if (!user) {
return res.render('forgot-password', { message: 'No account found with this email.', success: null });
        }

const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
await user.save();

const base = process.env.APP_BASE_URL || 'http://localhost:3000';
const link = base + '/reset-password/' + token;
const sent = await sendMail(email, '[HKMU Second-hand] Password Reset',
'<p>Click the link below to reset your password (valid for 1 hour):</p><p><a href="' + link + '">' + link + '</a></p>');

        res.render('forgot-password', {
message: null,
success: sent ? 'Password reset email sent.' : 'Mail service not configured, reset link printed to server console.'
        });
    } catch (err) {
        console.error('Failed to send reset email:', err.message);
        res.render('forgot-password', { message: 'Send failed, please try again later.', success: null });
    }
});

// Reset password helper
async function findUserByResetToken(token) {
return User.findOne({
resetPasswordToken: token,
resetPasswordExpires: { $gt: new Date() }
    });
}

router.get('/reset-password/:token', async (req, res) => {
const user = await findUserByResetToken(req.params.token);
if (!user) return res.status(400).send('Invalid or expired reset link');
res.render('reset-password', { token: req.params.token, message: null });
});

router.post('/reset-password/:token', async (req, res) => {
const body = req.body || {};
if (!body.password || body.password !== body.confirmPassword) {
return res.render('reset-password', { token: req.params.token, message: 'Passwords do not match.' });
    }

const user = await findUserByResetToken(req.params.token);
if (!user) return res.status(400).send('Invalid or expired reset link');

user.password = User.hashPassword(body.password);
user.resetPasswordToken = undefined;
user.resetPasswordExpires = undefined;
await user.save();

res.send('<h1 style="text-align:center;margin-top:50px;color:#28a745;">Password updated successfully</h1>' +
'<p style="text-align:center;"><a href="/login">Back to login</a></p>');
});

// Logout 
router.get('/logout', (req, res) => {
req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
