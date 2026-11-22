// ============================================================================
// COMP3810SEF Group 12 — Campus Second-hand Market
// server.js  (single entry point, run with: npm start  /  node server.js)
// 技术栈: Express (L6) + Mongoose (L5/L6) + EJS (L7) + session (L7) + REST (L8)
// ============================================================================

// Windows 修复: 让 Node 用公共 DNS 解析 "mongodb+srv" 的 SRV 记录，否则在
// Windows 上会报 ECONNREFUSED / ETIMEOUT。必须放在加载 mongoose 之前。
const dns = require('dns');
dns.setServers(['8.8.8.8']);

// 读取 .env 里的 MONGODB_URI（环境变量）
require('dotenv').config();

// L6: Express —— Node.js 的 MVC Web 框架
const express = require('express');
// L5/L6: Mongoose —— MongoDB 的 ODM，用 Schema + Model 操作集合
const mongoose = require('mongoose');
// L7: express-session —— 中间件，维护登录状态（web session）
const session = require('express-session');

const Item = require('./models/Item');
// 必须加载 User 模型：populate('seller') 会按模型名解析 "User" 引用，
// 不加载这里会报 MissingSchemaError。
require('./models/User');
const authRouter = require('./routes/auth');   // L6: 认证路由（注册/验证/登录/找回密码）
const itemsRouter = require('./routes/items'); // L6: 网页 CRUD 路由（list/add/delete）

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// L7: 中间件 (middleware) —— 按顺序执行的函数，处理请求/响应
// ---------------------------------------------------------------------------
app.set('view engine', 'ejs');                 // L7: 用 EJS 作为模板引擎
app.use(express.json());                       // L7: 解析 JSON 请求体（REST API 用）
app.use(express.urlencoded({ extended: true })); // L7: 解析 HTML 表单
app.use(session({                              // L7: 会话中间件
  secret: 'my-secret-key',
  resave: false,
  saveUninitialized: false
}));

// ---------------------------------------------------------------------------
// L8: RESTful API —— GET / POST / PUT / DELETE 各一个资源端点（无需鉴权）
// 状态码语义: 200 成功 / 201 已创建 / 400 请求错误 / 404 不存在
// ---------------------------------------------------------------------------

// GET /api/items —— 列出或按条件检索商品 (title / category / minPrice / maxPrice)
app.get('/api/items', async (req, res) => {
  const items = await Item.searchItems(req.query); // L6: Model 的静态方法
  res.json(items);
});

// GET /api/items/:id —— 按 id 读取单条（populate 出 seller 的 username/email）
app.get('/api/items/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id: ' + req.params.id });
  }
  const item = await Item.findById(req.params.id).populate('seller', 'username email'); // L6
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// POST /api/items —— 新建商品（title/description/price/category 由 Schema 强制必填）
app.post('/api/items', async (req, res) => {
  const body = req.body || {};
  const item = await Item.create({   // L6: Model.create()
    title: body.title,
    description: body.description,
    price: body.price,
    category: body.category,
    condition: body.condition,
    seller: body.seller,
    status: body.status
  });
  res.status(201).location('/api/items/' + item._id).json(item);
});

// PUT /api/items/:id —— 更新（白名单字段，防止客户端改 _id / createdAt）
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
    { returnDocument: 'after', runValidators: true } // 返回更新后的文档 + 重新校验
  );
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// DELETE /api/items/:id —— 删除商品
app.delete('/api/items/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Invalid id: ' + req.params.id });
  }
  const item = await Item.findByIdAndDelete(req.params.id); // L6
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true, message: 'Item deleted', deletedId: item._id });
});

// 未匹配的 /api/* 路径 -> 404
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Unknown API endpoint: ' + req.method + ' ' + req.originalUrl });
});

// ---------------------------------------------------------------------------
// L7: EJS 网页 —— 登录 / 列表 / 新增 / 编辑（用 auth 中间件保护）
// ---------------------------------------------------------------------------
app.use('/', authRouter);   // 认证路由：/login /register /verify /forgot-password ...
app.use('/', itemsRouter);  // 网页 CRUD：/list /add /edit /delete-item/:id

// 其余未知路径 -> 404
app.use((req, res) => {
  res.status(404).type('text/plain').send('404 Not Found: ' + req.method + ' ' + req.originalUrl);
});

// ---------------------------------------------------------------------------
// L7: 错误处理中间件（必须 4 个参数）—— 把 Mongoose 校验错误映射为 400
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
// L5: 连接 MongoDB（先连库、再监听，失败时给出清晰报错）
// ---------------------------------------------------------------------------
async function start() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is missing in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 }); // L5
  console.log('MongoDB connected:', mongoose.connection.name);
  app.listen(PORT, () => console.log('Server: http://localhost:' + PORT)); // L5: app.listen()
}

start().catch((err) => {
  console.error('MongoDB connection failed:', err.message);
  console.error('Check .env / Atlas IP whitelist. If 8.8.8.8 is blocked, comment out dns.setServers.');
  process.exit(1);
});
