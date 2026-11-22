// 认证路由：注册 / 邮箱验证 / 重发验证码 / 登录 / 忘记密码 / 重置密码 / 登出
// 说明：该文件取代旧的 routes/user.js（后者内容其实是 User Schema，且属只读文件无法改写）
const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');

const router = express.Router();

// ---------- 邮件发送（nodemailer 懒加载：未安装或未配置 SMTP 时降级到控制台）----------
let nodemailer = null;
try {
    nodemailer = require('nodemailer');
} catch (err) {
    nodemailer = null;
}

const transporter = (nodemailer && process.env.SMTP_HOST)
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 465),
        secure: String(process.env.SMTP_SECURE || 'true') === 'true',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    })
    : null;

async function sendMail(to, subject, html) {
    if (!transporter) {
        console.warn('[mail] 未配置 SMTP 或未安装 nodemailer，邮件内容改为打印到控制台');
        console.log('  收件人:', to);
        console.log('  主题  :', subject);
        console.log('  内容  :', html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
        return false;
    }
    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to: to,
            subject: subject,
            html: html
        });
        return true;
    } catch (err) {
        console.warn('[mail] 发送失败，改为输出到控制台:', err.message);
        console.log('  收件人:', to);
        console.log('  主题  :', subject);
        console.log('  内容  :', html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
        return false;
    }
}

function sixDigitCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

// ---------- 页面 ----------
router.get('/', (req, res) => res.redirect('/login'));
router.get('/login', (req, res) => res.render('login', { message: null }));
router.get('/register', (req, res) => res.render('register', { message: null }));

// ---------- 注册 ----------
router.post('/doRegister', async (req, res) => {
    const body = req.body || {};
    const username = body.username;
    const password = body.password;
    const email = body.email;

    try {
        if (!username || !password || !email) {
            return res.render('register', { message: '请填写用户名、密码和邮箱。' });
        }
        if (await User.findOne({ username: username })) {
            return res.render('register', { message: '该用户名已被注册，请更换。' });
        }
        if (await User.findOne({ email: email })) {
            return res.render('register', { message: '该邮箱已被注册，请直接登录或更换邮箱。' });
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

        await sendMail(email, '[HKMU Second-hand] 注册验证码',
            '<p>你的注册验证码是：<b>' + code + '</b>，10 分钟内有效，请勿泄露给他人。</p>');

        res.redirect('/verify?email=' + encodeURIComponent(email));
    } catch (err) {
        console.error('注册失败:', err.message);
        res.render('register', { message: '注册失败：' + err.message });
    }
});

// ---------- 邮箱验证 ----------
router.get('/verify', (req, res) => {
    res.render('verify', { email: req.query.email, message: null });
});

router.post('/doVerify', async (req, res) => {
    const body = req.body || {};
    const email = body.email;
    const cleanCode = String(body.code || '').trim();
    const user = await User.findOne({ email: email });

    if (!user) return res.status(400).send('用户不存在');

    const expired = user.verificationCodeExpires && user.verificationCodeExpires.getTime() < Date.now();
    if (expired) {
        return res.render('verify', { email: email, message: '验证码已过期，请重新发送。' });
    }
    if (user.verificationCode !== cleanCode) {
        return res.render('verify', { email: email, message: '验证码不正确，请重新输入。' });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();
    res.redirect('/login');
});

// ---------- 重发验证码（verify.ejs 用 fetch + JSON）----------
router.post('/resend-code', async (req, res) => {
    try {
        const email = (req.body || {}).email;
        const user = await User.findOne({ email: email });
        if (!user) return res.json({ success: false, message: '该邮箱未注册' });
        if (user.isVerified) return res.json({ success: false, message: '该邮箱已激活，无需重发' });

        const code = sixDigitCode();
        user.verificationCode = code;
        user.verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        const sent = await sendMail(email, '[HKMU Second-hand] 新的验证码',
            '<p>新的注册验证码是：<b>' + code + '</b>，10 分钟内有效。</p>');

        res.json({
            success: true,
            message: sent ? '验证码已重新发送' : '邮件服务未配置，验证码已输出到服务器控制台'
        });
    } catch (err) {
        console.error('重发验证码失败:', err.message);
        res.json({ success: false, message: '发送失败，请稍后重试' });
    }
});

// ---------- 登录（哈希校验 + 邮箱验证状态）----------
router.post('/doLogin', async (req, res) => {
    const body = req.body || {};
    const username = body.username;
    const password = body.password;

    const user = await User.findOne({ username: username });
    if (!user || !user.verifyPassword(password)) {
        return res.render('login', { message: '用户名或密码错误' });
    }
    if (!user.isVerified) {
        return res.render('login', { message: '邮箱尚未验证，请先完成邮箱验证' });
    }

    req.session.user = user.username;
    req.session.userId = user._id.toString();
    res.redirect('/list');
});

// ---------- 忘记密码 ----------
router.get('/forgot-password', (req, res) => {
    res.render('forgot-password', { message: null, success: null });
});

router.post('/forgot-password', async (req, res) => {
    try {
        const email = (req.body || {}).email;
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.render('forgot-password', { message: '没有找到该邮箱对应的账号。', success: null });
        }

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
        await user.save();

        const base = process.env.APP_BASE_URL || 'http://localhost:3000';
        const link = base + '/reset-password/' + token;
        const sent = await sendMail(email, '[HKMU Second-hand] 重置密码',
            '<p>点击下面的链接重置密码（1 小时内有效）：</p><p><a href="' + link + '">' + link + '</a></p>');

        res.render('forgot-password', {
            message: null,
            success: sent ? '重置密码邮件已发送，请查收。' : '邮件服务未配置，重置链接已输出到服务器控制台。'
        });
    } catch (err) {
        console.error('发送重置邮件失败:', err.message);
        res.render('forgot-password', { message: '发送失败，请稍后重试。', success: null });
    }
});

// ---------- 重置密码 ----------
async function findUserByResetToken(token) {
    return User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() }
    });
}

router.get('/reset-password/:token', async (req, res) => {
    const user = await findUserByResetToken(req.params.token);
    if (!user) return res.status(400).send('重置链接无效或已过期');
    res.render('reset-password', { token: req.params.token, message: null });
});

router.post('/reset-password/:token', async (req, res) => {
    const body = req.body || {};
    if (!body.password || body.password !== body.confirmPassword) {
        return res.render('reset-password', { token: req.params.token, message: '两次输入的密码不一致。' });
    }

    const user = await findUserByResetToken(req.params.token);
    if (!user) return res.status(400).send('重置链接无效或已过期');

    user.password = User.hashPassword(body.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.send('<h1 style="text-align:center;margin-top:50px;color:#28a745;">密码修改成功</h1>' +
        '<p style="text-align:center;"><a href="/login">返回登录</a></p>');
});

// ---------- 登出 ----------
router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

module.exports = router;
