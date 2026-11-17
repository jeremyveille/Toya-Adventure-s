# Toya Adventure's — Le sentier des sources

Un action-RPG 2.5D en pixel-art pour navigateur, conservant Phaser 3.55.2 et
l'architecture JavaScript d'origine. Le premier niveau est une boucle jouable :
rencontrer le Guide, couper le buisson du passage, traverser le pont, esquiver
une charge annoncée, vaincre la créature, ouvrir le coffre et revenir au Guide.
L'inventaire, le craft, les quêtes et les transitions de maison restent disponibles.

Les principes de lisibilité des RPG portables inspirent le rythme, sans copier
les ressources Nintendo. Voir [GAME_FEEL_REFERENCE.md](GAME_FEEL_REFERENCE.md)
pour les sources et leurs limites, et [IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md)
pour le diagnostic initial.

## Lancement Rapide

1. Installez les dépendances : `npm install`
2. Lancez le serveur local : `npm start`
3. Ouvrez votre navigateur sur `http://localhost:3000`

## Tests

La suite Node sans dépendance de test couvre la logique métier et les contrats
de mouvement, combat et progression : **79 vérifications**.
- **Lancer les tests** : `npm test`

Ces tests valident :
- L'initialisation du joueur.
- L'ajout et la suppression d'objets dans l'inventaire.
- La logique de montée en niveau.
- Le système de craft.
- L'utilisation des objets.
- La validation des quêtes.
- L'accélération à 30/60/120 Hz, la course et les diagonales.
- Les trois phases de l'épée, ses quatre directions et un impact par cible.
- La télégraphie, les charges, l'invulnérabilité et les projectiles.
- Le parcours A–G, les récompenses uniques, la migration v1 et la reprise après défaite.

Les tests Node utilisent un moteur simulé ; les vérifications navigateur et
leurs limites sont détaillées dans [VALIDATION.md](VALIDATION.md).

Si Playwright et Chromium sont déjà disponibles, démarrez le serveur puis
exécutez `node tests/browser/playthrough.cjs` et
`node tests/browser/world_checks.cjs`. Ces outils de validation sont facultatifs ;
aucune dépendance n'est ajoutée au jeu. `CHROMIUM_PATH` permet de choisir le
navigateur et `TOYA_BASE_URL` le serveur. Les captures sont créées dans `work/`.

## Réglages du gameplay

`src/data/gameFeel.js` centralise vitesses, accélération, freinage, portée,
phases de l'épée, invulnérabilité, comportements ennemis et caméra. Ce sont des
réglages propres à Toya, pas des mesures de Phantom Hourglass.

Les objets utilisent des pieds physiques et un tri selon Y. Les textures
originales de `src/data/PixelArt.js` partagent une palette et une lumière en haut
à gauche ; les arbres et toits s'effacent lorsque Toya passe derrière. L'eau
est animée, les garde-corps sont segmentés en profondeur et une terrasse basse
est accessible par des marches, sans saut ni moteur 3D.

## Conformité et Qualité

### RGPD (Protection des Données)
- Le jeu propose un **dialogue de consentement** au lancement pour l'utilisation du `localStorage` (sauvegarde de la partie).
- Si l'utilisateur refuse, aucune donnée n'est stockée et les sauvegardes précédentes sont effacées.
- L'utilisateur peut **révoquer son consentement** ou supprimer sa sauvegarde à tout moment via le bouton "Effacer ma sauvegarde".
- Aucune donnée personnelle n'est envoyée à un serveur externe. Le jeu est 100% client-side (minimisation des données).

### Accessibilité (A11y)
- L'interface HTML inclut les balises sémantiques (`<main>`, `<section>`) et les attributs de langue (`lang="fr"`).
- Gestion du focus (`aria-hidden`, `aria-modal`) pour la modale RGPD.
- Les éléments interactifs HTML disposent d'états `:focus-visible` clairs et de rôles ARIA (`aria-label`, `aria-labelledby`).
- Les textes informatifs sont masqués visuellement mais disponibles pour les lecteurs d'écran (classe `.sr-only`).
- Les animations CSS tiennent compte des préférences utilisateur (`prefers-reduced-motion`).
- Fort contraste des couleurs de l'UI externe.

### Sécurité et Performance
- Aucune exécution de scripts externes non sécurisés. Le CDN Phaser intègre `crossorigin="anonymous"`.
- Le style 16-bit utilise `image-rendering: pixelated` pour un rendu net et performant sans ressources lourdes.

## Architecture
- **Moteur** : Phaser.js v3
- **État global** : Géré par `GameManager.js`
- **Découpage** : Scènes (World, Battle, UI, HUD) et Classes (Player, Enemy).
- `src/classes/Player.js` : Logique du joueur (déplacement, ZQSD, hitboxes, animations).
- `src/classes/Enemy.js` : Logique des ennemis (déplacement simple, prise de dégâts).

## Commandes

- **Déplacement** : Touches `Z, Q, S, D` ou `Flèches directionnelles`.
- **Courir** : Maintenir `MAJ` (Shift).
- **Attaque (Temps réel)** : `Espace`.
- **Interaction (Parler, etc.)** : Touche `E`.
- **Interface** : `I` (Inventaire), `J` (Quêtes), `C` (Crafting).
- **Dialogue** : `E` ou `Espace` pour afficher la suite, puis fermer.
- **Inventaire** : `1` pour une potion, `2` pour utiliser une pierre à aiguiser.
- **Menus** : même touche ou `Échap` pour fermer ; `Page préc./suiv.` si nécessaire.

## Architecture de la Carte

Les cartes sont gérées dans `src/maps/maps.js` sous forme de chaînes :
`.` herbe, `T/t` arbres, `W` eau, `B` pont, `C` falaise, `H` maison,
`d` chemin, `S` départ, `N` guide, `E` ennemi, `b` buisson, `o` coffre.
La propriété `tutorial` identifie les objectifs par coordonnées stables ;
`terraces` décrit des décors surélevés accessibles par un escalier.
Ajoutez des zones et des PNJ directement dans les données pour étendre le jeu !

La sauvegarde conserve inventaire, quêtes, statistiques et objets du monde
consommés, sous la clé historique `rpg_save_v1` (format version 2). Une partie
v1 reste lisible. Sans consentement, la session fonctionne en mémoire.
