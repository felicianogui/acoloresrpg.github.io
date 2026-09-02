/* RPG DATABASE — EDITOR */

"use strict";

const DATABASE_FILES = {
    species: "database/species.json",
    pokemon: "database/pokemon.json",
    trainers: "database/trainers.json",
    moves: "database/moves.json",
    abilities: "database/abilities.json"
};

const ENTITY_LABELS = {
    species: "Espécies",
    pokemon: "Pokémon",
    trainers: "Treinadores",
    moves: "Movimentos",
    abilities: "Habilidades"
};

const ENTITY_PREFIXES = {
    species: "species",
    pokemon: "pokemon",
    trainers: "trainer",
    moves: "move",
    abilities: "ability"
};

const REGIONAL_VARIATIONS = [
    "de Kanto",
    "de Johto",
    "de Hoenn",
    "de Sinnoh",
    "de Unova",
    "de Kalos",
    "de Alola",
    "de Galar",
    "de Hisui",
    "de Paldea",
    "de Acolores"
];

const REQUEST_TIMEOUT = 10000;

const STAT_FIELDS = [
    ["agility", "Agilidade"],
    ["strength", "Força"],
    ["constitution", "Constituição"],
    ["attention", "Atenção"],
    ["determination", "Determinação"],
    ["kindness", "Gentileza"],
    ["luck", "Sorte"]
];

let database = {
    species: [],
    pokemon: [],
    trainers: [],
    moves: [],
    abilities: []
};

let currentEditorPage = "pokemon";
let editingId = null;
let editorApp = null;
let exportButton = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
    editorApp = document.getElementById("editor-app");

    if (!editorApp) return;

    setupNavigation();
    setupExportButton();

    editorApp.innerHTML = `
        <div class="editor-panel">
            <h2>Carregando editor...</h2>
            <p>Carregando os arquivos da database.</p>
        </div>
    `;

    await loadDatabase();
}

async function loadJSON(path) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetch(path, {
            cache: "no-store",
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(`Erro ${response.status} ao carregar ${path}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error(`${path} deve conter um array JSON`);
        }

        return data;
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(`Tempo limite excedido ao carregar ${path}.`);
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

async function loadDatabase() {
    try {
        const entries = await Promise.all(
            Object.entries(DATABASE_FILES).map(async ([key, path]) => {
                return [key, await loadJSON(path)];
            })
        );

        entries.forEach(([key, data]) => {
            database[key] = data;
        });

        renderEditor();
    } catch (error) {
        console.error(error);

        editorApp.innerHTML = `
            <div class="editor-panel">
                <h2>Erro ao carregar database</h2>
                <p>${escapeHTML(error.message)}</p>
                <p>
                    Confirme se o Live Server está ativo e se a pasta
                    <strong>database</strong> contém os arquivos JSON.
                </p>
            </div>
        `;
    }
}

function setupNavigation() {
    document.querySelectorAll("[data-editor-page]").forEach(button => {
        button.addEventListener("click", () => {
            const page = button.dataset.editorPage;

            if (!DATABASE_FILES[page]) return;

            currentEditorPage = page;
            editingId = null;

            document
                .querySelectorAll("[data-editor-page]")
                .forEach(item => item.classList.remove("active"));

            button.classList.add("active");
            renderEditor();
        });
    });
}

function setupExportButton() {
    exportButton = document.getElementById("export-database");

    if (!exportButton) return;

    exportButton.addEventListener("click", exportDatabase);
}

function renderEditor() {
    const items = database[currentEditorPage];
    const editing = items.find(item => item.id === editingId) || null;
    const label = ENTITY_LABELS[currentEditorPage];

    editorApp.innerHTML = `
        <div class="editor-panel">
            <h2>${escapeHTML(label)}</h2>

            <div class="search-editor">
                <input
                    type="search"
                    id="editor-search"
                    placeholder="Pesquisar ${label.toLowerCase()}..."
                    autocomplete="off"
                >
            </div>

            <div id="editor-list" class="item-list"></div>
        </div>

        <div class="editor-panel">
            <h2>${editing ? "Editar" : "Cadastrar"} ${escapeHTML(label)}</h2>
            ${renderForm(currentEditorPage, editing)}
        </div>
    `;

    renderList();

    document
        .getElementById("editor-search")
        ?.addEventListener("input", renderList);

    document
        .getElementById("friendly-form")
        ?.addEventListener("submit", event => {
            event.preventDefault();
            saveCurrentItem();
        });

    document
        .getElementById("cancel-form")
        ?.addEventListener("click", cancelEditing);

    document
        .getElementById("field-speciesId")
        ?.addEventListener("change", renderSpeciesPreview);

    document
        .getElementById("field-status")
        ?.addEventListener("change", updateMoveLimitMessage);

    document
        .getElementById("field-hatchedFromEgg")
        ?.addEventListener("change", updateMoveLimitMessage);

    renderSpeciesPreview();
    updateMoveLimitMessage();
}

function renderList() {
    const container = document.getElementById("editor-list");
    const search = document.getElementById("editor-search");

    if (!container || !search) return;

    const query = search.value.trim().toLowerCase();

    const items = database[currentEditorPage]
        .filter(item =>
            JSON.stringify(item).toLowerCase().includes(query)
        )
        .sort((a, b) =>
            getItemName(a).localeCompare(getItemName(b), "pt-BR")
        );

    if (!items.length) {
        container.innerHTML = "<p>Nenhum registro encontrado.</p>";
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="item">
            <span>
                <strong>${escapeHTML(getItemName(item))}</strong>
                <small> — ${escapeHTML(item.id || "")}</small>
            </span>

            <div>
                <button type="button" data-action="edit"
                    data-id="${escapeHTML(item.id)}">Editar</button>

                <button type="button" data-action="duplicate"
                    data-id="${escapeHTML(item.id)}">Duplicar</button>

                <button type="button" data-action="delete"
                    data-id="${escapeHTML(item.id)}">Excluir</button>
            </div>
        </div>
    `).join("");

    container.querySelectorAll("button[data-action]").forEach(button => {
        button.addEventListener("click", () => {
            const action = button.dataset.action;
            const id = button.dataset.id;

            if (action === "edit") editItem(id);
            if (action === "duplicate") duplicateItem(id);
            if (action === "delete") deleteItem(id);
        });
    });
}

function renderForm(type, item) {
    const value = item || defaultRecord(type);
    const fields = getFields(type);

    return `
        <form id="friendly-form">
            <div class="form-grid">
                ${fields.map(field => renderField(field, value)).join("")}
            </div>

            ${type === "pokemon" ? `
                <div id="species-preview" class="reference-preview"></div>
                <p id="move-limit-message" class="form-hint"></p>
            ` : ""}

            <div class="actions">
                <button type="submit" class="primary">Salvar</button>
                <button type="button" class="secondary" id="cancel-form">
                    Cancelar
                </button>
            </div>
        </form>
    `;
}

function getFields(type) {
    const references = {
        species: {
            name: "speciesId",
            type: "reference",
            label: "Espécie",
            source: "species"
        },
        trainerId: {
            name: "trainerId",
            type: "reference",
            label: "Treinador",
            source: "trainers",
            nullable: true
        },
        abilities: {
            name: "abilities",
            type: "multi-reference",
            label: "Habilidades",
            source: "abilities",
            max: 2
        },
        moves: {
            name: "moves",
            type: "multi-reference",
            label: "Movimentos",
            source: "moves"
        }
    };

    const regionalVariationField = {
        name: "regionalVariation",
        label: "Variação regional",
        type: "select",
        options: REGIONAL_VARIATIONS,
        nullable: true
    };

    const definitions = {
        species: [
            { name: "nationalId", label: "Número Nacional", type: "number" },
            { name: "name", label: "Nome", type: "text", required: true },
            regionalVariationField,
            { name: "sprite", label: "URL ou caminho do sprite", type: "url" },
            { name: "types", label: "Tipos", type: "tags" },
            { name: "height", label: "Altura", type: "number", step: "0.1" },
            { name: "weight", label: "Peso", type: "number", step: "0.1" },
            references.abilities,
            {
                name: "baseStats",
                type: "stats",
                label: "Atributos-base"
            },
            {
                ...references.moves,
                max: null
            }
        ],

        pokemon: [
            references.species,
            regionalVariationField,
            {
                name: "status",
                label: "Situação",
                type: "select",
                options: ["capturado", "visto", "derrotado"]
            },
            {
                name: "hatchedFromEgg",
                label: "Chocado de ovo?",
                type: "checkbox"
            },
            { name: "nickname", label: "Apelido", type: "text" },
            {
                name: "gender",
                label: "Gênero",
                type: "select",
                options: ["Desconhecido", "Macho", "Fêmea"]
            },
            references.trainerId,
            { name: "nature", label: "Natureza", type: "text" },
            { name: "sprite", label: "URL ou caminho do sprite", type: "url" },
            {
                name: "baseStats",
                type: "stats",
                label: "Atributos-base"
            },
            {
                name: "realStats",
                type: "stats",
                label: "Atributos reais"
            },
            references.abilities,
            {
                ...references.moves,
                max: 7
            }
        ],

        trainers: [
            { name: "name", label: "Nome", type: "text", required: true },
            {
                name: "gender",
                label: "Gênero",
                type: "select",
                options: ["Não especificado", "Macho", "Fêmea"]
            },
            { name: "hometown", label: "Cidade Natal", type: "text" },
            { name: "region", label: "Região de origem", type: "text" },
            {
                name: "category",
                label: "Categoria",
                type: "select",
                options: ["NPC", "Veterano", "Rival", "Jogador", "Ameaça"]
            },
            { name: "class", label: "Classe de treinador", type: "text" },
            {
                name: "stars",
                label: "Classificação — 0 a 5 estrelas",
                type: "number",
                min: 0,
                max: 5
            },
            { name: "sprite", label: "URL ou caminho do sprite", type: "url" }
        ],

                moves: [
            { name: "name", label: "Nome", type: "text", required: true },

            { name: "type", label: "Tipo", type: "text" },

            {
                name: "mode",
                label: "Custo ou recuperação",
                type: "select",
                options: ["gasta", "recupera"]
            },

            {
                name: "energy",
                label: "Quantidade de energia",
                type: "number"
            },

            {
                name: "diceCount",
                label: "Quantidade de dados",
                type: "select",
                options: ["1", "2", "3", "4", "5", "6"]
            },

            {
                name: "diceType",
                label: "Tipo de dado",
                type: "select",
                options: ["d6", "d20"]
            },

            {
                name: "diceModifier",
                label: "Modificador",
                type: "select",
                options: [
                    "Agilidade",
                    "Força",
                    "Constituição",
                    "Atenção",
                    "Determinação",
                    "Gentileza",
                    "Sorte"
                ]
            },

            {
                name: "description",
                label: "Descrição",
                type: "textarea"
            }
        ],
    };

    return definitions[type];
}

function renderField(field, item) {
    if (field.type === "stats") {
        const stats = item[field.name] || {};

        return `
            <fieldset class="field">
                <legend>${escapeHTML(field.label)}</legend>
                <div class="stats-grid">
                    ${STAT_FIELDS.map(([key, label]) => `
                        <div class="stat-editor">
                            <label for="${field.name}-${key}">${label}</label>
                            <input
                                id="${field.name}-${key}"
                                name="${field.name}-${key}"
                                type="number"
                                min="0"
                                value="${escapeHTML(stats[key] ?? 0)}"
                            >
                        </div>
                    `).join("")}
                </div>

                ${field.name === "realStats" ? `
                    <p class="form-hint">
                        PV calculado:
                        <strong>${Number(stats.constitution || 0) * 30}</strong>
                    </p>
                ` : ""}
            </fieldset>
        `;
    }

    const value = item[field.name];

    if (field.type === "reference" || field.type === "multi-reference") {
        const selected = field.type === "multi-reference"
            ? (Array.isArray(value) ? value : [])
            : [value];

        const options = database[field.source]
            .slice()
            .sort((a, b) =>
                getItemName(a).localeCompare(getItemName(b), "pt-BR")
            )
            .map(reference => `
                <option
                    value="${escapeHTML(reference.id)}"
                    ${selected.includes(reference.id) ? "selected" : ""}
                >
                    ${escapeHTML(getItemName(reference))}
                </option>
            `).join("");

        return `
            <div class="field">
                <label for="field-${field.name}">
                    ${escapeHTML(field.label)}
                </label>

                <select
                    id="field-${field.name}"
                    name="${field.name}"
                    ${field.type === "multi-reference"
                        ? "multiple size=\"6\"" : ""}
                >
                    ${field.type === "reference" && field.nullable
                        ? `<option value="">Nenhum</option>` : ""}
                    ${options}
                </select>

                ${field.type === "multi-reference" && field.max
                    ? `<small>Máximo: ${field.max} itens.</small>` : ""}
            </div>
        `;
    }

    if (field.type === "select") {
        return `
            <div class="field">
                <label for="field-${field.name}">
                    ${escapeHTML(field.label)}
                </label>

                <select id="field-${field.name}" name="${field.name}">
                    ${field.nullable
                        ? `<option value="">Nenhuma</option>` : ""}
                    ${field.options.map(option => `
                        <option
                            value="${escapeHTML(option)}"
                            ${value === option ? "selected" : ""}
                        >
                            ${escapeHTML(option)}
                        </option>
                    `).join("")}
                </select>
            </div>
        `;
    }

    if (field.type === "checkbox") {
        return `
            <div class="field">
                <label>
                    <input
                        id="field-${field.name}"
                        name="${field.name}"
                        type="checkbox"
                        ${value === true ? "checked" : ""}
                    >
                    ${escapeHTML(field.label)}
                </label>
            </div>
        `;
    }

    if (field.type === "tags") {
        return `
            <div class="field">
                <label for="field-${field.name}">
                    ${escapeHTML(field.label)}
                </label>

                <input
                    id="field-${field.name}"
                    name="${field.name}"
                    type="text"
                    value="${escapeHTML(
                        Array.isArray(value) ? value.join(", ") : ""
                    )}"
                    placeholder="Ex.: Fogo, Voador"
                >

                <small>Separe os valores por vírgulas.</small>
            </div>
        `;
    }

    const isImagePath = field.type === "url";

    return `
        <div class="field">
            <label for="field-${field.name}">
                ${escapeHTML(field.label)}
            </label>

            ${field.type === "textarea"
                ? `<textarea
                    id="field-${field.name}"
                    name="${field.name}"
                    rows="4"
                >${escapeHTML(value ?? "")}</textarea>`
                : `<input
                    id="field-${field.name}"
                    name="${field.name}"
                    type="${isImagePath ? "text" : field.type}"
                    value="${escapeHTML(value ?? "")}"
                    ${isImagePath
                        ? `placeholder="Ex.: editor/images/shiro.png ou https://site.com/imagem.png"`
                        : ""}
                    ${field.step ? `step="${field.step}"` : ""}
                    ${field.min !== undefined ? `min="${field.min}"` : ""}
                    ${field.max !== undefined ? `max="${field.max}"` : ""}
                    ${field.required ? "required" : ""}
                >`
            }

            ${isImagePath ? `
                <small>
                    Use um caminho relativo, como
                    <strong>editor/images/shiro.png</strong>
                    ou <strong>images/shiro.png</strong>.
                </small>
            ` : ""}
        </div>
    `;
}

function saveCurrentItem() {
    const form = document.getElementById("friendly-form");
    if (!form) return;

    const formData = new FormData(form);
    const existing = database[currentEditorPage]
        .find(item => item.id === editingId);

    const item = existing
        ? JSON.parse(JSON.stringify(existing))
        : defaultRecord(currentEditorPage);

    const fields = getFields(currentEditorPage);

    fields.forEach(field => {
        if (field.type === "stats") {
            const stats = {};

            STAT_FIELDS.forEach(([key]) => {
                stats[key] = Number(
                    formData.get(`${field.name}-${key}`)
                ) || 0;
            });

            item[field.name] = stats;
            return;
        }

        if (field.type === "multi-reference") {
            let values = formData.getAll(field.name);

            if (field.max) {
                values = values.slice(0, field.max);
            }

            item[field.name] = values;
            return;
        }

        if (field.type === "checkbox") {
            item[field.name] = formData.get(field.name) === "on";
            return;
        }

        if (field.type === "tags") {
            item[field.name] = String(formData.get(field.name) || "")
                .split(",")
                .map(value => value.trim())
                .filter(Boolean);
            return;
        }

        if (field.type === "number") {
            const raw = formData.get(field.name);
            item[field.name] = raw === "" ? null : Number(raw);
            return;
        }

        if (field.type === "reference") {
            const raw = formData.get(field.name);
            item[field.name] = raw || null;
            return;
        }

        const raw = formData.get(field.name) || "";

        item[field.name] = field.type === "url"
            ? normalizeImagePath(raw)
            : raw;
    });

    if (currentEditorPage === "pokemon") {
        const moveLimit = getPokemonMoveLimit(
            item.status,
            item.hatchedFromEgg
        );

        item.moves = (item.moves || []).slice(0, moveLimit);

        if (item.status !== "capturado") {
            item.hatchedFromEgg = false;
            delete item.realStats;
        }
    }

    if (currentEditorPage === "trainers") {
        item.stars = Math.max(0, Math.min(5, Number(item.stars) || 0));
    }

    if (!item.id) {
        item.id = editingId ||
            generateId(ENTITY_PREFIXES[currentEditorPage]);
    }

    const items = database[currentEditorPage];
    const index = items.findIndex(existingItem => existingItem.id === item.id);

    if (index >= 0) {
        items[index] = item;
    } else {
        items.push(item);
    }

    editingId = null;
    renderEditor();
}

function normalizeImagePath(value) {
    const path = String(value || "").trim();

    if (!path) return "";

    if (/^(https?:|data:|blob:)/i.test(path)) {
        return path;
    }

    let normalized = path
        .replace(/\\/g, "/")
        .replace(/^file:\/+/i, "")
        .replace(/^\/+/, "");

    const lowerPath = normalized.toLowerCase();

    const editorImagesIndex = lowerPath.indexOf("editor/images/");

    if (editorImagesIndex >= 0) {
        return normalized.slice(editorImagesIndex);
    }

    const imagesIndex = lowerPath.indexOf("images/");

    if (imagesIndex >= 0) {
        return normalized.slice(imagesIndex);
    }

    return normalized.replace(/^(\.\/)+/, "");
}

function defaultRecord(type) {
    const emptyStats = Object.fromEntries(
        STAT_FIELDS.map(([key]) => [key, 0])
    );

    return {
        id: generateId(ENTITY_PREFIXES[type]),

        ...(type === "species" && {
            nationalId: null,
            name: "",
            regionalVariation: "",
            sprite: "",
            types: [],
            height: 0,
            weight: 0,
            abilities: [],
            baseStats: { ...emptyStats },
            moves: []
        }),

        ...(type === "pokemon" && {
            speciesId: "",
            regionalVariation: "",
            status: "capturado",
            hatchedFromEgg: false,
            nickname: "",
            gender: "Desconhecido",
            trainerId: null,
            nature: "",
            sprite: "",
            baseStats: { ...emptyStats },
            realStats: { ...emptyStats },
            abilities: [],
            moves: []
        }),

        ...(type === "trainers" && {
            name: "",
            gender: "Não especificado",
            hometown: "",
            region: "",
            category: "NPC",
            class: "",
            stars: 0,
            sprite: "",
            pokemon: []
        }),

        ...(type === "moves" && {
            name: "",
            type: "",
            mode: "gasta",
            energy: 1,
            diceCount: "1",
            diceType: "d6",
            diceModifier: "Agilidade",
            description: ""
        }),

        ...(type === "abilities" && {
            name: "",
            description: ""
        })
    };
}

function renderSpeciesPreview() {
    const preview = document.getElementById("species-preview");
    const select = document.getElementById("field-speciesId");

    if (!preview || !select) return;

    const species = database.species.find(
        item => item.id === select.value
    );

    if (!species) {
        preview.innerHTML = `
            <p class="form-hint">
                Selecione uma espécie para consultar seus dados-base.
            </p>
        `;
        return;
    }

    const types = Array.isArray(species.types)
        ? species.types.join(", ")
        : "Não informado";

    preview.innerHTML = `
        <h3>Dados reutilizados da espécie</h3>
        <p>
            <strong>${escapeHTML(species.name)}</strong>
            ${species.regionalVariation
                ? `(${escapeHTML(species.regionalVariation)})` : ""}
            — Tipos: ${escapeHTML(types)}
        </p>
        <p>
            Altura: ${escapeHTML(species.height ?? 0)}
            | Peso: ${escapeHTML(species.weight ?? 0)}
        </p>
        <p class="form-hint">
            Os dados gerais permanecem em species.json e são referenciados
            pelo ID da espécie.
        </p>
    `;
}

function updateMoveLimitMessage() {
    const message = document.getElementById("move-limit-message");
    const status = document.getElementById("field-status");
    const hatchedFromEgg = document.getElementById("field-hatchedFromEgg");

    if (!message || !status) return;

    const limit = getPokemonMoveLimit(
        status.value,
        hatchedFromEgg?.checked === true
    );

    message.textContent = `Este registro pode possuir até ${limit} movimentos.`;
}

function getPokemonMoveLimit(status, hatchedFromEgg = false) {
    if (status !== "capturado") return 3;
    return hatchedFromEgg ? 7 : 6;
}

function editItem(id) {
    if (!database[currentEditorPage].some(item => item.id === id)) return;

    editingId = id;
    renderEditor();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function duplicateItem(id) {
    const original = database[currentEditorPage]
        .find(item => item.id === id);

    if (!original) return;

    const copy = JSON.parse(JSON.stringify(original));
    copy.id = generateId(ENTITY_PREFIXES[currentEditorPage]);

    if (typeof copy.name === "string") {
        copy.name += " (cópia)";
    } else if (typeof copy.nickname === "string") {
        copy.nickname += " (cópia)";
    }

    database[currentEditorPage].push(copy);
    renderList();
}

function deleteItem(id) {
    const items = database[currentEditorPage];
    const item = items.find(existing => existing.id === id);

    if (!item || !confirm(`Excluir ${getItemName(item)}?`)) return;

    database[currentEditorPage] = items.filter(
        existing => existing.id !== id
    );

    if (editingId === id) {
        editingId = null;
        renderEditor();
    } else {
        renderList();
    }
}

function cancelEditing() {
    editingId = null;
    renderEditor();
}

function getItemName(item) {
    if (typeof item.name === "string" && item.name.trim()) {
        return item.name;
    }

    if (typeof item.nickname === "string" && item.nickname.trim()) {
        return item.nickname;
    }

    return item.id || "Registro sem nome";
}

function generateId(prefix) {
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function downloadJSON(filename, data) {
    const blob = new Blob(
        [JSON.stringify(data, null, 4)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 100);
}

function exportDatabase() {
    Object.entries(database).forEach(([key, data], index) => {
        setTimeout(() => downloadJSON(`${key}.json`, data), index * 300);
    });

    alert("Os cinco arquivos JSON foram exportados.");
}