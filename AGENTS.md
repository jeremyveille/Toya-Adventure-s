# AGENTS.md

## Résumé du Projet
Un prototype de jeu RPG 2D en vue de dessus, développé pour le navigateur web. Il s'inspire du style d'Akira Toriyama. Le jeu permet de se déplacer sur une carte, d'interagir et potentiellement de combattre (système au tour par tour ou en temps réel). 

## Stack Technique
- **Langages** : HTML5, CSS3, JavaScript (Vanilla ES6)
- **Moteur de jeu** : Phaser.js (v3.55.2, chargé via CDN)
- **Gestionnaire de paquets / Serveur local** : npm / `serve` (via npx)
- **Outils de Build / Lint / Test** : Aucun outil de build complexe (Webpack, Vite, etc.) ni de framework de test ou linter configurés pour l'instant.

## Structure du Dépôt
- `index.html` : Point d'entrée de l'application. Charge le moteur Phaser et tous les scripts JS.
- `main.js` : Configuration principale de Phaser et point de démarrage du jeu.
- `package.json` : Contient le script pour lancer le serveur de développement.
- `assets/` : Dossier contenant les ressources graphiques (spritesheets, tilesets, images).
- `src/` : Code source organisé par domaine :
  - `classes/` : Classes des entités du jeu (`Player.js`, `Enemy.js`).
  - `managers/` : Scripts de gestion globale (`GameManager.js`).
  - `maps/` : Définition des niveaux/cartes sous forme de tableaux (`maps.js`).
  - `scenes/` : Différentes scènes du jeu Phaser (`WorldScene.js`, `BattleScene.js`, `UIScene.js`, `HUDScene.js`).

## Commandes Utiles
- **Démarrer le jeu localement** : `npm start` (lance `npx serve -l 3000`). L'application sera accessible sur `http://localhost:3000`.

## Conventions du Codebase
- **Architecture Phaser** : Le jeu utilise le système de Scènes de Phaser 3 pour séparer la logique (Monde, Combat, UI).
- **Pixel Art** : Le paramètre `pixelArt: true` est activé dans `main.js` pour conserver la netteté des assets 16-bit.
- **Injections HTML** : L'ajout de nouveaux scripts nécessite de les déclarer manuellement dans `<head>` ou `<body>` de `index.html`.

## Règles à respecter pour modifier le projet
- Ne pas supprimer de fonctionnalités existantes (déplacements, collisions, etc.) sans raison valable.
- Conserver le style architectural actuel basé sur les scènes et classes d'entités Phaser.
- Toute nouvelle classe ou scène JavaScript doit être importée manuellement dans `index.html`.
- Ne pas masquer les erreurs, mais les corriger en profondeur (logs console, hitbox, etc.).

## Points d'attention pour les futurs agents
- Le jeu dépend fortement des assets graphiques situés dans `/assets`. Attention aux tailles et frames des spritesheets lors des animations.
- L'état du jeu (`gameState`) semble utiliser un objet global `window.gameState`. À vérifier et maintenir pour la sauvegarde.
- Aucune étape de build n'est présente : le code écrit est directement exécuté par le navigateur. Attention à la compatibilité ES6+.

## Limites et Problèmes Connus
- Pas d'outil de Lint ou de typage (TypeScript), ce qui peut introduire des erreurs d'inattention.
- Pas de tests unitaires ou d'intégration.
- Dépendance réseau à un CDN pour Phaser (peut bloquer le développement hors ligne si non mis en cache).
