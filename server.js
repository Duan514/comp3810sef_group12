// COMP3810SEF Group 12 Campus Second-hand Market
process.env.SMTP_HOST = "smtp.qq.com";
process.env.SMTP_PORT = 465;
process.env.SMTP_SECURE = true;
process.env.SMTP_USER = "1056833469@qq.com";
process.env.SMTP_PASS = "muznvvyyacpbbcgh";
process.env.MAIL_FROM = "1056833469@qq.com";

//Connect to mongoDB
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = "mongodb+srv://Cdg111:Chendegao123@cluster0.vxksxkp.mongodb.net/?retryWrites=true&w=majority";
}

//Load environment variables
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');

const Item = require('./models/Item');
require('./models/User');
const authRouter = require('./routes/auth'); 
const itemsRouter = require('./routes/items'); 

const app = express();
const PORT = process.env.PORT || 3000;

//middleware
app.set('view engine', 'ejs');                 
app.use(express.json());                       
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({                              
  secret: 'my-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    maxAge: 24 * 60 * 60 * 1000 
  }
}));


// GET items and filter it
app.get('/api/items', async (req, res) => {
  const items = await Item.searchItems(req.query); 
  res.json(items);
});

// GET items and query items record
app.get('/api/items/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id: ' + req.params.id });
  }
  const item = await Item.findById(req.params.id).populate('seller', 'username email'); // L6
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// POST create new items
app.post('/api/items', async (req, res) => {
  const body = req.body || {};
  

  const validSeller = mongoose.Types.ObjectId.isValid(body.seller) ? body.seller : undefined;
//create items data
  const item = await Item.create({
    title: body.title,
    description: body.description,
    price: body.price,
    category: body.category,
    condition: body.condition,
    seller: validSeller, 
    status: body.status
  });
  res.status(201).location('/api/items/' + item._id).json(item);
});

const UPDATABLE = ['title', 'description', 'price', 'category', 'condition', 'seller', 'status'];

//update items
app.put('/api/items/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id: ' + req.params.id });
  }
  const body = req.body || {};
  const updates = {};
  UPDATABLE.forEach((field) => {
    if (body[field] !== undefined) updates[field] = body[field];
  });
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No updatable field provided', allowedFields: UPDATABLE });
  }
  const item = await Item.findByIdAndUpdate( 
    req.params.id,
    { $set: updates },
    { returnDocument: 'after', runValidators: true }
  );
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// Delete item
app.delete('/api/items/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id: ' + req.params.id });
  }
  const item = await Item.findByIdAndDelete(req.params.id); // L6
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true, message: 'Item deleted', deletedId: item._id });
});

// Unmatched eror
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Unknown API endpoint: ' + req.method + ' ' + req.originalUrl });
});


// login register verify forgot-passord

app.use('/', authRouter);   // Auth routes: /login /register /verify /forgot-password ...
app.use('/', itemsRouter);  // Web CRUD: /list /add /edit /delete-item/:id

app.use((req, res) => {
  res.status(404).type('text/plain').send('404 Not Found: ' + req.method + ' ' + req.originalUrl);
});


//Handle error
use((err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  if (err.name === 'ValidationError' || err.name === 'CastError') status = 400;
  if (err.type === 'entity.parse.failed') { status = 400; err.message = 'Invalid JSON body'; }
  if (status >= 500) console.error(err);
  if (req.path.startsWith('/api')) return res.status(status).json({ error: err.message });
  res.status(status).type('text/plain').send('Error: ' + err.message);
});

//Connect to MongoDB 
async function start() {
  const uri = typeof MONGODB_URI !== 'undefined' ? MONGODB_URI : process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is missing');
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 }); // L5
  console.log('MongoDB connected:', mongoose.connection.name);
  app.listen(PORT, () => console.log('Server: http://localhost:' + PORT)); 
}

start().catch((err) => {
  console.error('MongoDB connection failed:', err.message);
  console.error('Check your MongoDB URI / Atlas IP whitelist. If 8.8.8.8 is blocked, comment out dns.setServers.');
  process.exit(1);
});
