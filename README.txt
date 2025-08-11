SkillNet - Pokémon Search Fullstack (SQLite)
Files:
- index.html
- styles.css
- script.js
- server.js

Quick start:
1. Install Node.js (v14+).
2. In this folder run:
   npm init -y
   npm install express node-fetch sqlite sqlite3 cors
3. Run the server:
   node server.js
4. Open index.html in your browser (or visit http://localhost:5000/index.html)

Notes:
- The frontend expects the backend at http://localhost:5000. If you host elsewhere, update API_BASE in script.js
- The server creates a local file pokemon.db (SQLite) to store cache/history/favorites.
- This is a development/demo setup, not hardened for production.
