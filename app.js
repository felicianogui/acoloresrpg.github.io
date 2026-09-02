"use strict";

/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const DATABASE_FILES = {
    species: "database/species.json",
    pokemon: "database/pokemon.json",
    trainers: "database/trainers.json",
    moves: "database/moves.json",
    abilities: "database/abilities.json"
};

const STAT_FIELDS = [
    ["agility", "Agilidade"],
    ["strength", "Força"],
    ["constitution", "Constituição"],
    ["attention", "Atenção"],
    ["determination", "Determinação"],
    ["kindness", "Gentileza"],
    ["luck", "Sorte"]
];

const TYPE_COLORS = {
    "Grama": "#68ce68",
    "Fogo": "#ff4040",
    "Água": "#7294f8",
    "Elétrico": "#fffc71",
    "Voador": "#e3e3fd",
    "Gelo": "#add8e6",
    "Dragão": "#5454a6",
    "Venenoso": "#973197",
    "Aço": "#c0c0c0",
    "Sombrio": "#708090",
    "Fada": "#dda0dd",
    "Psíquico": "#ff95e8",
    "Lutador": "#ff6347",
    "Normal": "#fafad1",
    "Fantasma": "#796fb8",
    "Inseto": "#b5e38a",
    "Pedra": "#5b4b44",
    "Terra": "#9e6e5a"
};

let database = {
    species: [],
    pokemon: [],
    trainers: [],
    moves: [],
    abilities: []
};

let activeTrainerCategories = {
    "NPC": true,
    "Veterano": true,
    "Rival": true,
    "Jogador": true,
    "Ameaça": true
};

const TRAINER_CATEGORY_CLASSES = {
    "NPC": "trainer-category-npc",
    "Veterano": "trainer-category-veterano",
    "Rival": "trainer-category-rival",
    "Jogador": "trainer-category-jogador",
    "Ameaça": "trainer-category-ameaca"
};

const app = document.getElementById("app");

document.addEventListener("DOMContentLoaded", init);

async function init() {
    try {
        await loadDatabase();
        setupNavigation();
        showSeenPokemon();
    } catch (error) {
        console.error(error);

        app.innerHTML = `
            <section class="error">
                <h2>Erro ao carregar database</h2>
                <p>${escapeHTML(error.message)}</p>
                <p>
                    Confirme se o Live Server está ativo e se a pasta
                    <strong>database</strong> contém os arquivos JSON.
                </p>
            </section>
        `;
    }
}

async function loadDatabase() {
    const entries = await Promise.all(
        Object.entries(DATABASE_FILES).map(
            async ([key, path]) => {
                const response = await fetch(path, {
                    cache: "no-store"
                });

                if (!response.ok) {
                    throw new Error(
                        `Não foi possível carregar ${path}`
                    );
                }

                const data = await response.json();

                if (!Array.isArray(data)) {
                    throw new Error(
                        `${path} deve conter um array JSON`
                    );
                }

                return [key, data];
            }
        )
    );

    entries.forEach(([key, data]) => {
        database[key] = data;
    });
}

function setupNavigation() {
    document
        .querySelectorAll("[data-page]")
        .forEach(button => {
            button.addEventListener("click", () => {
                const page = button.dataset.page;

                if (page === "pokemon") showSeenPokemon();
                if (page === "trainers") showTrainers();
                if (page === "moves") showMoves();
                if (page === "abilities") showAbilities();
            });
        });
}

function showSeenPokemon() {
    const species = [...database.species].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
    );

    app.innerHTML = `
        <section class="page">
            <h2>Pokémon</h2>
            <p class="section-description">
                Todas as espécies de Pokémon registradas na database.
            </p>
            <input
                type="search"
                id="pokemon-search"
                placeholder="Pesquisar Pokémon..."
                autocomplete="off"
            >
            <div id="pokemon-list" class="card-grid"></div>
        </section>
    `;

    const search = document.getElementById("pokemon-search");

    function render() {
        const query = search.value.trim().toLowerCase();
        const filtered = species.filter(item =>
            item.name.toLowerCase().includes(query)
        );
        const container = document.getElementById("pokemon-list");

        if (!filtered.length) {
            container.innerHTML = "<p>Nenhum Pokémon encontrado.</p>";
            return;
        }

        container.innerHTML = filtered.map(renderSpeciesCard).join("");
        setupSpeciesLinks();
    }

    search.addEventListener("input", render);
    render();
}

function renderSpeciesCard(species) {
    return `
        <article
            class="pokemon-card"
            data-species-id="${escapeHTML(species.id)}"
        >
            <div
                class="pokemon-sprite-area"
                style="background: ${getTypeBackground(species.types)};"
            >
                <img
                    src="${escapeHTML(species.sprite || "")}"
                    alt="${escapeHTML(species.name)}"
                    loading="lazy"
                >
            </div>
            <h3>${escapeHTML(species.name)}</h3>
            ${renderTypes(species.types)}
        </article>
    `;
}

function setupSpeciesLinks() {
    document.querySelectorAll("[data-species-id]").forEach(element => {
        element.addEventListener("click", () => {
            showSpecies(element.dataset.speciesId);
        });
    });
}

function showSpecies(speciesId) {
    const species = database.species.find(item => item.id === speciesId);
    if (!species) return;

    const relatedPokemon = database.pokemon.filter(
        pokemon => pokemon.speciesId === speciesId
    );

    const trainerIds = [
        ...new Set(
            relatedPokemon
                .map(pokemon => pokemon.trainerId)
                .filter(Boolean)
        )
    ];

    const trainers = database.trainers.filter(trainer =>
        trainerIds.includes(trainer.id)
    );

    app.innerHTML = `
        <section
            class="page species-page"
            style="--species-background: ${getTypeBackground(
                species.types,
                true
            )};"
        >
            <button type="button" class="back-button" id="back-pokemon">
                ← Pokémon
            </button>

            <div class="species-header">
                <img
                    class="large-sprite"
                    src="${escapeHTML(species.sprite || "")}"
                    alt="${escapeHTML(species.name)}"
                >
                <div>
                    <h2>${escapeHTML(species.name)}</h2>
                    ${renderTypes(species.types)}
                    <p><strong>Altura:</strong> ${formatValue(species.height)}</p>
                    <p><strong>Peso:</strong> ${formatValue(species.weight)}</p>
                    ${
                        species.regionalVariation
                            ? `<p><strong>Variação:</strong>
                                ${escapeHTML(species.regionalVariation)}</p>`
                            : ""
                    }
                </div>
            </div>

            <section class="information-section">
                <h2>Habilidades</h2>
                ${renderAbilities(species.abilities)}
            </section>

            <section class="information-section">
                <h2>Atributos-base</h2>
                ${renderStats(species.baseStats)}
            </section>

            <section class="information-section">
                <h2>Movimentos</h2>
                ${renderMoveList(species.moves)}
            </section>

            <section class="information-section">
                <h2>Treinadores que têm esse Pokémon</h2>
                <div class="trainer-grid">
                    ${
                        trainers.length
                            ? trainers
                                .map(trainer =>
                                    renderTrainerSprite(trainer, speciesId)
                                )
                                .join("")
                            : "<p>Nenhum treinador registrado.</p>"
                    }
                </div>
            </section>
        </section>
    `;

    document.getElementById("back-pokemon")?.addEventListener(
        "click",
        showSeenPokemon
    );

    setupTrainerLinks();
}

function renderTrainerSprite(trainer) {
    return `
        <article
            class="trainer-card ${getTrainerCategoryClass(trainer.category)}"
            data-trainer-id="${escapeHTML(trainer.id)}"
        >
            <img
                src="${escapeHTML(trainer.sprite || "")}"
                alt="${escapeHTML(trainer.name)}"
                loading="lazy"
            >
            <strong>${escapeHTML(trainer.name)}</strong>
        </article>
    `;
}

function setupTrainerLinks() {
    document.querySelectorAll("[data-trainer-id]").forEach(element => {
        element.addEventListener("click", () => {
            showTrainer(element.dataset.trainerId);
        });
    });
}

function showPokemon(pokemonId) {
    const pokemon = database.pokemon.find(item => item.id === pokemonId);
    if (!pokemon) return;

    const species = database.species.find(
        item => item.id === pokemon.speciesId
    );

    const trainer = database.trainers.find(
        item => item.id === pokemon.trainerId
    );

    app.innerHTML = `
        <section class="page">
            <button type="button" class="back-button" id="back-trainer">
                ← Treinador
            </button>

            <div class="pokemon-header">
                <div class="sprite-pair">
                    <img
                        class="large-sprite"
                        src="${escapeHTML(
                            pokemon.sprite || species?.sprite || ""
                        )}"
                        alt="${escapeHTML(
                            pokemon.nickname || species?.name || "Pokémon"
                        )}"
                    >
                    ${
                        trainer
                            ? `<img
                                class="trainer-sprite"
                                src="${escapeHTML(trainer.sprite || "")}"
                                alt="${escapeHTML(trainer.name)}"
                                loading="lazy"
                            >`
                            : ""
                    }
                </div>

                <div>
                    <h2>${escapeHTML(
                        pokemon.nickname || species?.name || "Pokémon"
                    )}</h2>
                    <p><strong>Gênero:</strong>
                        ${escapeHTML(pokemon.gender || "Desconhecido")}</p>
                    <p><strong>Espécie:</strong>
                        ${escapeHTML(species?.name || "Desconhecida")}</p>
                    ${renderTypes(species?.types)}
                    <p><strong>Natureza:</strong>
                        ${escapeHTML(pokemon.nature || "—")}</p>
                    <p><strong>ID do Treinador:</strong>
                        ${escapeHTML(pokemon.trainerId || "—")}</p>
                </div>
            </div>

            <section class="information-section">
                <h2>Informações físicas</h2>
                <div class="info-grid">
                    <div>
                        <strong>Altura</strong>
                        <span>${formatValue(species?.height)}</span>
                    </div>
                    <div>
                        <strong>Peso</strong>
                        <span>${formatValue(species?.weight)}</span>
                    </div>
                </div>
            </section>

            <section class="information-section">
                <h2>Habilidades</h2>
                ${renderAbilities(pokemon.abilities)}
            </section>

            <section class="information-section">
                <h2>Atributos</h2>
                ${renderPokemonStats(pokemon)}
            </section>

            <section class="information-section">
                <h2>Ataques</h2>
                ${renderMoveList(pokemon.moves)}
            </section>
        </section>
    `;

    document.getElementById("back-trainer")?.addEventListener("click", () => {
        pokemon.trainerId
            ? showTrainer(pokemon.trainerId)
            : showSeenPokemon();
    });
}

function showTrainers() {
    const trainers = [...database.trainers].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
    );

    app.innerHTML = `
        <section class="page">
            <h2>Treinadores</h2>
            <p class="section-description">
                Treinadores registrados na database.
            </p>
            <input
                type="search"
                id="trainer-search"
                placeholder="Pesquisar treinador..."
                autocomplete="off"
            >
            <div id="trainer-list" class="trainer-grid"></div>
        </section>
    `;

    const search = document.getElementById("trainer-search");

    function render() {
        const query = search.value.trim().toLowerCase();
        const filtered = trainers.filter(trainer =>
            trainer.name.toLowerCase().includes(query)
        );
        const container = document.getElementById("trainer-list");

        if (!filtered.length) {
            container.innerHTML = "<p>Nenhum treinador encontrado.</p>";
            return;
        }

        container.innerHTML = filtered.map(renderTrainerListCard).join("");
        setupTrainerListLinks();
    }

    search.addEventListener("input", render);
    render();
}

function renderTrainerListCard(trainer) {
    return `
        <article
            class="trainer-card ${getTrainerCategoryClass(trainer.category)}"
            data-trainer-list-id="${escapeHTML(trainer.id)}"
        >
            <img
                src="${escapeHTML(trainer.sprite || "")}"
                alt="${escapeHTML(trainer.name)}"
                loading="lazy"
            >
            <h3>${escapeHTML(trainer.name)}</h3>
            <p>${escapeHTML(trainer.class || "")}</p>
            <div class="stars">${renderStars(trainer.stars)}</div>
        </article>
    `;
}

function setupTrainerListLinks() {
    document.querySelectorAll("[data-trainer-list-id]").forEach(element => {
        element.addEventListener("click", () => {
            showTrainer(element.dataset.trainerListId);
        });
    });
}

function showTrainer(trainerId) {
    const trainer = database.trainers.find(item => item.id === trainerId);
    if (!trainer) return;

    const pokemon = database.pokemon.filter(
        item => item.trainerId === trainerId
    );

    app.innerHTML = `
        <section
            class="page trainer-page ${getTrainerCategoryClass(trainer.category)}"
        >
            <button
                type="button"
                class="back-button"
                id="back-trainers"
            >
                ← Treinadores
            </button>

            <div class="trainer-header">
                <img
                    class="trainer-large-sprite"
                    src="${escapeHTML(trainer.sprite || "")}"
                    alt="${escapeHTML(trainer.name)}"
                >

                <div>
                    <h2>${escapeHTML(trainer.name)}</h2>

                    <p>
                        <strong>Gênero:</strong>
                        ${escapeHTML(
                            trainer.gender || "Não especificado"
                        )}
                    </p>

                    ${
                        trainer.hometown
                            ? `<p>
                                <strong>Cidade natal:</strong>
                                ${escapeHTML(trainer.hometown)}
                            </p>`
                            : ""
                    }

                    <p>
                        <strong>Região de origem:</strong>
                        ${escapeHTML(
                            trainer.region || "Não especificada"
                        )}
                    </p>

                    <p>
                        <strong>Classe:</strong>
                        ${escapeHTML(
                            trainer.class || "Não especificada"
                        )}
                    </p>

                    <div class="stars">
                        ${renderStars(trainer.stars)}
                    </div>
                </div>
            </div>

            <section class="information-section">
                <h2>Pokémon Vistos</h2>

                <div class="card-grid">
                    ${
                        pokemon.length
                            ? pokemon
                                .map(renderTrainerPokemonCard)
                                .join("")
                            : "<p>Nenhum Pokémon registrado.</p>"
                    }
                </div>
            </section>
        </section>
    `;

    document.getElementById("back-trainers")?.addEventListener(
        "click",
        showTrainers
    );

    setupPokemonLinks();
}

function renderTrainerPokemonCard(pokemon) {
    const species = database.species.find(
        item => item.id === pokemon.speciesId
    );

    const sprite = pokemon.sprite || species?.sprite || "";
    const name = pokemon.nickname || species?.name || "Pokémon";

    return `
        <article
            class="pokemon-card"
            data-pokemon-id="${escapeHTML(pokemon.id)}"
        >
            <img
                src="${escapeHTML(sprite)}"
                alt="${escapeHTML(name)}"
                loading="lazy"
            >
            <h3>${escapeHTML(name)}</h3>
            <p>${escapeHTML(
                species?.name || "Espécie desconhecida"
            )}</p>
        </article>
    `;
}

function setupPokemonLinks() {
    document.querySelectorAll("[data-pokemon-id]").forEach(element => {
        element.addEventListener("click", () => {
            showPokemon(element.dataset.pokemonId);
        });
    });
}

function showMoves() {
    const moves = [...database.moves].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
    );

    app.innerHTML = `
        <section class="page">
            <h2>Movimentos</h2>
            <p class="section-description">
                Lista de movimentos disponíveis.
            </p>
            <input
                type="search"
                id="move-search"
                placeholder="Pesquisar movimento..."
                autocomplete="off"
            >
            <div id="move-list" class="move-list"></div>
        </section>
    `;

    const search = document.getElementById("move-search");

    function render() {
        const query = search.value.trim().toLowerCase();
        const filtered = moves.filter(move =>
            move.name.toLowerCase().includes(query)
        );
        const container = document.getElementById("move-list");

        if (!filtered.length) {
            container.innerHTML = "<p>Nenhum movimento encontrado.</p>";
            return;
        }

        container.innerHTML = filtered.map(renderMoveCard).join("");
        setupMoveLinks();
    }

    search.addEventListener("input", render);
    render();
}

function renderMoveCard(move) {
    return `
        <article class="move-card" data-move-id="${escapeHTML(move.id)}">
            <div>
                <strong>${escapeHTML(move.name)}</strong>
                ${
                    move.type
                        ? `<span>(${escapeHTML(move.type)})</span>`
                        : ""
                }
            </div>
            <p>
                ${renderMoveEnergy(move)}
                ${move.dice ? `| ${escapeHTML(move.dice)}` : ""}
            </p>
        </article>
    `;
}

function setupMoveLinks() {
    document.querySelectorAll("[data-move-id]").forEach(element => {
        element.addEventListener("click", () => {
            showMove(element.dataset.moveId);
        });
    });
}

function showMove(moveId) {
    const move = database.moves.find(item => item.id === moveId);
    if (!move) return;

    const users = database.pokemon.filter(
        pokemon =>
            Array.isArray(pokemon.moves) &&
            pokemon.moves.includes(moveId)
    );

    app.innerHTML = `
        <section class="page">
            <button type="button" class="back-button" id="back-moves">
                ← Movimentos
            </button>

            <section class="move-detail">
                <h2>${escapeHTML(move.name)}</h2>
                ${
                    move.type
                        ? `<p><strong>Tipo:</strong>
                            ${escapeHTML(move.type)}</p>`
                        : ""
                }
                <p>${renderMoveEnergy(move)}</p>
                ${
                    move.dice
                        ? `<p><strong>Rolagem:</strong>
                            ${escapeHTML(move.dice)}</p>`
                        : ""
                }
                <p>${escapeHTML(
                    move.description || "Sem descrição."
                )}</p>
            </section>

            <section class="information-section">
                <h2>Pokémon que utilizam este movimento</h2>
                ${
                    users.length
                        ? `<div class="card-grid">
                            ${users.map(renderMoveUser).join("")}
                        </div>`
                        : "<p>Nenhum Pokémon individual utiliza este movimento.</p>"
                }
            </section>
        </section>
    `;

    document.getElementById("back-moves")?.addEventListener(
        "click",
        showMoves
    );

    setupPokemonLinks();
}

function renderMoveUser(pokemon) {
    const species = database.species.find(
        item => item.id === pokemon.speciesId
    );

    return `
        <article
            class="pokemon-card"
            data-pokemon-id="${escapeHTML(pokemon.id)}"
        >
            <img
                src="${escapeHTML(
                    pokemon.sprite || species?.sprite || ""
                )}"
                alt="${escapeHTML(
                    pokemon.nickname || species?.name || "Pokémon"
                )}"
                loading="lazy"
            >
            <h3>${escapeHTML(
                pokemon.nickname || species?.name || "Pokémon"
            )}</h3>
            <p>${escapeHTML(species?.name || "")}</p>
        </article>
    `;
}

function showAbilities() {
    const abilities = [...database.abilities].sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR")
    );

    app.innerHTML = `
        <section class="page">
            <h2>Habilidades</h2>
            <p class="section-description">
                Características e habilidades disponíveis.
            </p>
            <input
                type="search"
                id="ability-search"
                placeholder="Pesquisar habilidade..."
                autocomplete="off"
            >
            <div id="ability-list" class="ability-list"></div>
        </section>
    `;

    const search = document.getElementById("ability-search");

    function render() {
        const query = search.value.trim().toLowerCase();
        const filtered = abilities.filter(ability =>
            ability.name.toLowerCase().includes(query)
        );
        const container = document.getElementById("ability-list");

        if (!filtered.length) {
            container.innerHTML = "<p>Nenhuma habilidade encontrada.</p>";
            return;
        }

        container.innerHTML = filtered.map(renderAbilityCard).join("");
        setupAbilityLinks();
    }

    search.addEventListener("input", render);
    render();
}

function renderAbilityCard(ability) {
    return `
        <article
            class="ability"
            data-ability-id="${escapeHTML(ability.id)}"
        >
            <h3>${escapeHTML(ability.name)}</h3>
            <p>${escapeHTML(
                ability.description || "Sem descrição."
            )}</p>
        </article>
    `;
}

function setupAbilityLinks() {
    document.querySelectorAll("[data-ability-id]").forEach(element => {
        element.addEventListener("click", () => {
            showAbility(element.dataset.abilityId);
        });
    });
}

function showAbility(abilityId) {
    const ability = database.abilities.find(
        item => item.id === abilityId
    );

    if (!ability) return;

    const speciesUsers = database.species.filter(
        species =>
            Array.isArray(species.abilities) &&
            species.abilities.includes(abilityId)
    );

    app.innerHTML = `
        <section class="page">
            <button
                type="button"
                class="back-button"
                id="back-abilities"
            >
                ← Habilidades
            </button>

            <section class="ability-detail">
                <h2>${escapeHTML(ability.name)}</h2>
                <p>${escapeHTML(
                    ability.description || "Sem descrição."
                )}</p>
            </section>

            <section class="information-section">
                <h2>Espécies que possuem esta habilidade</h2>
                ${
                    speciesUsers.length
                        ? `<div class="card-grid">
                            ${speciesUsers
                                .map(renderAbilitySpecies)
                                .join("")}
                        </div>`
                        : "<p>Nenhuma espécie registrada.</p>"
                }
            </section>
        </section>
    `;

    document.getElementById("back-abilities")?.addEventListener(
        "click",
        showAbilities
    );

    setupSpeciesLinks();
}

function renderAbilitySpecies(species) {
    return `
        <article
            class="pokemon-card"
            data-species-id="${escapeHTML(species.id)}"
        >
            <img
                src="${escapeHTML(species.sprite || "")}"
                alt="${escapeHTML(species.name)}"
                loading="lazy"
            >
            <h3>${escapeHTML(species.name)}</h3>
        </article>
    `;
}

function renderStats(stats) {
    if (!stats) {
        return "<p>Nenhum atributo registrado.</p>";
    }

    return `
        <div class="stats">
            ${STAT_FIELDS.map(([key, label]) => `
                <div>
                    <span>${label}</span>
                    <strong>${Number(stats[key] || 0)}</strong>
                </div>
            `).join("")}
        </div>
    `;
}

function renderPokemonStats(pokemon) {
    const stats = pokemon.realStats || pokemon.baseStats || {};
    let html = renderStats(stats);

    if (pokemon.status === "capturado") {
        const constitution = Number(stats.constitution || 0);

        html += `
            <p class="pokemon-hp">
                <strong>Pontos de Vida:</strong>
                ${constitution * 30}
            </p>
        `;
    }

    return html;
}

function renderAbilities(abilityIds) {
    if (!Array.isArray(abilityIds) || !abilityIds.length) {
        return "<p>Nenhuma habilidade registrada.</p>";
    }

    return abilityIds.map(id => {
        const ability = database.abilities.find(item => item.id === id);
        if (!ability) return "";

        return `
            <article class="ability">
                <h3>${escapeHTML(ability.name)}</h3>
                <p>${escapeHTML(
                    ability.description || "Sem descrição."
                )}</p>
            </article>
        `;
    }).join("");
}

function renderMoveList(moveIds) {
    if (!Array.isArray(moveIds) || !moveIds.length) {
        return "<p>Nenhum movimento registrado.</p>";
    }

    return moveIds.map(id => {
        const move = database.moves.find(item => item.id === id);
        if (!move) return "";

        return `
            <article
                class="move-card"
                data-move-id="${escapeHTML(move.id)}"
            >
                <div>
                    <strong>${escapeHTML(move.name)}</strong>
                    ${
                        move.type
                            ? `<span>(${escapeHTML(move.type)})</span>`
                            : ""
                    }
                </div>

                <p>
                    ${renderMoveEnergy(move)}
                    ${move.dice ? `| ${escapeHTML(move.dice)}` : ""}
                </p>

                <p>${escapeHTML(move.description || "")}</p>
            </article>
        `;
    }).join("");
}

function renderMoveEnergy(move) {
    const amount = Number(move.energy || 0);

    if (move.mode === "recupera") {
        return `Recupera ${amount} energia${amount === 1 ? "" : "s"}`;
    }

    return `Gasta ${amount} energia${amount === 1 ? "" : "s"}`;
}

function renderTypes(types) {
    if (!Array.isArray(types) || !types.length) return "";

    return `
        <p class="types">
            ${types.map(type => `
                <span class="type">${escapeHTML(type)}</span>
            `).join("")}
        </p>
    `;
}

function renderStars(value) {
    const stars = Math.max(0, Math.min(5, Number(value) || 0));

    return `
        <span class="stars-display">
            ${[0, 1, 2, 3, 4].map(index => `
                <span class="${index < stars ? "filled" : ""}">★</span>
            `).join("")}
        </span>
    `;
}

function formatValue(value) {
    if (value === null || value === undefined || value === "") {
        return "Não informado";
    }

    return escapeHTML(value);
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getTypeColor(type) {
    return TYPE_COLORS[type] || "#dddddd";
}

function getTypeBackground(types, soft = false) {
    if (!Array.isArray(types) || !types.length) {
        return "#f4f4f4";
    }

    const color1 = getTypeColor(types[0]);

    if (types.length < 2) {
        if (soft) {
            return `color-mix(
                in srgb,
                ${color1} 20%,
                white 80%
            )`;
        }

        return color1;
    }

    const color2 = getTypeColor(types[1]);

    if (soft) {
        return `linear-gradient(
            90deg,
            color-mix(
                in srgb,
                ${color1} 20%,
                white 80%
            ),
            color-mix(
                in srgb,
                ${color2} 20%,
                white 80%
            )
        )`;
    }

    return `linear-gradient(
        90deg,
        ${color1},
        ${color2}
    )`;
}

function getTrainerCategoryClass(category) {
    return TRAINER_CATEGORY_CLASSES[category] || "trainer-category-npc";
}

function renderTrainerFilters() {
    return `
        <div class="trainer-filters">

            <button
                type="button"
                class="trainer-filter-button ${activeTrainerCategories["NPC"] ? "active" : "inactive"}"
                data-trainer-category="NPC"
            >
                NPC
            </button>

            <button
                type="button"
                class="trainer-filter-button ${activeTrainerCategories["Veterano"] ? "active" : "inactive"}"
                data-trainer-category="Veterano"
            >
                Veterano
            </button>

            <button
                type="button"
                class="trainer-filter-button ${activeTrainerCategories["Rival"] ? "active" : "inactive"}"
                data-trainer-category="Rival"
            >
                Rival
            </button>

            <button
                type="button"
                class="trainer-filter-button ${activeTrainerCategories["Jogador"] ? "active" : "inactive"}"
                data-trainer-category="Jogador"
            >
                Jogador
            </button>

            <button
                type="button"
                class="trainer-filter-button ${activeTrainerCategories["Ameaça"] ? "active" : "inactive"}"
                data-trainer-category="Ameaça"
            >
                Ameaça
            </button>

        </div>
    `;
}

function setupTrainerFilters() {

    document
        .querySelectorAll("[data-trainer-category]")
        .forEach(button => {

            button.addEventListener("click", () => {

                const category =
                    button.dataset.trainerCategory;

                activeTrainerCategories[category] =
                    !activeTrainerCategories[category];

                renderTrainers();

            });

        });

}

