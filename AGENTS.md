# AGENTS.md

## Projet
Prototype RPG 2D top-down (style Akira Toriyama) en Phaser 3.55.2 et JS vanilla, sans build. `index.html` charge Phaser depuis le CDN jsDelivr, puis les scripts de `src/` dans un ordre explicite, avant `main.js`.

- Pas de bundler, linter, formatter, typecheck ni CI : `npm test` est la seule vérification automatisée.
- `package.json` n'a aucune dépendance : `node_modules` n'est pas requis pour les tests. Le CDN Phaser et `npx serve` nécessitent le réseau.
- `main.js` : config Phaser 800×600, Arcade physics, `pixelArt: true`, scènes World/Battle/UI/HUD.

## Commandes
- `npm start` : `npx serve -l 3000` → http://localhost:3000. Pas de hot reload : recharger le navigateur.
- `npm test` : 165 tests headless (5 GameManager + 52 régression 2.5D + 93 E2E + 15 Itération 1 & multi-périphérique), sans navigateur.
- Suite ciblée : `node tests/test_25d_suite.js`, `node tests/test_e2e_suite.js` ou `node tests/test_iteration1_suite.js`.
- Les logs `Sauvegarde ignorée (pas de consentement RGPD)` sont normaux ; se fier au résumé final et au code de sortie.
- `tests/run_tests.js` code en dur les totaux 52, 93 et 15 : les mettre à jour si des tests sont ajoutés.

## Contraintes browser/Node (important)
- Pas d'ESM (`import`/`export`). Chaque fichier de `src/` est un script classique exposant des globals (`GameConfig`, `MapsData`, `Player`, `Enemy`, `WorldScene`, `OcclusionManager`, etc.).
- Toute nouvelle scène/classe doit être ajoutée à `index.html` (avant `main.js`) **et** branchée dans `tests/helpers/HeadlessPhaser.js` (`setupHeadlessEnvironment`) sous le nom exact attendu, sinon les tests ne la voient pas.
- Le harness Node évalue maps/classes/scènes via `new Function(source + '; return X;')` avec des mocks Phaser/localStorage/document. Garder les classes au niveau du fichier ; `require` n'y est pas disponible.
- `config.js`, `assets.js` et `GameManager.js` utilisent le guard `if (typeof module !== 'undefined' && module.exports)` pour Node : préserver ce dual browser/CommonJS.
- La sauvegarde est conditionnée au consentement RGPD (`localStorage.rpg_save_consent === 'true'`). Sans consentement, `gameState.save()` ne fait rien silencieusement.

## Architecture
- `WorldScene` : exploration, génération procédurale des textures 2.5D, collisions, interactions, tutoriel. Fichier volumineux ; porte aussi le Y-sorting et l'occlusion.
- `BattleScene` : combat au tour par tour, lancé comme scène séparée et surmonté de `UIScene`.
- `HUDScene` : overlay persistant (inventaire `I`, quêtes `J`, craft `K`, personnage `C`) ; met `WorldScene` en pause et la reprend.
- `GameManager` (`window.gameState`) : état joueur, inventaire, quêtes, craft, level up, sauvegarde.
- `AudioManager` (`window.audioManager`) : sons synthétisés via Web Audio, aucun fichier audio.

## Cartes et assets
- `src/maps/maps.js` : `MapsData[nom]` avec `layoutText` (lignes de caractères) et `tileSize: 64`. Le README parle encore de tableaux numériques : le code fait foi.
- Glyphes traités dans `WorldScene.create()` : `T`/`t` arbres, `C` falaise, `H` maison, `R` ruine, `r` rocher, `b` buisson, `o` coffre, `>` panneau, `x` clôture, `S` spawn, `N` PNJ, `E` ennemi, `W`/`B` eau/pont, `d` chemin, `f`/`w` sol/mur intérieur. Un nouveau glyphe exige rendu **et** collision.
- `src/data/assets.js` : manifeste (`ASSET_MANIFEST`), alias legacy et `preloadSceneAssets`. Assets découpés depuis `assets/collection.webp` / `planche_2.webp` par `scripts/slice_assets.py` (Pillow requis, chemins Windows en dur vers Downloads).
- `remove_bg.py` réécrit les PNG en place : ne l'exécuter que volontairement.
- Les tests E2E verrouillent `assets/collection.webp` à exactement 1 422 058 octets et l'existence des assets de base : re-encoder/déplacer les assets casse la suite.

## Contrôles et conventions
- UI et commentaires en français ; contrôles Clavier (`ZQSD`/`WASD`/Flèches), Souris (visée + clic gauche/droit) et Manette via `InputManager` (`src/managers/InputManager.js`) ; `Maj`/`RB` courir, `Clic`/`Espace`/`X` attaquer, `E`/`A` interagir, `M`/`Select` carte, `Échap`/`B` fermer.
- Le README annonce `C` pour le craft : le code utilise `K` (craft) et `C` (personnage).
- `index.html` porte la modale RGPD et `window.announce()` (aria-live) ; conserver ces comportements, couverts par les tests E2E.

## Commits atomiques (obligatoire)
- Toujours découper les changements en **commits atomiques** : 1 commit = 1 responsabilité logique cohérente et autonome (un système, une correction visuelle, une ressource/recette, une suite de tests, ou la documentation).
- Ne jamais mélanger plusieurs fonctionnalités indépendantes, du refactoring non lié et de nouveaux assets dans un même commit.
- Utiliser des messages Conventional Commits concis et explicites : `feat(<scope>): ...`, `fix(<scope>): ...`, `art(<scope>): ...`, `refactor(<scope>): ...`, `test(<scope>): ...`, `docs(<scope>): ...`.
- Vérifier que `npm test` passe avant de conclure une série de commits atomiques.
