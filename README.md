# Pokemon-Search
Files:

index.html

styles.css

script.js

server.js

Quick Start:

Install Node.js v14+.

In this folder, run:

bash
Copy
Edit
npm init -y
npm install express node-fetch sqlite sqlite3 cors openai dotenv
Create a .env file in the project root and add your OpenAI API key:

env
Copy
Edit
OPENAI_API_KEY=your_api_key_here
Run the server:

bash
Copy
Edit
node server.js
Open index.html in your browser (or visit http://localhost:5000/index.html).

Notes:

The frontend expects the backend at http://localhost:5000. If hosted elsewhere, update API_BASE in script.js.

The server creates a local file pokemon.db (SQLite) to store cache, search history, and favorites.

OpenAI semantic search enables natural language Pokémon queries (e.g., “fast electric type good against water”), improving discoverability.

This is a development/demo setup and is not hardened for production.
