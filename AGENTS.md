# AGENTS.md

## Projet
Prototype d'action-RPG 2D en vue de dessus (style Akira Toriyama) avec Phaser 3.55.2 et JavaScript vanilla, sans build. `index.html` charge Phaser depuis le CDN jsDelivr, puis les scripts de `src/` dans un ordre explicite, avant `main.js`.

- Pas de bundler, linter, formatter ni typecheck : `npm test` et `npm run test:e2e` sont les vérifications automatisées.
- `package.json` n'a aucune dépendance : `node_modules` n'est pas requis pour les tests Node. Le CDN Phaser et `npx serve` demandent le réseau.
- `main.js` : config Phaser 800×600, Arcade physics, `pixelArt: true`, scènes World/Battle/UI/HUD.

## Commandes
- `npm start` : `npx serve -l 3000` → http://localhost:3000. Pas de hot reload : recharger le navigateur.
- `npm test` : 67 succès (5 tests GameManager + 62 contrôles 2.5D), sans navigateur.
- Suite ciblée : `node tests/test_25d_suite.js`.
- `npm run test:e2e` : Playwright + Python, sert le dépôt sur un port libre et pilote `tests/play_village.py`. Prérequis : `python -m pip install playwright` et un Chromium (`CHROMIUM_PATH`, sinon Edge ou Chrome installé).
- Les logs `Sauvegarde ignorée (pas de consentement RGPD)` sont normaux ; se fier au résumé final et au code de sortie.

## Contraintes browser/Node (important)
- Pas d'ESM (`import`/`export`). Chaque fichier de `src/` est un script classique exposant des globals (`GameConfig`, `MapsData`, `Player`, `Enemy`, `WorldScene`, `OcclusionManager`, etc.).
- Toute nouvelle scène/classe doit être ajoutée à `index.html` (avant `main.js`) **et** chargée par `tests/test_25d_suite.js` si elle doit être testée en Node (le harness évalue les sources avec `new Function(source + '; return X;')` et des mocks Phaser/localStorage/document).
- `config.js`, `GameManager.js` utilisent le guard `if (typeof module !== 'undefined' && module.exports)` pour Node : préserver ce dual browser/CommonJS.
- La sauvegarde est conditionnée au consentement RGPD (`localStorage.rpg_save_consent === 'true'`). Sans consentement, `gameState.save()` ne fait rien silencieusement.

## Architecture
- `WorldScene` : exploration, génération procédurale des textures 2.5D, collisions, interactions, tutoriel, Y-sorting, occlusion, retour sensoriel (`addShadow`, `hitStop`, `floatText`, `leafBurst`).
- `BattleScene` / `UIScene` : combat tour par tour et écran de combat, réservés à un futur boss ; `WorldScene.startBossBattle` n'est pas encore appelé.
- `HUDScene` : overlay persistant (inventaire `I`, quêtes `J`, atelier `C`), cadres pixel, portrait de dialogue, pulsation des PV bas ; met `WorldScene` en pause et la reprend.
- `GameManager` (`window.gameState`) : état joueur, inventaire, quêtes, craft, level up, `cutBushes`, sauvegarde versionnée (`SAVE_VERSION = 2`).
- `AudioManager` (`window.audioManager`) : sons synthétisés via Web Audio (`swing`, `hit`, `hurt`, `bush`, `chest`, `collect`, `levelup`), aucun fichier audio.

## Cartes et assets
- `src/maps/maps.js` : `MapsData[nom]` avec `layoutText` (lignes de caractères) et `tileSize: 64`.
- Glyphes traités dans `WorldScene.create()` : `T`/`t` arbres, `C` falaise, `H` maison, `R` ruine, `r` rocher, `b` buisson, `o` coffre, `>` panneau, `x` clôture, `S` spawn, `N` PNJ, `E` ennemi, `W`/`B` eau/pont, `d` chemin, `f`/`w` sol/mur intérieur. Un nouveau glyphe exige rendu **et** collision.
- Les textures 2.5D (buisson, falaise, maison, ruine, coffre, PNJ, feuille) sont générées par `WorldScene.generateTextures`, pas par des fichiers.
- `assets/village/` : `toya-walk.png` (12 poses 32×48), `saule.png`, `gardien.png`.
- `assets/ui/toya-portrait.png` : portrait de dialogue 96×96 détouré, produit par `scripts/pixelate_asset.py` (Pillow) depuis une image générée.
- Les tests verrouillent des noms de fichiers et des dimensions ; ne pas déplacer/renommer les assets sans mettre à jour `index.html`, `preload()` et les tests.

## Contrôles et conventions
- UI, commentaires et documentation en français ; contrôles ZQSD (AZERTY) + flèches, `Maj` courir, `Espace` attaquer, `E` interagir, `Échap` fermer.
- Menus : `I` inventaire, `J` quêtes, `C` atelier (le README historique parle de craft sur `C`, cohérent avec ce dépôt).
- `index.html` porte la modale RGPD et `window.announce()` (aria-live) ; conserver ces comportements.
- Toute modification de gameplay doit rester couverte : ajouter un contrôle dans `tests/test_25d_suite.js` et mettre à jour les totaux cités dans `README.md` et `GAME_FEEL_REFERENCE.md`.
