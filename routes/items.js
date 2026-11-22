// 登录后的接口层（不含页面模板）—— 供后续嫁接自定义界面使用
// 说明：views/list.ejs、views/add.ejs、views/edit.ejs 已移除，
//       所以这里不再 render 页面，GET /list 改为返回 JSON 数据。
const express = require('express');
const Item = require('../models/Item');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /list —— 登录后的列表数据接口（原来的 render('list') 已改为 JSON）
// 嫁接新界面时：把 res.json(...) 换回 res.render('list', {...}) 即可，查询逻辑不用动。
router.get('/list', auth, async (req, res) => {
    if (!req.session.userId) {
        return req.session.destroy(() => res.redirect('/login'));
    }

    const currentUser = await User.findById(req.session.userId).lean();
    if (!currentUser) {
        return req.session.destroy(() => res.redirect('/login'));
    }

    const items = await Item.searchItems(req.query);

    res.json({
        user: req.session.user,
        currentUser: {
            _id: currentUser._id,
            username: currentUser.username,
            email: currentUser.email
        },
        count: items.length,
        items: items,
        query: req.query
    });
});

// POST /add —— 发布商品（表单提交，seller 取当前登录用户）
// 保留原契约：成功后 302 回 /list
router.post('/add', auth, async (req, res) => {
    const body = req.body || {};
    await Item.create({
        title: body.title,
        description: body.description,
        price: body.price,
        category: body.category,
        condition: body.condition,
        seller: req.session.userId,
        status: 'Available'
    });
    res.redirect('/list');
});

// POST /delete-item/:id —— 仅发布者本人可删，成功后 302 回 /list
router.post('/delete-item/:id', auth, async (req, res) => {
    const item = await Item.findById(req.params.id);
    if (!item) return res.redirect('/list');

    const sellerId = item.seller && item.seller._id
        ? item.seller._id.toString()
        : String(item.seller);

    if (sellerId !== req.session.userId) {
        return res.redirect('/list');
    }

    await Item.findByIdAndDelete(req.params.id);
    res.redirect('/list');
});

module.exports = router;
