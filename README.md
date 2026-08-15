# RPG - L'Éveil

Un prototype de jeu RPG 2D en vue de dessus, développé pour le navigateur web. Il s'inspire du style d'Akira Toriyama. Le jeu permet de se déplacer sur une carte, d'interagir et potentiellement de combattre.

## Lancement Rapide

1. Installez les dépendances : `npm install`
2. Lancez le serveur local : `npm start`
3. Ouvrez votre navigateur sur `http://localhost:3000`

## Tests

Une suite de tests unitaires (vanilla JS exécuté via Node) a été mise en place pour vérifier la logique métier (`GameManager`).
- **Lancer les tests** : `npm test`

Ces tests valident :
- L'initialisation du joueur.
- L'ajout et la suppression d'objets dans l'inventaire.
- La logique de montée en niveau.

## Conformité et Qualité

### RGPD (Protection des Données)
- Le jeu propose un **bandeau de consentement** au lancement pour l'utilisation du `localStorage` (sauvegarde de la partie).
- Si l'utilisateur refuse, aucune donnée n'est stockée et les sauvegardes précédentes sont effacées.
- Aucune donnée personnelle n'est envoyée à un serveur externe. Le jeu est 100% client-side.

### Accessibilité (A11y)
- L'interface HTML inclut les balises sémantiques (`<main>`) et les attributs de langue (`lang="fr"`).
- Les éléments interactifs HTML (boutons RGPD) disposent d'états `:focus` visibles et de rôles ARIA (`aria-label`).
- Les animations CSS tiennent compte des préférences utilisateur (`prefers-reduced-motion`).
- La description des commandes clavier est lisible par les lecteurs d'écran.
- *Note : Le cœur du jeu étant un `<canvas>` géré par Phaser, l'accessibilité intra-jeu (lecteur d'écran in-game) est limitée techniquement.*

### Sécurité et Performance
- Aucune exécution de scripts externes non sécurisés.
- Le style 16-bit utilise `image-rendering: pixelated` pour un rendu net et performant sans ressources lourdes.

## Architecture
- **Moteur** : Phaser.js v3
- **État global** : Géré par `GameManager.js`
- **Découpage** : Scènes (World, Battle, UI) et Classes (Player, Enemy).
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
