const searchButton = document.getElementById("search-button");
const searchInput = document.getElementById("search-input");
const pokemonInfo = document.getElementById("pokemon-info");
const spriteContainer = document.getElementById("sprite-container");
const typesContainer = document.getElementById("types");

searchButton.addEventListener("click", handleSearch);

function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();

    if (!query) {
        alert("Please enter a Pokémon name or ID.");
        return;
    }

    displayLoading();

    fetch(`https://pokeapi-proxy.freecodecamp.rocks/api/pokemon/${query}`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Pokémon not found");
            }
            return response.json();
        })
        .then(data => displayPokemon(data))
        .catch(error => displayError(error.message));
}

function displayLoading() {
    clearPokemonInfo();
    const loading = document.createElement("p");
    loading.textContent = "Loading...";
    loading.id = "loading";
    pokemonInfo.appendChild(loading);
}

function displayPokemon(data) {
    clearPokemonInfo();

    document.getElementById("pokemon-name").textContent = capitalize(data.name);
    document.getElementById("pokemon-id").textContent = `#${data.id}`;
    document.getElementById("weight").textContent = `Weight: ${data.weight}`;
    document.getElementById("height").textContent = `Height: ${data.height}`;
    document.getElementById("hp").textContent = data.stats[0].base_stat;
    document.getElementById("attack").textContent = data.stats[1].base_stat;
    document.getElementById("defense").textContent = data.stats[2].base_stat;
    document.getElementById("special-attack").textContent = data.stats[3].base_stat;
    document.getElementById("special-defense").textContent = data.stats[4].base_stat;
    document.getElementById("speed").textContent = data.stats[5].base_stat;

    // Display types
    typesContainer.innerHTML = "";
    data.types.forEach(type => {
        const typeElement = document.createElement("p");
        typeElement.textContent = capitalize(type.type.name);
        typesContainer.appendChild(typeElement);
    });

    // Display sprite
    spriteContainer.innerHTML = "";
    const sprite = document.createElement("img");
    sprite.id = "sprite";
    sprite.src = data.sprites.front_default;
    sprite.alt = data.name;
    spriteContainer.appendChild(sprite);
}

function displayError(message) {
    clearPokemonInfo();
    const error = document.createElement("p");
    error.textContent = message;
    error.style.color = "red";
    pokemonInfo.appendChild(error);
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

// Create recommended Pokémon when page loads
createRecommendations();
