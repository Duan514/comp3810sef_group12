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
server.js: Main server file. Sets up Express.js, connects to MongoDB, defines routes for authentication, web CRUD pages, and RESTful APIs.
package.json: Contains project metadata and dependencies (e.g., express, mongoose, ejs, dotenv).
.env: Stores sensitive environment variables (e.g., MongoDB URI). Note: Not included in the final submission.
views (folder): Contains EJS templates for the UI (e.g., login, create item, list items).
models (folder):
User.js: Defines the schema for users (username, password, email).
Item.js: Defines the schema for second-hand items (title, description, price, category, condition, seller, status). Includes a searchItems() static method to handle multi-condition searches.
seed.js: A script to populate the database with initial test data.

Operation guides
4.1 Setup & Installation

Ensure Node.js and MongoDB are installed.

Run npm install to install dependencies.

Create a .env file in the root directory and add your MongoDB URI:
mongodb+srv://3810_Group_Project:0000@cluster0.cnaeyre.mongodb.net/

(Optional) Run node models/seed.js to populate test data.

Run node server.js or npm start to start the server.

4.2 Use of Login/Logout pages
[To be completed by Member 3: List valid login credentials, sign-in steps, etc.]

4.3 Use of CRUD web pages
Create: [e.g., Click "Add Item" button on the navbar]
Read: [e.g., Use the search bar to filter by title or category]
Update: [e.g., Click "Edit" on an item card]
Delete: [e.g., Click "Delete" on an item card]

4.4 Use of RESTful CRUD services (CURL testing)
Read (GET):
curl http://localhost:3000/api/items
curl "http://localhost:3000/api/items?category=Books"
Create (POST):
curl -X POST http://localhost:3000/api/items -H "Content-Type: application/json" -d '{"title":"Test Book", "price":50, "category":"Books", "description":"Good"}'
Update (PUT):
curl -X PUT http://localhost:3000/api/items/<ITEM_ID> -H "Content-Type: application/json" -d '{"price":40}'
Delete (DELETE):
curl -X DELETE http://localhost:3000/api/items/<ITEM_ID>