const express = require('express');
const Item = require('../models/Item');
const router = express.Router();

// Helper functions
function textValue(v) {
  return (v ?? '').trim();
}
function priceValue(v) {
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function validPrice(p) {
  return typeof p === 'number' && p >= 0;
}

// Render market.ejs
async function renderMarket(req, res, marketData) {
  res.render('market', { marketData });
}

// GET /list
router.get('/list', async (req, res) => {
  const currentUser = req.session.user;
  if (!currentUser) {
    return res.redirect('/login');
  }

  const view = req.query.view === 'mine' ? 'mine' : 'market';
  const lang = req.query.lang === 'en' ? 'en' : 'zh'; // Read language parameter
  
  const filters = {
    title: textValue(req.query.title),
    category: textValue(req.query.category),
    minPrice: textValue(req.query.minPrice),
    maxPrice: textValue(req.query.maxPrice)
  };

  const min = priceValue(filters.minPrice);
  const max = priceValue(filters.maxPrice);
  const invalidRange = (filters.minPrice && !validPrice(min)) || (filters.maxPrice && !validPrice(max)) || (min != null && max != null && min > max);
  if (invalidRange) {
    return renderMarket(req, res, {
      username: currentUser.username,
      filters,
      view,
      items: [],
      lang, // Pass lang
      error: lang === 'zh' ? '请输入有效的价格范围。' : 'Enter a valid price range.'
    });
  }

  const searchParams = { ...filters };
  if (view === 'mine') {
    searchParams.seller = currentUser._id;
  }

  const searchItems = await Item.searchItems(searchParams);

  const items = searchItems.map(item => {
    const obj = item.toObject();
    obj.isOwner = obj.seller?._id.toString() === currentUser._id.toString();
    obj.sellerName = obj.seller?.username;
    return obj;
  });

  return renderMarket(req, res, {
    username: currentUser.username,
    filters,
    view,
    items,
    lang, // Pass lang
    isAdmin: currentUser.role === 'admin'
  });
});

// GET /add
router.get('/add', async (req, res) => {
  const currentUser = req.session.user;
  if (!currentUser) return res.redirect('/login');
  const lang = req.query.lang === 'en' ? 'en' : 'zh';
  renderMarket(req, res, {
    username: currentUser.username,
    view: 'add',
    filters: {},
    items: [],
    lang
  });
});

// POST /add
router.post('/add', async (req, res) => {
  const currentUser = req.session.user;
  if (!currentUser) return res.redirect('/login');
  const lang = req.query.lang === 'en' ? 'en' : 'zh';
  const { title, description, price, category, condition } = req.body;
  const fieldErrors = {};
  
  const errorMessages = {
    zh: { title: '名称必填且不超过60字', description: '描述必填且不超过300字', price: '价格必须大于等于0', category: '请选择分类' },
    en: { title: 'Title is required and max 60 chars', description: 'Description is required and max 300 chars', price: 'Price must be >=0', category: 'Category is required' }
  };
  const errs = errorMessages[lang];

  if (!title || title.length > 60) fieldErrors.title = errs.title;
  if (!description || description.length > 300) fieldErrors.description = errs.description;
  const p = Number(price);
  if (!validPrice(p)) fieldErrors.price = errs.price;
  if (!category) fieldErrors.category = errs.category;

  if (Object.keys(fieldErrors).length > 0) {
    return renderMarket(req, res, {
      username: currentUser.username,
      view: 'add',
      filters: {},
      items: [],
      formValues: req.body,
      fieldErrors,
      lang
    });
  }

  const newItem = new Item({
    title,
    description,
    price: p,
    category,
    condition,
    seller: currentUser._id,
    status: 'Available'
  });
  await newItem.save();
  return res.redirect(`/list?view=mine&notice=created&lang=${lang}`);
});

// GET /edit/:id
router.get('/edit/:id', async (req, res) => {
  const currentUser = req.session.user;
  if (!currentUser) return res.redirect('/login');
  const lang = req.query.lang === 'en' ? 'en' : 'zh';
  
  const item = await Item.findById(req.params.id).populate('seller');
  if (!item) return res.status(404).send('Item not found');
  if (item.seller._id.toString() !== currentUser._id.toString() && currentUser.role !== 'admin') {
    return res.status(403).send('No permission');
  }
  renderMarket(req, res, {
    username: currentUser.username,
    view: 'edit',
    editId: req.params.id,
    editItem: item.toObject(),
    filters: {},
    items: [],
    lang
  });
});

// POST /edit/:id
router.post('/edit/:id', async (req, res) => {
  const currentUser = req.session.user;
  if (!currentUser) return res.redirect('/login');
  const lang = req.query.lang === 'en' ? 'en' : 'zh';
  const { title, description, price, category, condition } = req.body;
  const fieldErrors = {};
  
  const errorMessages = {
    zh: { title: '名称必填且不超过60字', description: '描述必填且不超过300字', price: '价格必须大于等于0', category: '请选择分类' },
    en: { title: 'Title is required and max 60 chars', description: 'Description is required and max 300 chars', price: 'Price must be >=0', category: 'Category is required' }
  };
  const errs = errorMessages[lang];

  if (!title || title.length > 60) fieldErrors.title = errs.title;
  if (!description || description.length > 300) fieldErrors.description = errs.description;
  const p = Number(price);
  if (!validPrice(p)) fieldErrors.price = errs.price;
  if (!category) fieldErrors.category = errs.category;

  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).send('Item not found');
  if (item.seller.toString() !== currentUser._id.toString() && currentUser.role !== 'admin') {
    return res.status(403).send('No permission');
  }

  if (Object.keys(fieldErrors).length > 0) {
    return renderMarket(req, res, {
      username: currentUser.username,
      view: 'edit',
      editId: req.params.id,
      editItem: item.toObject(),
      filters: {},
      items: [],
      formValues: req.body,
      fieldErrors,
      lang
    });
  }

  item.title = title;
  item.description = description;
  item.price = p;
  item.category = category;
  item.condition = condition;
  await item.save();
  return res.redirect(`/list?view=mine&notice=updated&lang=${lang}`);
});

// POST /items/:id/status
router.post('/items/:id/status', async (req, res) => {
  const currentUser = req.session.user;
  if (!currentUser) return res.redirect('/login');
  const lang = req.query.lang === 'en' ? 'en' : 'zh';
  const { status } = req.body;
  if (!['Available','Sold'].includes(status)) return res.status(400).send('Invalid status');
  const item = await Item.findById(req.params.id);
  if (!item) return res.status(404).send('Item not found');
  if (item.seller.toString() !== currentUser._id.toString() && currentUser.role !== 'admin') {
    return res.status(403).send('No permission');
  }
  item.status = status;
  await item.save();
  const notice = status === 'Sold' ? 'sold' : 'relisted';
  return res.redirect(`/list?view=mine&notice=${notice}&lang=${lang}`);
});

// POST /delete-item/:id
router.post('/delete-item/:id', async (req, res) => {
  try {
    const currentUser = req.session.user;
    if (!currentUser) return res.redirect('/login');
    const lang = req.query.lang === 'en' ? 'en' : 'zh';
    
    const item = await Item.findById(req.params.id);
    if (!item) return res.redirect(`/list?lang=${lang}`);
    
    const isOwner = item.seller && item.seller.toString() === currentUser._id.toString();
    const isAdmin = currentUser.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).send('No permission');
    }
    
    await Item.deleteOne({ _id: item._id });
    console.log(`Item deleted: ${item.title} by ${currentUser.username}`);
    
    // Check the referrer to decide where to redirect
    const referer = req.get('Referrer') || '';
    if (referer.includes('view=mine')) {
      return res.redirect(`/list?view=mine&notice=deleted&lang=${lang}`);
    } else {
      return res.redirect(`/list?notice=deleted&lang=${lang}`);
    }
    
  } catch (err) {
    console.error("Delete route error:", err);
    return res.status(500).send('Internal server error');
  }
});

module.exports = router;