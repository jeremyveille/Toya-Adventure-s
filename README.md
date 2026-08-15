# RPG Browser Game

Un prototype de RPG 2D dans le navigateur utilisant HTML5, JavaScript et Phaser.js.

## Lancer le jeu

1. Ouvrez un terminal dans ce dossier.
2. Lancez la commande `npm start`.
3. Ouvrez l'URL affichée (généralement `http://localhost:3000`) dans votre navigateur.

## Structure du projet

- `index.html` : Point d'entrée, charge Phaser et les scripts JS.
- `main.js` : Configuration du jeu.
- `src/maps/maps.js` : Données de conception des cartes (format tableau).
- `src/scenes/WorldScene.js` : Scène du monde ouvert (génération de carte, ennemis, collisions).
- `src/scenes/BattleScene.js` : Scène du combat au tour par tour.
- `src/scenes/UIScene.js` : Interface du combat au tour par tour.
- `src/classes/Player.js` : Logique du joueur (déplacement, ZQSD, hitboxes, animations).
- `src/classes/Enemy.js` : Logique des ennemis (déplacement simple, prise de dégâts).

## Commandes

- **Déplacement** : Touches `Z, Q, S, D` ou `Flèches directionnelles`.
- **Courir** : Maintenir `MAJ` (Shift).
- **Attaque (Temps réel)** : `Espace`.
- **Interaction (Parler, etc.)** : Touche `E`.

## Architecture de la Carte

Les cartes sont gérées dans `src/maps/maps.js`. Il s'agit de tableaux simples (0=herbe, 1=arbre, 2=eau, 3=maison, 4=chemin).
Ajoutez des zones et des PNJ directement dans les données pour étendre le jeu !
