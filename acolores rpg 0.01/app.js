let species = [];
let pokemon = [];
let trainers = [];
let moves = [];
let abilities = [];

let currentPage = "pokemon";

let currentView = null;


/* =========================
   CARREGAMENTO
========================= */

Promise.all([

    fetch("database/species.json")
        .then(response => response.json()),

    fetch("database/pokemon.json")
        .then(response => response.json()),

    fetch("database/trainers.json")
        .then(response => response.json()),

    fetch("database/moves.json")
        .then(response => response.json()),

    fetch("database/abilities.json")
        .then(response => response.json())

])

.then(data => {

    species = data[0];

    pokemon = data[1];

    trainers = data[2];

    moves = data[3];

    abilities = data[4];

    renderPokemonList();

})

.catch(error => {

    console.error(error);

    document.getElementById("app").innerHTML = `
        <div class="detail">
            <h2>Erro ao carregar database</h2>
            <p>
                Não foi possível carregar os arquivos da database.
            </p>
        </div>
    `;

});


/* =========================
   ELEMENTOS
========================= */

const app =
    document.getElementById("app");

const search =
    document.getElementById("search");


/* =========================
   NAVEGAÇÃO
========================= */

document
    .querySelectorAll(".nav-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                currentPage =
                    button.dataset.page;

                currentView = null;

                document
                    .querySelectorAll(".nav-button")
                    .forEach(b =>
                        b.classList.remove("active")
                    );

                button.classList.add("active");

                search.value = "";

                updateSearchPlaceholder();

                if (currentPage === "pokemon") {

                    renderPokemonList();

                }

                else if (
                    currentPage === "trainers"
                ) {

                    renderTrainerList();

                }

                else if (
                    currentPage === "moves"
                ) {

                    renderMoveList();

                }

            }
        );

    });


/* =========================
   PESQUISA
========================= */

search.addEventListener(
    "input",
    () => {

        if (currentView !== null) {
            return;
        }

        if (currentPage === "pokemon") {

            renderPokemonList();

        }

        else if (
            currentPage === "trainers"
        ) {

            renderTrainerList();

        }

        else if (
            currentPage === "moves"
        ) {

            renderMoveList();

        }

    }
);


function updateSearchPlaceholder() {

    if (currentPage === "pokemon") {

        search.placeholder =
            "Pesquisar Pokémon...";

    }

    else if (
        currentPage === "trainers"
    ) {

        search.placeholder =
            "Pesquisar treinador...";

    }

    else {

        search.placeholder =
            "Pesquisar movimento...";

    }

}


/* =========================
   BUSCAS AUXILIARES
========================= */

function getSpecies(id) {

    return species.find(
        s => s.id === id
    );

}


function getTrainer(id) {

    return trainers.find(
        t => t.id === id
    );

}


function getPokemon(id) {

    return pokemon.find(
        p => p.id === id
    );

}


function getMove(id) {

    return moves.find(
        m => m.id === id
    );

}


function getAbility(id) {

    return abilities.find(
        a => a.id === id
    );

}


function getPokemonByTrainer(id) {

    return pokemon.filter(
        p => p.trainerId === id
    );

}


function getPokemonBySpecies(id) {

    return pokemon.filter(
        p => p.speciesId === id
    );

}


/* =========================
   LISTA DE POKÉMON
========================= */

function renderPokemonList() {

    const query =
        search.value
            .trim()
            .toLowerCase();


    /*
       A lista é dividida entre:

       - Pokémon de treinadores
       - Pokémon vistos

       Para Pokémon vistos,
       mostramos uma espécie apenas uma vez.
    */


    const trainerPokemon =
        pokemon.filter(
            p =>
                p.status === "capturado" ||
                p.trainerId !== null
        );


    const seenSpeciesIds =
        new Set(
            pokemon
                .filter(p =>
                    p.status === "visto"
                )
                .map(p =>
                    p.speciesId
                )
        );


    let seenSpecies =
        species.filter(s =>
            seenSpeciesIds.has(s.id)
        );


    if (query) {

        seenSpecies =
            seenSpecies.filter(s =>
                s.name
                    .toLowerCase()
                    .includes(query)
            );

    }


    let filteredTrainerPokemon =
        trainerPokemon;


    if (query) {

        filteredTrainerPokemon =
            trainerPokemon.filter(p => {

                const s =
                    getSpecies(p.speciesId);

                return (
                    p.nickname &&
                    p.nickname
                        .toLowerCase()
                        .includes(query)
                ) ||
                (
                    s &&
                    s.name
                        .toLowerCase()
                        .includes(query)
                );

            });

    }


    app.innerHTML = `

        <h2>Pokémon de Treinadores</h2>

        <div class="list">

            ${
                filteredTrainerPokemon
                    .map(renderPokemonCard)
                    .join("")
            }

        </div>


        <div class="section">

            <h2>Pokémon Vistos</h2>

            <div class="list">

                ${
                    seenSpecies
                        .map(renderSpeciesCard)
                        .join("")
                }

            </div>

        </div>

    `;

}


/* =========================
   CARD POKÉMON INDIVIDUAL
========================= */

function renderPokemonCard(p) {

    const s =
        getSpecies(p.speciesId);

    return `

        <div
            class="card"
            onclick="
                showPokemon('${p.id}')
            "
        >

            <img
                src="${s.sprite}"
                alt="${s.name}"
            >

            <div class="card-info">

                <strong>
                    ${p.nickname || "Sem apelido"}
                    |
                    ${p.gender || "—"}
                </strong>

                <div>
                    ${s.name}
                </div>

                <small>
                    ${
                        getTrainer(p.trainerId)
                            ?.name ||
                        "Sem treinador"
                    }
                </small>

            </div>

        </div>

    `;

}


/* =========================
   CARD ESPÉCIE
========================= */

function renderSpeciesCard(s) {

    return `

        <div
            class="card"
            onclick="
                showSpecies('${s.id}')
            "
        >

            <img
                src="${s.sprite}"
                alt="${s.name}"
            >

            <div class="card-info">

                <strong>
                    ${s.name}
                </strong>

                <small>
                    Espécie
                </small>

            </div>

        </div>

    `;

}


/* =========================
   LISTA DE TREINADORES
========================= */

function renderTrainerList() {

    const query =
        search.value
            .trim()
            .toLowerCase();


    const filtered =
        trainers.filter(t =>
            t.name
                .toLowerCase()
                .includes(query)
        );


    app.innerHTML = `

        <div class="list">

            ${
                filtered
                    .map(renderTrainerCard)
                    .join("")
            }

        </div>

    `;

}


function renderTrainerCard(t) {

    return `

        <div
            class="card"
            onclick="
                showTrainer('${t.id}')
            "
        >

            <img
                src="${t.sprite}"
                alt="${t.name}"
            >

            <div class="card-info">

                <strong>
                    ${t.name}
                </strong>

                <div>
                    ${t.class}
                </div>

                <div class="stars">

                    ${"★".repeat(t.stars)}

                    ${"☆".repeat(5 - t.stars)}

                </div>

            </div>

        </div>

    `;

}


/* =========================
   LISTA DE MOVIMENTOS
========================= */

function renderMoveList() {

    const query =
        search.value
            .trim()
            .toLowerCase();


    const filtered =
        moves
            .filter(m =>
                m.name
                    .toLowerCase()
                    .includes(query)
            )
            .sort((a, b) =>
                a.name.localeCompare(
                    b.name,
                    "pt-BR"
                )
            );


    app.innerHTML = `

        <div class="list">

            ${
                filtered
                    .map(renderMoveCard)
                    .join("")
            }

        </div>

    `;

}


function renderMoveCard(m) {

    return `

        <div
            class="move-card"
            onclick="
                showMove('${m.id}')
            "
        >

            <h3>
                ${m.name}
                (${m.type})
            </h3>

            <div class="move-meta">

                ${
                    m.mode === "recupera"
                        ? "Recupera"
                        : "Gasta"
                }

                ${m.energy} energia

                |

                ${m.dice}

            </div>

        </div>

    `;

}


/* =========================
   FICHA DE POKÉMON
========================= */

function showPokemon(id) {

    currentView = "pokemon";

    const p =
        getPokemon(id);

    if (!p) return;


    const s =
        getSpecies(p.speciesId);

    const trainer =
        getTrainer(p.trainerId);


    const hp =
        p.stats.constituicao.real * 30;


    app.innerHTML = `

        <div class="detail">

            <button
                class="back"
                onclick="backToList()"
            >
                ← Voltar
            </button>


            <div class="detail-header">

                <img
                    src="${s.sprite}"
                    alt="${s.name}"
                >


                <div>

                    <h1>

                        ${
                            p.nickname ||
                            "Sem apelido"
                        }

                        |

                        ${
                            p.gender ||
                            "—"
                        }

                        |

                        ${s.name}

                    </h1>


                    <p>

                        ID do Treinador:

                        ${
                            trainer
                                ? trainer.id
                                : "—"
                        }

                    </p>


                    <div>

                        ${
                            s.types
                                .map(type =>
                                    `<span
                                        class="type-badge"
                                    >
                                        ${type}
                                    </span>`
                                )
                                .join("")
                        }

                    </div>

                </div>


                ${
                    trainer

                    ?

                    `
                    <img
                        src="${trainer.sprite}"
                        alt="${trainer.name}"
                        title="${trainer.name}"
                        onclick="
                            showTrainer('${trainer.id}')
                        "
                        style="cursor:pointer"
                    >
                    `

                    :

                    `
                    <div></div>
                    `
                }

            </div>


            <div class="section">

                <h2>Informações</h2>

                <p>
                    <strong>Tamanho:</strong>
                    ${s.height} m
                </p>

                <p>
                    <strong>Peso:</strong>
                    ${s.weight} kg
                </p>

                <p>
                    <strong>Pontos de Vida:</strong>
                    ${hp}
                </p>

                <p>
                    <strong>Natureza:</strong>
                    ${p.nature || "—"}
                </p>

            </div>


            <div class="section">

                <h2>Habilidades</h2>

                ${
                    p.abilities
                        .map(id => {

                            const a =
                                getAbility(id);

                            return `

                                <div class="ability">

                                    <div class="ability-name">
                                        ${a.name}
                                    </div>

                                    <div class="ability-description">
                                        ${a.description}
                                    </div>

                                </div>

                            `;

                        })
                        .join("")
                }

            </div>


            <div class="section">

                <h2>Atributos</h2>

                <div class="stats">

                    ${
                        renderRealStats(
                            p.stats
                        )
                    }

                </div>

            </div>


            <div class="section">

                <h2>Ataques</h2>

                ${
                    p.moves
                        .map(renderPokemonMove)
                        .join("")
                }

            </div>

        </div>

    `;

}


/* =========================
   ATRIBUTOS REAIS
========================= */

function renderRealStats(stats) {

    return Object.entries(stats)

        .map(([name, value]) => `

            <div class="stat">

                <div class="stat-name">
                    ${capitalize(name)}
                </div>

                <div class="stat-value">

                    Base:
                    ${value.base}

                    |

                    Real:
                    ${value.real}

                </div>

            </div>

        `)

        .join("");

}


/* =========================
   ATAQUES DO POKÉMON
========================= */

function renderPokemonMove(moveId) {

    const m =
        getMove(moveId);

    return `

        <div class="attack">

            <div class="attack-header">

                <span class="attack-name">

                    ${m.name}

                    (${m.type})

                </span>

                <span class="attack-cost">

                    ${
                        m.mode === "recupera"
                            ? "Recupera"
                            : "Gasta"
                    }

                    ${m.energy}
                    ${
                        m.energy === 1
                            ? "energia"
                            : "energias"
                    }

                </span>

                <span class="attack-dice">

                    ${m.dice}

                </span>

            </div>

            <p class="attack-description">

                ${m.description}

            </p>

        </div>

    `;

}


/* =========================
   FICHA DA ESPÉCIE
========================= */

function showSpecies(id) {

    currentView = "species";

    const s =
        getSpecies(id);

    if (!s) return;


    const speciesPokemon =
        getPokemonBySpecies(id);


    /*
       Apenas Pokémon capturados/
       pertencentes a treinadores
       aparecem na relação.
    */

    const trainerPokemon =
        speciesPokemon.filter(
            p =>
                p.trainerId !== null
        );


    const highest =
        getHighestStats(
            s.baseStats,
            2
        );


    const lowest =
        getLowestStats(
            s.baseStats,
            1
        );


    const visibleStats = [
        ...highest,
        ...lowest
    ];


    app.innerHTML = `

        <div class="detail">

            <button
                class="back"
                onclick="backToList()"
            >
                ← Voltar
            </button>


            <div class="detail-header">

                <img
                    src="${s.sprite}"
                    alt="${s.name}"
                >

                <div>

                    <h1>
                        ${s.name}
                    </h1>

                    <div>

                        ${
                            s.types
                                .map(type =>
                                    `<span
                                        class="type-badge"
                                    >
                                        ${type}
                                    </span>`
                                )
                                .join("")
                        }

                    </div>

                </div>

                <div></div>

            </div>


            <div class="section">

                <h2>Informações</h2>

                <p>
                    <strong>Tamanho:</strong>
                    ${s.height} m
                </p>

                <p>
                    <strong>Peso:</strong>
                    ${s.weight} kg
                </p>

            </div>


            <div class="section">

                <h2>Habilidades</h2>

                ${
                    s.abilities
                        .map(id => {

                            const a =
                                getAbility(id);

                            return `

                                <div class="ability">

                                    <div class="ability-name">
                                        ${a.name}
                                    </div>

                                    <div class="ability-description">
                                        ${a.description}
                                    </div>

                                </div>

                            `;

                        })
                        .join("")
                }

            </div>


            <div class="section">

                <h2>
                    Características conhecidas
                </h2>

                <div class="stats">

                    ${
                        visibleStats
                            .map(
                                ([name, value]) => `

                                <div class="stat">

                                    <div class="stat-name">
                                        ${capitalize(name)}
                                    </div>

                                    <div class="stat-value">
                                        Base: ${value}
                                    </div>

                                </div>

                            `
                            )
                            .join("")
                    }

                </div>

            </div>


            <div class="section">

                <h2>Ataques</h2>

                ${
                    s.moves
                        .map(renderSpeciesMove)
                        .join("")
                }

            </div>


            <div class="section">

                <h2>
                    Treinadores que têm este Pokémon
                </h2>


                <div class="species-trainers">

                    ${
                        trainerPokemon
                            .map(p => {

                                const t =
                                    getTrainer(
                                        p.trainerId
                                    );

                                return `

                                    <div
                                        class="species-trainer"
                                        onclick="
                                            showTrainer(
                                                '${t.id}'
                                            )
                                        "
                                    >

                                        <img
                                            src="${t.sprite}"
                                            alt="${t.name}"
                                        >

                                        <div
                                            class="species-trainer-name"
                                        >
                                            ${t.name}
                                        </div>

                                    </div>

                                `;

                            })
                            .join("")
                    }

                </div>

            </div>

        </div>

    `;

}


/* =========================
   ATAQUES DA ESPÉCIE
========================= */

function renderSpeciesMove(moveId) {

    const m =
        getMove(moveId);

    return `

        <div class="attack">

            <div class="attack-header">

                <span class="attack-name">

                    ${m.name}

                    (${m.type})

                </span>

                <span class="attack-cost">

                    ${
                        m.mode === "recupera"
                            ? "Recupera"
                            : "Gasta"
                    }

                    ${m.energy}
                    ${
                        m.energy === 1
                            ? "energia"
                            : "energias"
                    }

                </span>

                <span class="attack-dice">

                    ${m.dice}

                </span>

            </div>

            <p class="attack-description">

                ${m.description}

            </p>

        </div>

    `;

}


/* =========================
   FICHA DE TREINADOR
========================= */

function showTrainer(id) {

    currentView = "trainer";

    const t =
        getTrainer(id);

    if (!t) return;


    const trainerPokemon =
        getPokemonByTrainer(id);


    app.innerHTML = `

        <div class="detail">

            <button
                class="back"
                onclick="backToList()"
            >
                ← Voltar
            </button>


            <div class="detail-header">

                <img
                    src="${t.sprite}"
                    alt="${t.name}"
                >

                <div>

                    <h1>
                        ${t.name}
                    </h1>

                    <p>
                        <strong>Gênero:</strong>
                        ${t.gender}
                    </p>

                    <p>
                        <strong>Cidade natal:</strong>
                        ${t.hometown || "—"}
                    </p>

                    <p>
                        <strong>Região:</strong>
                        ${t.region}
                    </p>

                    <p>
                        <strong>Classe:</strong>
                        ${t.class}
                    </p>

                    <div class="stars">

                        ${"★".repeat(t.stars)}

                        ${"☆".repeat(5 - t.stars)}

                    </div>

                </div>

                <div></div>

            </div>


            <div class="section">

                <h2>
                    Pokémon Vistos
                </h2>


                <div class="trainer-pokemon">

                    ${
                        trainerPokemon
                            .map(p => {

                                const s =
                                    getSpecies(
                                        p.speciesId
                                    );

                                return `

                                    <div
                                        class="trainer-pokemon-item"
                                        onclick="
                                            showPokemon(
                                                '${p.id}'
                                            )
                                        "
                                    >

                                        <img
                                            src="${s.sprite}"
                                            alt="${s.name}"
                                        >

                                        <div>
                                            ${
                                                p.nickname ||
                                                s.name
                                            }
                                        </div>

                                    </div>

                                `;

                            })
                            .join("")
                    }

                </div>

            </div>

        </div>

    `;

}


/* =========================
   FICHA DE MOVIMENTO
========================= */

function showMove(id) {

    currentView = "move";

    const m =
        getMove(id);

    if (!m) return;


    const users =
        species.filter(s =>
            s.moves.includes(id)
        );


    app.innerHTML = `

        <div class="detail">

            <button
                class="back"
                onclick="backToList()"
            >
                ← Voltar
            </button>


            <h1>

                ${m.name}

                (${m.type})

            </h1>


            <div class="section">

                <p>

                    <strong>
                        Tipo:
                    </strong>

                    ${m.type}

                </p>

                <p>

                    <strong>

                        ${
                            m.mode === "recupera"
                                ? "Recupera"
                                : "Gasta"
                        }

                    </strong>

                    ${m.energy}

                    ${
                        m.energy === 1
                            ? "energia"
                            : "energias"
                    }

                </p>

                <p>

                    <strong>
                        Dados:
                    </strong>

                    ${m.dice}

                </p>

                <p>
                    ${m.description}
                </p>

            </div>


            <div class="section">

                <h2>
                    Pokémon que possuem este movimento
                </h2>


                <div class="list">

                    ${
                        users
                            .map(renderSpeciesCard)
                            .join("")
                    }

                </div>

            </div>

        </div>

    `;

}


/* =========================
   ATRIBUTOS
========================= */

function getHighestStats(stats, amount) {

    return Object.entries(stats)
        .sort(
            (a, b) =>
                b[1] - a[1]
        )
        .slice(0, amount);

}


function getLowestStats(stats, amount) {

    return Object.entries(stats)
        .sort(
            (a, b) =>
                a[1] - b[1]
        )
        .slice(0, amount);

}


/* =========================
   VOLTAR
========================= */

function backToList() {

    currentView = null;

    search.value = "";

    if (currentPage === "pokemon") {

        renderPokemonList();

    }

    else if (
        currentPage === "trainers"
    ) {

        renderTrainerList();

    }

    else {

        renderMoveList();

    }

}


/* =========================
   UTILITÁRIO
========================= */

function capitalize(text) {

    return (
        text.charAt(0).toUpperCase() +
        text.slice(1)
    );

}


/* =========================
   SERVICE WORKER
========================= */

if (
    "serviceWorker" in navigator
) {

    navigator.serviceWorker.register(
        "service-worker.js"
    );

}
