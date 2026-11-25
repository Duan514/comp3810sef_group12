// ============================================================================
// COMP3810SEF Group 12 — Campus Second-hand Market
// server.js  (single entry point, run with: npm start  /  node server.js)
// Tech Stack: Express (L6) + Mongoose (L5/L6) + EJS (L7) + session (L7) + REST (L8)
// ============================================================================

// ===================== Demo SMTP & MongoDB Config =====================
// For local demo only. Comment this block before submission.

process.env.SMTP_HOST = "smtp.qq.com";
process.env.SMTP_PORT = 465;
process.env.SMTP_SECURE = true;
process.env.SMTP_USER = "1056833469@qq.com";
process.env.SMTP_PASS = "muznvvyyacpbbcgh";
process.env.MAIL_FROM = "1056833469@qq.com";

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = "mongodb+srv://Cdg111:Chendegao123@cluster0.vxksxkp.mongodb.net/?retryWrites=true&w=majority";
}

// Windows fix: Let Node use public DNS to resolve "mongodb+srv" SRV records, otherwise it will
// throw ECONNREFUSED / ETIMEOUT on Windows. This must be placed before requiring mongoose.
//const dns = require('dns');
//dns.setServers(['8.8.8.8']);

// Read MONGODB_URI from .env (environment variables)
require('dotenv').config();

// L6: Express — Node.js MVC Web framework
const express = require('express');
// L5/L6: Mongoose — MongoDB ODM, operates on collections using Schema + Model
const mongoose = require('mongoose');
// L7: express-session — Middleware that maintains login state (web session)
const session = require('express-session');

const Item = require('./models/Item');
// Must load User model: populate('seller') resolves the "User" reference by model name.
// Failing to load it will cause a MissingSchemaError.
require('./models/User');
const authRouter = require('./routes/auth');   // L6: Auth routes (register/verify/login/forgot password)
const itemsRouter = require('./routes/items'); // L6: Web CRUD routes (list/add/delete)

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// L7: Middleware — functions executed in order to process requests/responses
// ---------------------------------------------------------------------------
app.set('view engine', 'ejs');                 // L7: Use EJS as the template engine
app.use(express.json());                       // L7: Parse JSON request bodies (for REST API)
app.use(express.urlencoded({ extended: true })); // L7: Parse HTML form data
app.use(express.static('public'));

// ✅ Modification: Improved Session configuration, added cookie settings to ensure Cookie is saved properly in local HTTP environment
app.use(session({                              
  secret: 'my-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Must be false for local development using HTTP
    maxAge: 24 * 60 * 60 * 1000 // Session expiry time: 24 hours (optional)
  }
}));

// ---------------------------------------------------------------------------
// L8: RESTful API — One resource endpoint each for GET / POST / PUT / DELETE (no auth required)
// Status code semantics: 200 Success / 201 Created / 400 Bad Request / 404 Not Found
// ---------------------------------------------------------------------------

// GET /api/items — List or search items by criteria (title / category / minPrice / maxPrice)
app.get('/api/items', async (req, res) => {
  const items = await Item.searchItems(req.query); // L6: Model's static method
  res.json(items);
});

// GET /api/items/:id — Read a single record by id (populate seller's username/email)
app.get('/api/items/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id: ' + req.params.id });
  }
  const item = await Item.findById(req.params.id).populate('seller', 'username email'); // L6
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// POST /api/items — Create (whitelist fields to prevent clients from modifying _id / createdAt)
app.post('/api/items', async (req, res) => {
  const body = req.body || {};
  
  // Check if seller is a valid ObjectId
  const validSeller = mongoose.Types.ObjectId.isValid(body.seller) ? body.seller : undefined;

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

// PUT /api/items/:id — Update (whitelist fields to prevent clients from modifying _id / createdAt)
const UPDATABLE = ['title', 'description', 'price', 'category', 'condition', 'seller', 'status'];

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
  const item = await Item.findByIdAndUpdate( // L6: Model.findByIdAndUpdate()
    req.params.id,
    { $set: updates },
    { returnDocument: 'after', runValidators: true } // Return updated document + re-validate
  );
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// DELETE /api/items/:id — Delete an item
app.delete('/api/items/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id: ' + req.params.id });
  }
  const item = await Item.findByIdAndDelete(req.params.id); // L6
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true, message: 'Item deleted', deletedId: item._id });
});

// Unmatched /api/* paths -> 404
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Unknown API endpoint: ' + req.method + ' ' + req.originalUrl });
});

// ---------------------------------------------------------------------------
// L7: EJS Web pages — Login / List / Add / Edit (protected by auth middleware)
// ---------------------------------------------------------------------------
app.use('/', authRouter);   // Auth routes: /login /register /verify /forgot-password ...
app.use('/', itemsRouter);  // Web CRUD: /list /add /edit /delete-item/:id

// Any other unknown paths -> 404
app.use((req, res) => {
  res.status(404).type('text/plain').send('404 Not Found: ' + req.method + ' ' + req.originalUrl);
});

// ---------------------------------------------------------------------------
// L7: Error handling middleware (must take 4 parameters) — maps Mongoose validation errors to 400
// ---------------------------------------------------------------------------
app.use((err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  if (err.name === 'ValidationError' || err.name === 'CastError') status = 400;
  if (err.type === 'entity.parse.failed') { status = 400; err.message = 'Invalid JSON body'; }
  if (status >= 500) console.error(err);
  if (req.path.startsWith('/api')) return res.status(status).json({ error: err.message });
  res.status(status).type('text/plain').send('Error: ' + err.message);
});

// ---------------------------------------------------------------------------
// L5: Connect to MongoDB (connect to DB first, then listen; give clear error messages on failure)
// ---------------------------------------------------------------------------
async function start() {
  const uri = typeof MONGODB_URI !== 'undefined' ? MONGODB_URI : process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is missing');
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 }); // L5
  console.log('MongoDB connected:', mongoose.connection.name);
  app.listen(PORT, () => console.log('Server: http://localhost:' + PORT)); // L5: app.listen()
}

start().catch((err) => {
  console.error('MongoDB connection failed:', err.message);
  console.error('Check your MongoDB URI / Atlas IP whitelist. If 8.8.8.8 is blocked, comment out dns.setServers.');
  process.exit(1);
});