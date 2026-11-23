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
        const user = await User.findById(session.userId).select('_id username email').lean();
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

async function requireOwnedItem(req, res, next) {
    const { id } = req.params;
    const view = { view: 'mine' };
    if (!isObjectIdOrHexString(id)) {
        return sendError(req, res, 400, 'Invalid item ID.', view);
    }
    const item = await Item.findById(id);
    if (!item) return sendError(req, res, 404, 'This item was not found.', view);
    if (!isOwnedBy(item, res.locals.currentUser._id)) {
        return sendError(req, res, 403, 'Only the seller can change this item.', view);
    }
    res.locals.ownedItem = item;
    return next();
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
    // Reuse the model search and treat the web search box as plain text.
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
    return renderMarket(req, res, {
        items: latestFirst.map((item) => presentItem(item, currentUser._id)),
        filters,
        view
    });
});

router.get('/add', requireMarketUser, (req, res) => {
    return renderMarket(req, res, { view: 'add' });
});

router.post('/add', requireMarketUser, async (req, res) => {
    const { formValues, fieldErrors } = itemForm(req.body || {});
    if (Object.keys(fieldErrors).length) {
        return sendError(req, res, 422, 'Please correct the highlighted fields.', {
            view: 'add', formValues, fieldErrors
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

router.get('/edit/:id', requireMarketUser, requireOwnedItem, (req, res) => {
    const editItem = presentItem(res.locals.ownedItem, res.locals.currentUser._id);
    return renderMarket(req, res, { view: 'edit', editId: editItem.id, editItem });
});

router.post('/edit/:id', requireMarketUser, requireOwnedItem, async (req, res) => {
    const item = res.locals.ownedItem;
    const userId = res.locals.currentUser._id;
    const { formValues, fieldErrors } = itemForm(req.body || {}, item);
    if (Object.keys(fieldErrors).length) {
        const editItem = presentItem(item, userId);
        return sendError(req, res, 422, 'Please correct the highlighted fields.', {
            view: 'edit', editId: editItem.id, editItem, formValues, fieldErrors
        });
    }

    const updated = await Item.findOneAndUpdate(
        { _id: item._id, seller: userId },
        { $set: { ...formValues, price: Number(formValues.price) } },
        { runValidators: true }
    );
    if (!updated) return sendError(req, res, 404, 'This item is no longer available.', { view: 'mine' });
    return success(req, res, 'updated', 'mine');
});

router.post('/items/:id/status', requireMarketUser, requireOwnedItem, async (req, res) => {
    const { status } = req.body || {};
    if (status !== 'Available' && status !== 'Sold') {
        return sendError(req, res, 422, 'Choose Available or Sold.', { view: 'mine' });
    }

    const updated = await Item.findOneAndUpdate(
        { _id: res.locals.ownedItem._id, seller: res.locals.currentUser._id },
        { $set: { status } },
        { runValidators: true }
    );
    if (!updated) return sendError(req, res, 404, 'This item is no longer available.', { view: 'mine' });
    return success(req, res, status === 'Sold' ? 'sold' : 'relisted', 'mine');
});

router.post('/delete-item/:id', requireMarketUser, requireOwnedItem, async (req, res) => {
    const deleted = await Item.findOneAndDelete({
        _id: res.locals.ownedItem._id,
        seller: res.locals.currentUser._id
    });
    if (!deleted) return sendError(req, res, 404, 'This item is no longer available.', { view: 'mine' });
    return success(req, res, 'deleted', 'mine');
});

module.exports = router;
