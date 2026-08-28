const CACHE_NAME =
    "rpg-database-v1";


const APP_FILES = [

    "./",

    "./index.html",

    "./style.css",

    "./app.js",

    "./manifest.json",

    "./database/species.json",

    "./database/pokemon.json",

    "./database/trainers.json",

    "./database/moves.json",

    "./database/abilities.json",

    "./database/version.json"

];


/* =========================
   INSTALAÇÃO
========================= */

self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then(cache =>
                    cache.addAll(
                        APP_FILES
                    )
                )

        );

        self.skipWaiting();

    }
);


/* =========================
   ATIVAÇÃO
========================= */

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches
                .keys()
                .then(keys =>

                    Promise.all(

                        keys
                            .filter(
                                key =>
                                    key !==
                                    CACHE_NAME
                            )

                            .map(
                                key =>
                                    caches.delete(
                                        key
                                    )
                            )

                    )

                )

        );

        self.clients.claim();

    }
);


/* =========================
   REQUISIÇÕES
========================= */

self.addEventListener(
    "fetch",
    event => {

        event.respondWith(

            caches
                .match(
                    event.request
                )

                .then(cachedResponse => {

                    if (
                        cachedResponse
                    ) {

                        return cachedResponse;

                    }


                    return fetch(
                        event.request
                    )

                    .then(response => {

                        if (
                            !response ||
                            response.status !== 200
                        ) {

                            return response;

                        }


                        const clone =
                            response.clone();


                        caches
                            .open(
                                CACHE_NAME
                            )
                            .then(cache => {

                                cache.put(
                                    event.request,
                                    clone
                                );

                            });


                        return response;

                    });

                })

        );

    }
);
