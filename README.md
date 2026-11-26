# COMP 3810SEF Group Project - Campus Second-hand Market

## 1. Project Info

- **Project name:** Campus Second-hand Market
- **Module:** COMP 3810SEF
- **Group:** Group 12
- **Application type:** Server-side web application
- **Purpose:** The system provides a campus marketplace where university students can publish, browse, search, update, mark as sold, and delete second-hand items. It also provides account registration, email verification, login/logout, password recovery, and RESTful JSON APIs.
- **Example items:** Textbooks, electronics, furniture, clothing, and other used items.

### System Story Background

University students may need to buy or sell used learning materials and daily necessities. This application acts as a small campus marketplace:

1. A student registers and verifies an account.
2. The student signs in and publishes an item.
3. Other students browse the marketplace or search for items by title, category, and price.
4. The seller edits the item, marks it as sold or available again, or deletes it.
5. An administrator can also manage listings.

### Main Features

- User registration and six-digit email verification
- Login/logout using `express-session`
- Scrypt password hashing
- Forgot-password and one-hour reset links
- English/Chinese marketplace interface
- Listing search by title, category, minimum price, and maximum price
- Web create, read, update, delete, and sale-status operations
- RESTful JSON CRUD operations
- Admin edit and delete permissions

## 2. Group Info

### Group 12

| Member | Student ID (SID) | Workload Division |
|---|---:|---|
| Fong Ka Yan | 14043152 | Project Manager and Backend. Responsible for `server.js`, RESTful APIs, README, and overall integration. |
| DuDixi | 13388549 | Database Management. Responsible for Mongoose models and data seeding. |
| CHEN Degao | 14240946 | Authentication and Security. Responsible for MongoDB connection, EJS templates, login/logout, sessions, verification, and password recovery. |
| WANG Mengyu | 13398402 |  UI/UX Frontend. Responsible for marketplace presentation HTML. |
| Tong Tsam Ying | 14614205 | Responsible for setting up Ubuntu/cloud environments, conducting cURL/API testing, and troubleshooting/fixing issues. Edit the content of readme.md |
| ZHOU KEYU | 13235951 | Web CRUD Interaction. Responsible for connecting forms and UI actions to database operations. |

## 3. Project File Intro

### `server.js`

`server.js` is the main application entry point. It:

- Loads environment variables.
- Configures Express and EJS.
- Parses JSON and URL-encoded form data.
- Creates login sessions.
- Connects to MongoDB through Mongoose.
- Mounts authentication and marketplace routes.
- Implements `/api/items` RESTful CRUD endpoints.
- Starts the HTTP server after the database connects.

### `package.json`

`package.json` contains the project metadata and npm scripts:

- `npm start` - start the server
- `npm run dev` - start with Nodemon
- `npm run seed` - reset and seed the database
- `npm run test:db` - test the MongoDB connection

Dependencies include:

| Package | Purpose |
|---|---|
| `express` | Web server and routing |
| `express-session` | Session-based login state |
| `express-formidable` | Form-data support |
| `mongoose` / `mongodb` | MongoDB and Mongoose access |
| `ejs` | Server-rendered EJS templates |
| `dotenv` | Environment configuration |
| `nodemailer` | Verification and password-reset emails |
| `passport` / `passport-facebook` | Passport authentication support |
| `nodemon` | Development server restart |

### `public` Folder

The `public` folder contains static files.

- `preview.html` - standalone UI prototype for visual reference

Express serves this folder through `express.static`.

### `views` Folder

The `views` folder contains the application's EJS pages:

| File | Purpose |
|---|---|
| `login.ejs` | Login form and login messages |
| `register.ejs` | Account registration form |
| `verify.ejs` | Six-digit email verification form |
| `forgot-password.ejs` | Password-reset request form |
| `reset-password.ejs` | New-password form |
| `market.ejs` | Marketplace, search, listing cards, and create/edit UI |
| `admin.ejs` | Administrative UI template |

### `models` Folder

| File | Purpose |
|---|---|
| `User.js` | Defines the user schema, scrypt password hashing, verification fields, reset fields, and roles |
| `Item.js` | Defines listing fields and the `searchItems()` multi-condition search method |
| `seed.js` | Clears existing demo users/items and creates demo account data |

### `routes` Folder

| File | Purpose |
|---|---|
| `auth.js` | Registration, verification, login, logout, forgot-password, and reset-password routes |
| `items.js` | Authenticated web marketplace and listing CRUD routes |
| `user.js` | Legacy router file; it is not mounted by the current `server.js` |

### `middleware` Folder

- `auth.js` - checks whether `req.session.user` exists and redirects unauthenticated users to `/login`

## 4. Operation Guides

### Setup and Installation

1. GitDown or clone the project from GitHub: 'https://github.com/Duan514/comp3810sef_group12'.
2. On Ubuntu, open a terminal and enter the project folder:
   ```bash
   cd <project-folder>
   ```
3. Start the prepared application:
   ```bash
   npm start
   ```
4. Wait until the terminal displays the server address and MongoDB connection message.
5. Open `http://localhost:3000/login` in a browser on the same machine.

The MongoDB database and demo seed script have already been prepared. Start the application directly without recreating the `.env` file or rerunning `npm run seed`.

### Use of Login/Logout Pages

The final default account is:

| Username | Password | Role |
|---|---|---|
| `admin` | `123123` | Administrator |

Login steps:

1. Open `http://localhost:3000/login`.
2. Enter username `admin`.
3. Enter password `123123`.
4. Click **Login**.
5. The system redirects to `/list`.

Logout steps:

1. Click **Logout** in the navigation bar.
2. Or open `http://localhost:3000/logout`.
3. The session is destroyed and the system returns to `/login`.

For new accounts:

1. Open `/register`.
2. Enter a unique username, password, and email address.
3. Open `/verify` and enter the six-digit code.
4. If SMTP is not configured, the verification code is printed in the server console.
5. Login is blocked until email verification is complete.

Forgot password:

1. Open `/forgot-password`.
2. Enter the registered email address.
3. Open the emailed link or the console fallback link.
4. Enter and confirm a new password at `/reset-password/<token>`.
5. Reset links expire after one hour.

### Use of CRUD Web Pages

Sign in before using listing operations.

| Operation | Where to click/use | Route |
|---|---|---|
| **Create** | Click **Publish / Add Item**, enter title, description, price, category, and optional condition, then click **Publish Listing** | `GET/POST /add` |
| **Read** | Open `/list` or click **Marketplace** to view item cards. Use title, category, and price filters to search | `GET /list` |
| **Read my listings** | Click **My Listings** | `GET /list?view=mine` |
| **Update** | Open **My Listings**, click **Edit**, change fields, and click **Save** | `GET/POST /edit/:id` |
| **Mark sold/relist** | Open **My Listings**, then click **Mark Sold** or **Relist** | `POST /items/:id/status` |
| **Delete** | Open **My Listings** or an allowed listing card, click **Delete**, and confirm | `POST /delete-item/:id` |

Validation rules:

- Title is required and limited to 60 characters.
- Description is required and limited to 300 characters.
- Price must be a non-negative number.
- Category is required.
- Condition is optional.
- Normal users may manage only their own listings.
- An administrator may edit or delete listings.

### Use of RESTful CRUD Services

The `/api/items` API is JSON-only and does not require a login session.

| Operation | HTTP Method | URI | Purpose |
|---|---|---|---|
| List/search | `GET` | `/api/items` | List or search all items |
| Read one | `GET` | `/api/items/:id` | Read one item |
| Create | `POST` | `/api/items` | Create an item |
| Update | `PUT` | `/api/items/:id` | Update selected fields |
| Delete | `DELETE` | `/api/items/:id` | Delete an item |

#### List and Search

```bash
curl "http://localhost:3000/api/items"
curl "http://localhost:3000/api/items?category=Books"
curl "http://localhost:3000/api/items?title=textbook&minPrice=50&maxPrice=200"
```

Search parameters:

- `title=<text>` - partial, case-insensitive title match
- `category=<name>` - exact category match
- `minPrice=<number>` - minimum price
- `maxPrice=<number>` - maximum price

#### Read One Item

```bash
curl "http://localhost:3000/api/items/<ITEM_ID>"
```

- `200` - item returned
- `400` - invalid MongoDB ObjectId
- `404` - item not found

#### Create an Item

```bash
curl -X POST "http://localhost:3000/api/items" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Book","description":"Good condition","price":50,"category":"Books","condition":"Good"}'
```

- `201` - item created
- `400` - required field missing or validation failed

The response includes a `Location` header such as `/api/items/<ITEM_ID>`.

#### Update an Item

```bash
curl -X PUT "http://localhost:3000/api/items/<ITEM_ID>" \
  -H "Content-Type: application/json" \
  -d '{"price":40,"status":"Sold"}'
```

- `200` - item updated
- `400` - no update field or invalid ObjectId/value
- `404` - item not found

#### Delete an Item

```bash
curl -X DELETE "http://localhost:3000/api/items/<ITEM_ID>"
```

Successful response:

```json
{
  "success": true,
  "message": "Item deleted",
  "deletedId": "<ITEM_ID>"
}
```

To test all CRUD operations:

1. Run `GET /api/items` and copy an existing `_id`, or create a test item with `POST`.
2. Test `GET /api/items/<ITEM_ID>` with that `_id`.
3. Test `PUT /api/items/<ITEM_ID>` with JSON update fields.
4. Test `DELETE /api/items/<ITEM_ID>`.
5. Run `GET /api/items` again to confirm the item list changed.
