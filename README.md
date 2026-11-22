COMP 3810SEF Group Project - Campus Second-hand Market

Project info
Project name: Campus Second-hand Market
Description: A server-side web application where university students can buy and sell second-hand items (e.g., textbooks, electronics). It provides login/logout features, web CRUD pages, and RESTful APIs for managing items.

Group info
Group 12
Members:
[Fong Ka Yan] - [14043152] - Project Manager & Backend (server.js, RESTful APIs, README)
[DuDixi] - [13388549] - Database Management (models, MongoDB connection, Data Seeding)
[CHEN Degao] - [14240946] - Authentication & Security (Login/Logout, Sessions)
[WANG Mengyu] - [13398402] - UI/UX Frontend (views EJS templates)
[Tong Tsam Ying] - [14614205] - Testing & Deployment (Ubuntu/Cloud setup, CURL testing)
[ZHOU KEYU] - [13235951] - Web CRUD Interaction (Connecting forms to database)

Project file intro
server.js: Main server file and the entry point (npm start). It sets up Express.js and express-session, connects to MongoDB with Mongoose (including the Windows DNS fix), mounts the authentication and web-page routes, and provides the RESTful CRUD services for items: GET /api/items, GET /api/items/:id, POST /api/items, PUT /api/items/:id, DELETE /api/items/:id.
routes (folder): Express routers.
  auth.js: registration, email verification, resend code, login, forgot / reset password, logout.
  items.js: web CRUD pages - GET /list (multi-condition search), GET/POST /add, GET /edit, POST /delete-item/:id.
Legacy files (delete before submission): app.js and routes/user.js are fully replaced by server.js, routes/auth.js and routes/items.js. They are set read-only on this machine, so clear the read-only attribute and delete them manually.
package.json: Contains project metadata and dependencies (e.g., express, mongoose, ejs, dotenv).
.env: Stores sensitive environment variables (e.g., MongoDB URI). Note: Not included in the final submission.
views (folder): Contains EJS templates for the UI (e.g., login, create item, list items).
models (folder):
User.js: Defines the schema for users (username, password, email).
Item.js: Defines the schema for second-hand items (title, description, price, category, condition, seller, status). Includes a searchItems() static method to handle multi-condition searches.
seed.js: A script to populate the database with initial test data.

Operation guides
4.1 Setup & Installation

1. Install Node.js (v18 or newer). A MongoDB server is also required; this
   project uses a MongoDB Atlas cluster, so no local MongoDB installation is
   needed.

2. Install the dependencies:
   npm install

3. Create a .env file in the project root and put your own connection string in
   it (replace the placeholders with your user name, password and cluster host):
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/campus_market?retryWrites=true&w=majority

4. (Optional but recommended) Load the sample data - 3 users and 12 items:
   npm run seed

5. Start the server:
   npm start
   (equivalently: node server.js)

6. Open http://localhost:3000/login in a browser.

Notes:
- server.js starts with dns.setServers(['8.8.8.8']). This is intentional: on
  Windows, Node cannot resolve the "mongodb+srv" DNS record with the local
  resolver (ECONNREFUSED / ETIMEOUT), so a public DNS server is used instead.
  If your network blocks 8.8.8.8, comment those two lines out.
- The server connects to MongoDB BEFORE it starts listening, so a wrong
  MONGODB_URI stops it at once with a clear error instead of hanging.
- npm scripts: npm start (start the server), npm run dev (nodemon),
  npm run seed (sample data), npm run test:db (connection test only).

4.2 Use of Login/Logout pages

Demo accounts (created by "npm run seed"; passwords are stored as scrypt hashes):
  zhangsan / password123
  lisi     / password123
  wangwu   / password123

Sign in: open http://localhost:3000/login, type username and password, click Login.
Logout:  click "Logout" in the top navigation bar (present on every page).

Registration flow (email verification):
  1. Open http://localhost:3000/register and fill in username / password / email.
  2. A 6-digit code is sent by email. If SMTP is not configured in .env, the code is
     printed in the server console instead (the app still works).
  3. Open /verify, enter the code, the account becomes activated.
  4. Unverified accounts cannot log in - the login page tells the user to verify first.
Forgot password: /forgot-password sends a reset link (valid 1 hour) built from
  APP_BASE_URL + /reset-password/<token>.

4.3 Use of CRUD web pages

Create: log in, click "Add Item" in the navbar, fill in title / description / price /
        category / condition, click "Post Item" -> redirected to /list.
Read:   /list shows every item as a card. The same query parameters as the API work
        on the page, e.g. /list?category=Books or /list?minPrice=50&maxPrice=200.
Update: /edit opens the edit page (placeholder page for now).
Delete: every item you posted shows a "Delete" button; items posted by other users
        do not show it, and the server also rejects deleting them.

4.4 Use of RESTful CRUD services (CURL testing)

The RESTful services are mounted under /api and they do NOT require a login
(a marker can call them directly with curl). Every response is JSON.

| # | HTTP method | Path | Purpose |
|---|---|---|---|
| 1 | GET | /api/items | List all items, or search with query parameters |
| 2 | GET | /api/items/:id | Read one item by its MongoDB id |
| 3 | POST | /api/items | Create a new item |
| 4 | PUT | /api/items/:id | Update an existing item |
| 5 | DELETE | /api/items/:id | Delete an item |

Search parameters of GET /api/items (they can be combined):
- title=<text>       partial and case-insensitive, e.g. ?title=textbook
- category=<name>    exact match, e.g. ?category=Books
- minPrice=<number>  price >= the given value
- maxPrice=<number>  price <= the given value

Read (GET) - item list and search:
curl http://localhost:3000/api/items
curl "http://localhost:3000/api/items?category=Books"
curl "http://localhost:3000/api/items?title=textbook&minPrice=50&maxPrice=200"
  -> 200 with a JSON array (the seeded database has 12 items, 4 of them Books)

Read (GET) - one item (copy an _id from the list above):
curl http://localhost:3000/api/items/<ITEM_ID>
  -> 200 with the item, 404 if the id does not exist, 400 if the id is invalid

Create (POST):
curl -X POST http://localhost:3000/api/items \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Book","description":"Good","price":50,"category":"Books","condition":"Good"}'
  -> 201 Created; the body is the new item and the Location header is its URL
  -> 400 if a required field (title, description, price, category) is missing

Update (PUT) - only the fields you send are changed:
curl -X PUT http://localhost:3000/api/items/<ITEM_ID> \
  -H "Content-Type: application/json" \
  -d '{"price":40,"status":"Sold"}'
  -> 200 with the updated item, 404 if the id does not exist
  -> 400 if no updatable field is sent, or a value has the wrong type

Delete (DELETE):
curl -X DELETE http://localhost:3000/api/items/<ITEM_ID>
  -> 200 with {"success":true,"message":"Item deleted","deletedId":"..."}
  -> 404 if the id does not exist

Notes for the demo (Ubuntu via Way 1 or Way 2):
- Replace <ITEM_ID> with a real _id taken from "curl http://localhost:3000/api/items".
- The POST example creates one extra document; delete it with the DELETE API
  afterwards so the sample data keeps its 12 items.