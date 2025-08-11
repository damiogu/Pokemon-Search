/* Frontend script that talks to the local backend server.
   API_BASE should point to where you run server.js (default http://localhost:5000).
*/
const API_BASE = "http://localhost:5000";

const searchButton = document.getElementById("search-button");
const searchInput = document.getElementById("search-input");
const pokemonInfo = document.getElementById("pokemon-info");
const spriteContainer = document.getElementById("sprite-container");
const typesContainer = document.getElementById("types");

// New AI search + summary elements
const nlpSearchButton = document.getElementById("nlp-search-button");
const nlpSearchInput = document.getElementById("nlp-search-input");
const aiSummarySection = document.getElementById("ai-summary");
const summaryText = document.getElementById("summary-text");

searchButton.addEventListener("click", handleSearch);
searchInput.addEventListener("keydown", (e) => { if (e.key === 'Enter') handleSearch(); });

if (nlpSearchButton && nlpSearchInput) {
    nlpSearchButton.addEventListener("click", handleNLPSearch);
    nlpSearchInput.addEventListener("keydown", (e) => { if (e.key === 'Enter') handleNLPSearch(); });
}

function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) { alert("Please enter a Pokémon name or ID."); return; }
    displayLoading();
    fetch(`${API_BASE}/pokemon/${encodeURIComponent(query)}`)
        .then(response => {
            if (!response.ok) throw new Error("Pokémon not found");
            return response.json();
        })
        .then(data => {
            displayPokemon(data);
            loadHistory();
            loadFavorites(); // refresh favorite state
        })
        .catch(error => displayError(error.message));
}

function handleNLPSearch() {
    const query = nlpSearchInput.value.trim();
    if (!query) { alert("Please enter a search query."); return; }
    displayLoading();
    fetch(`${API_BASE}/search-nlp?q=${encodeURIComponent(query)}`)
        .then(res => {
            if (!res.ok) throw new Error("NLP search failed");
            return res.json();
        })
        .then(results => {
            if (!results || results.length === 0) {
                displayError("No Pokémon match your description.");
                return;
            }
            searchInput.value = results[0].name;
            handleSearch();
        })
        .catch(err => displayError(err.message));
}

function displayLoading() {
    clearPokemonInfo();
    const loading = document.createElement("p");
    loading.textContent = "Loading...";
    loading.id = "loading";
    pokemonInfo.appendChild(loading);
    if (aiSummarySection) aiSummarySection.style.display = "none";
}

function displayPokemon(data) {
    clearPokemonInfo();
    document.getElementById("pokemon-name").textContent = capitalize(data.name);
    document.getElementById("pokemon-id").textContent = `#${data.id}`;
    document.getElementById("weight").textContent = `Weight: ${data.weight}`;
    document.getElementById("height").textContent = `Height: ${data.height}`;
    document.getElementById("hp").textContent = data.stats[0]?.base_stat ?? "";
    document.getElementById("attack").textContent = data.stats[1]?.base_stat ?? "";
    document.getElementById("defense").textContent = data.stats[2]?.base_stat ?? "";
    document.getElementById("special-attack").textContent = data.stats[3]?.base_stat ?? "";
    document.getElementById("special-defense").textContent = data.stats[4]?.base_stat ?? "";
    document.getElementById("speed").textContent = data.stats[5]?.base_stat ?? "";

    typesContainer.innerHTML = "";
    (data.types || []).forEach(type => {
        const typeElement = document.createElement("p");
        typeElement.textContent = capitalize(type.type.name);
        typesContainer.appendChild(typeElement);
    });

    spriteContainer.innerHTML = "";
    const sprite = document.createElement("img");
    sprite.id = "sprite";
    sprite.src = data.sprites?.front_default || "";
    sprite.alt = data.name;
    spriteContainer.appendChild(sprite);

    // Favorite button
    const favWrapper = document.createElement("div");
    favWrapper.className = "fav-actions";

    const addBtn = document.createElement("button");
    addBtn.className = "small-btn save-btn";
    addBtn.textContent = "Save to Favorites";
    addBtn.onclick = () => saveFavorite(data);

    const removeBtn = document.createElement("button");
    removeBtn.className = "small-btn remove-btn";
    removeBtn.textContent = "Remove Favorite";
    removeBtn.onclick = () => removeFavorite(data.name);

    favWrapper.appendChild(addBtn);
    favWrapper.appendChild(removeBtn);
    pokemonInfo.appendChild(favWrapper);

    // AI summary fetch
    if (aiSummarySection && summaryText) {
        fetch(`${API_BASE}/summarize/${data.name}`)
            .then(res => {
                if (res.status === 501) throw new Error("AI not available");
                return res.json();
            })
            .then(summaryData => {
                summaryText.textContent = summaryData.summary || "";
                aiSummarySection.style.display = "block";
            })
            .catch(() => { aiSummarySection.style.display = "none"; });
    }
}

function displayError(message) {
    clearPokemonInfo();
    const error = document.createElement("p");
    error.textContent = message;
    error.style.color = "red";
    pokemonInfo.appendChild(error);
    if (aiSummarySection) aiSummarySection.style.display = "none";
}

function clearPokemonInfo() {
    document.getElementById("pokemon-name").textContent = "";
    document.getElementById("pokemon-id").textContent = "";
    document.getElementById("weight").textContent = "";
    document.getElementById("height").textContent = "";
    document.getElementById("hp").textContent = "";
    document.getElementById("attack").textContent = "";
    document.getElementById("defense").textContent = "";
    document.getElementById("special-attack").textContent = "";
    document.getElementById("special-defense").textContent = "";
    document.getElementById("speed").textContent = "";
    typesContainer.innerHTML = "";
    spriteContainer.innerHTML = "";

    const loading = document.getElementById("loading");
    if (loading) loading.remove();
}

function capitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Recommended Pokémon Section
const recommendedPokemons = [
    { name: "pikachu", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png" },
    { name: "bulbasaur", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png" },
    { name: "charmander", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png" },
    { name: "squirtle", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png" },
    { name: "eevee", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png" },
    { name: "jigglypuff", img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/39.png" }
];

function createRecommendations() {
    const recommendedList = document.getElementById("recommended-list");
    recommendedList.innerHTML = "";
    recommendedPokemons.forEach(pokemon => {
        const card = document.createElement("div");
        card.classList.add("recommend-card");
        const img = document.createElement("img");
        img.src = pokemon.img;
        img.alt = pokemon.name;
        const name = document.createElement("p");
        name.textContent = capitalize(pokemon.name);
        card.appendChild(img);
        card.appendChild(name);
        card.addEventListener("click", () => {
            searchInput.value = pokemon.name;
            handleSearch();
        });
        recommendedList.appendChild(card);
    });
}

// Favorites / History functions
async function saveFavorite(data) {
    try {
        const res = await fetch(`${API_BASE}/favorites`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: data.name, data })
        });
        const j = await res.json();
        alert(j.message || "Saved to favorites");
        loadFavorites();
    } catch (err) {
        alert("Could not save favorite");
    }
}

async function removeFavorite(name) {
    try {
        await fetch(`${API_BASE}/favorites/${encodeURIComponent(name)}`, { method: "DELETE" });
        alert(name + " removed from favorites");
        loadFavorites();
    } catch (err) {
        alert("Could not remove favorite");
    }
}

function loadHistory() {
    fetch(`${API_BASE}/history`)
        .then(res => res.json())
        .then(history => {
            const historyList = document.getElementById("history-list");
            historyList.innerHTML = "";
            history.forEach(item => {
                const li = document.createElement("li");
                li.textContent = `${item.query} (${new Date(item.timestamp).toLocaleString()})`;
                li.onclick = () => { searchInput.value = item.query; handleSearch(); };
                historyList.appendChild(li);
            });
        })
        .catch(()=>{ /* ignore */ });
}

function loadFavorites() {
    fetch(`${API_BASE}/favorites`)
        .then(res => res.json())
        .then(favs => {
            const favList = document.getElementById("favorites-list");
            favList.innerHTML = "";
            favs.forEach(fav => {
                const li = document.createElement("li");
                li.textContent = capitalize(fav.name);
                li.onclick = () => displayPokemon(fav.data);
                favList.appendChild(li);
            });
        })
        .catch(()=>{ /* ignore */ });
}

// Initialize UI
createRecommendations();
loadHistory();
loadFavorites();
