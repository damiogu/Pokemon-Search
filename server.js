import express from "express";
import fetch from "node-fetch";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import cors from "cors";
import path from "path";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), ".")));

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
console.log("OPENAI_API_KEY loaded?", !!process.env.OPENAI_API_KEY);

let db;
(async () => {
  db = await open({
    filename: "pokemon.db",
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pokemon_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      data TEXT NOT NULL,
      embedding BLOB,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      data TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
})();

const POKEAPI_BASE = "https://pokeapi-proxy.freecodecamp.rocks/api/pokemon";

// --- Existing Pokémon fetch endpoint ---
app.get("/pokemon/:nameOrId", async (req, res) => {
  const query = String(req.params.nameOrId).toLowerCase();

  try {
    await db.run("INSERT INTO searches (query) VALUES (?)", [query]);

    const cached = await db.get("SELECT data FROM pokemon_cache WHERE name = ?", [query]);
    if (cached) {
      console.log(`Serving ${query} from cache`);
      return res.json(JSON.parse(cached.data));
    }

    const apiRes = await fetch(`${POKEAPI_BASE}/${encodeURIComponent(query)}`);
    if (!apiRes.ok) return res.status(404).json({ error: "Pokémon not found" });
    const data = await apiRes.json();

    const nameKey = (data.name || query).toLowerCase();
    await db.run(
      "INSERT INTO pokemon_cache (name, data, last_updated) VALUES (?,?,CURRENT_TIMESTAMP) ON CONFLICT(name) DO UPDATE SET data=excluded.data, last_updated=CURRENT_TIMESTAMP",
      [nameKey, JSON.stringify(data)]
    );

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- NLP Search Endpoint ---
app.get("/search-nlp", async (req, res) => {
  if (!openai) return res.status(501).json({ error: "OpenAI not configured" });
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Query required" });

  try {
    // Ensure embeddings exist for all cached Pokémon (batch in chunks of 50)
    const all = await db.all("SELECT name, data FROM pokemon_cache WHERE embedding IS NULL");
    for (let i = 0; i < all.length; i += 50) {
      const chunk = all.slice(i, i + 50);
      const texts = chunk.map(p => {
        const parsed = JSON.parse(p.data);
        return `${parsed.name}: ${parsed.types?.map(t => t.type.name).join(", ")} - Weight ${parsed.weight}, Height ${parsed.height}`;
      });
      const emb = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts
      });
      for (let j = 0; j < chunk.length; j++) {
        await db.run("UPDATE pokemon_cache SET embedding=? WHERE name=?", [
          Buffer.from(new Float32Array(emb.data[j].embedding).buffer),
          chunk[j].name
        ]);
      }
    }

    // Create embedding for user query
    const qEmb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query
    });
    const qVec = qEmb.data[0].embedding;

    // Retrieve embeddings and compute cosine similarity
    const cached = await db.all("SELECT name, data, embedding FROM pokemon_cache WHERE embedding IS NOT NULL");
    const results = cached.map(p => {
      const emb = new Float32Array(p.embedding.buffer, p.embedding.byteOffset, p.embedding.byteLength / Float32Array.BYTES_PER_ELEMENT);
      const score = cosineSimilarity(qVec, emb);
      return { name: p.name, score };
    }).sort((a, b) => b.score - a.score);

    res.json(results.slice(0, 5)); // top 5 matches
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});

function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// --- AI Summary Endpoint ---
app.get("/summarize/:pokemon", async (req, res) => {
  if (!openai) return res.status(501).json({ error: "OpenAI not configured" });
  try {
    const name = req.params.pokemon.toLowerCase();
    const cached = await db.get("SELECT data FROM pokemon_cache WHERE name = ?", [name]);
    if (!cached) return res.status(404).json({ error: "Pokémon not found" });

    const poke = JSON.parse(cached.data);
    const prompt = `Summarize the key attributes, strengths, and typical role of the Pokémon ${poke.name}. Include its type(s), notable stats, and any strategic tips in battle.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 150
    });

    res.json({ summary: completion.choices[0].message.content.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not summarize" });
  }
});

// --- History & Favorites (unchanged) ---
app.get("/history", async (req, res) => {
  const rows = await db.all("SELECT query, timestamp FROM searches ORDER BY timestamp DESC LIMIT 10");
  res.json(rows);
});

app.post("/favorites", async (req, res) => {
  const { name, data } = req.body || {};
  if (!name || !data) return res.status(400).json({ error: "Name and data required" });
  try {
    await db.run("INSERT OR IGNORE INTO favorites (name, data) VALUES (?, ?)", [name.toLowerCase(), JSON.stringify(data)]);
    res.json({ message: `${name} added to favorites` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save favorite" });
  }
});

app.get("/favorites", async (req, res) => {
  const rows = await db.all("SELECT name, data FROM favorites ORDER BY added_at DESC");
  res.json(rows.map(r => ({ name: r.name, data: JSON.parse(r.data) })));
});

app.delete("/favorites/:name", async (req, res) => {
  const name = String(req.params.name).toLowerCase();
  try {
    await db.run("DELETE FROM favorites WHERE name = ?", [name]);
    res.json({ message: `${name} removed from favorites` });
  } catch (err) {
    res.status(500).json({ error: "Could not remove favorite" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
