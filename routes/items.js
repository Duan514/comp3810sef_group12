const express = require('express');
const { isObjectIdOrHexString } = require('mongoose');
const Item = require('../models/Item');
const User = require('../models/User');

const router = express.Router();
const notices = new Set(['created', 'updated', 'deleted', 'sold', 'relisted']);

function wantsJson(req) {
return req.accepts(['html', 'json']) === 'json';
}

function renderMarket(req, res, data = {}) {
return res.render('market', {
marketData: {
username: res.locals.currentUser.username,
items: [],
filters: {},
view: 'market',
editId: '',
notice: notices.has(req.query.notice) ? req.query.notice : '',
...data
        }
    });
}

function sendError(req, res, status, error, data = {}) {
res.status(status);
if (wantsJson(req)) {
const fields = data.fieldErrors;
return res.json(fields ? { error, fields } : { error });
    }
return renderMarket(req, res, { ...data, error });
}

async function requireMarketUser(req, res, next) {
res.vary('Accept');
res.set('Cache-Control', 'no-store');
const session = req.session;
if (session?.user && isObjectIdOrHexString(session.userId)) {
const user = await User.findById(session.userId).select('_id username email role').lean();
if (user) {
res.locals.currentUser = user;
return next();
        }
    }

const signIn = () => wantsJson(req)
? res.status(401).json({ error: 'Please sign in again.' })
: res.redirect('/login');
if (session?.user) return session.destroy(signIn);
return signIn();
}

function isOwnedBy(item, userId) {
return String(item.seller?._id ?? item.seller ?? '') === String(userId);
}

// ✅ 新中間件：擁有者 或者 admin 都允許
async function allowOwnerOrAdmin(req, res, next) {
const { id } = req.params;
const view = { view: 'mine' };
if (!isObjectIdOrHexString(id)) {
return sendError(req, res, 400, 'Invalid item ID.', view);
    }
const item = await Item.findById(id);
if (!item) return sendError(req, res, 404, 'This item was not found.', view);

const isOwner = isOwnedBy(item, res.locals.currentUser._id);
const isAdmin = res.locals.currentUser.role === 'admin';

if (!isOwner && !isAdmin) {
return sendError(req, res, 403, 'Only the seller or admin can change this item.', view);
}
res.locals.ownedItem = item;
return next();
}

function presentItem(item, userId) {
return {
id: String(item._id),
title: item.title,
description: item.description,
price: item.price,
category: item.category,
condition: item.condition ?? '',
status: item.status ?? 'Available',
sellerName: item.seller?.username ?? '',
isOwner: isOwnedBy(item, userId)
    };
}

function textValue(value) {
return typeof value === 'string' ? value.trim() : '';
}

function priceValue(value) {
if (typeof value === 'number') return value;
const text = textValue(value);
return text ? Number(text) : NaN;
}

function validPrice(price) {
return Number.isFinite(price) && price >= 0;
}

function itemForm(body, original) {
const formValues = {
title: textValue(body.title),
description: textValue(body.description),
price: typeof body.price === 'number' ? String(body.price) : textValue(body.price),
category: textValue(body.category),
condition: textValue(body.condition)
    };
const fieldErrors = {};
if (!formValues.title || (formValues.title.length > 60 && formValues.title !== original?.title?.trim())) {
        fieldErrors.title = 'Enter a title of up to 60 characters.';
    }
if (!formValues.description || (formValues.description.length > 300 && formValues.description !== original?.description?.trim())) {
        fieldErrors.description = 'Enter a description of up to 300 characters.';
    }
if (!validPrice(priceValue(body.price))) {
        fieldErrors.price = 'Enter a valid price of HK$0 or more.';
    }
if (!formValues.category) fieldErrors.category = 'Choose a category.';
if (body.condition != null && typeof body.condition !== 'string') {
        fieldErrors.condition = 'Choose a valid condition.';
    }
return { formValues, fieldErrors };
}

function success(req, res, notice, view) {
const query = new URLSearchParams({ notice });
if (view === 'mine') query.set('view', 'mine');
const redirect = '/list?' + query;
if (wantsJson(req)) {
return res.status(notice === 'created' ? 201 : 200).json({ redirect });
    }
return res.redirect(303, redirect);
}

router.get('/list', requireMarketUser, async (req, res) => {
const view = req.query.view === 'mine' ? 'mine' : 'market';
const filters = {
title: textValue(req.query.title),
category: textValue(req.query.category),
minPrice: textValue(req.query.minPrice),
maxPrice: textValue(req.query.maxPrice)
    };
const min = filters.minPrice ? priceValue(filters.minPrice) : 0;
const max = filters.maxPrice ? priceValue(filters.maxPrice) : Infinity;
const invalidRange = (filters.minPrice && !validPrice(min))
|| (filters.maxPrice && !validPrice(max)) || min > max;
if (invalidRange) {
return sendError(req, res, 400, 'Enter a valid price range.', { view, filters });
    }

const currentUser = res.locals.currentUser;
const title = filters.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const searchItems = await Item.searchItems({ ...filters, title });
const items = view === 'mine'
? searchItems.filter((item) => isOwnedBy(item, currentUser._id))
: searchItems;
if (wantsJson(req)) {
return res.json({ user: currentUser.username, currentUser, count: items.length, items, query: req.query });
    }
const latestFirst = items.toSorted((first, second) =>
        (second.createdAt?.getTime() ?? 0) - (first.createdAt?.getTime() ?? 0)
    );

// ✅ 傳入 isAdmin 給 renderMarket
return renderMarket(req, res, {
items: latestFirst.map((item) => presentItem(item, currentUser._id)),
        filters,
        view,
        isAdmin: currentUser.role === 'admin'
    });
});

router.get('/add', requireMarketUser, (req, res) => {
return renderMarket(req, res, { view: 'add', isAdmin: res.locals.currentUser.role === 'admin' });
});

router.post('/add', requireMarketUser, async (req, res) => {
const { formValues, fieldErrors } = itemForm(req.body || {});
if (Object.keys(fieldErrors).length) {
return sendError(req, res, 422, 'Please correct the highlighted fields.', {
view: 'add', formValues, fieldErrors, isAdmin: res.locals.currentUser.role === 'admin'
        });
    }

await Item.create({
...formValues,
price: Number(formValues.price),
seller: res.locals.currentUser._id,
status: 'Available'
    });
return success(req, res, 'created');
});

router.get('/edit', requireMarketUser, (req, res) => {
return res.redirect('/list?view=mine');
});

// ✅ 改用 allowOwnerOrAdmin
router.get('/edit/:id', requireMarketUser, allowOwnerOrAdmin, (req, res) => {
const editItem = presentItem(res.locals.ownedItem, res.locals.currentUser._id);
return renderMarket(req, res, {
view: 'edit',
editId: editItem.id,
editItem,
isAdmin: res.locals.currentUser.role === 'admin'
});
});

// ✅ 改用 allowOwnerOrAdmin
router.post('/edit/:id', requireMarketUser, allowOwnerOrAdmin, async (req, res) => {
const item = res.locals.ownedItem;
const userId = res.locals.currentUser._id;
const isAdmin = res.locals.currentUser.role === 'admin';
const { formValues, fieldErrors } = itemForm(req.body || {}, item);
if (Object.keys(fieldErrors).length) {
const editItem = presentItem(item, userId);
return sendError(req, res, 422, 'Please correct the highlighted fields.', {
view: 'edit', editId: editItem.id, editItem, formValues, fieldErrors, isAdmin
        });
    }

// admin 可以不檢查 seller，普通使用者要檢查seller
const updateFilter = isAdmin ? { _id: item._id } : { _id: item._id, seller: userId };
const updated = await Item.findOneAndUpdate(
        updateFilter,
        { $set: { ...formValues, price: Number(formValues.price) } },
        { runValidators: true }
    );
if (!updated) return sendError(req, res, 404, 'This item is no longer available.', { view: 'mine', isAdmin });
return success(req, res, 'updated', 'mine');
});

// ✅ 改用 allowOwnerOrAdmin
router.post('/items/:id/status', requireMarketUser, allowOwnerOrAdmin, async (req, res) => {
const { status } = req.body || {};
if (status !== 'Available' && status !== 'Sold') {
return sendError(req, res, 422, 'Choose Available or Sold.', { view: 'mine', isAdmin: res.locals.currentUser.role === 'admin' });
    }
const isAdmin = res.locals.currentUser.role === 'admin';
const updateFilter = isAdmin ? { _id: res.locals.ownedItem._id } : { _id: res.locals.ownedItem._id, seller: res.locals.currentUser._id };
const updated = await Item.findOneAndUpdate(
        updateFilter,
        { $set: { status } },
        { runValidators: true }
    );
if (!updated) return sendError(req, res, 404, 'This item is no longer available.', { view: 'mine', isAdmin });
return success(req, res, status === 'Sold' ? 'sold' : 'relisted', 'mine');
});

// ✅ 改用 allowOwnerOrAdmin
router.post('/delete-item/:id', requireMarketUser, allowOwnerOrAdmin, async (req, res) => {
const isAdmin = res.locals.currentUser.role === 'admin';
const deleteFilter = isAdmin ? { _id: res.locals.ownedItem._id } : { _id: res.locals.ownedItem._id, seller: res.locals.currentUser._id };
const deleted = await Item.findOneAndDelete(deleteFilter);
if (!deleted) return sendError(req, res, 404, 'This item is no longer available.', { view: 'mine', isAdmin });
return success(req, res, 'deleted', 'mine');
});

module.exports = router;

// ========== Admin 管理後台路由 ==========
router.get('/admin', requireMarketUser, async (req, res) => {
  const user = res.locals.currentUser;
  if (user.role !== 'admin') {
    return sendError(req, res, 403, 'You do not have admin permission.', { view: 'market' });
  }
  return res.render('admin', { user });
});
