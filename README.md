# Toya Adventure’s · Le passage des Saules

Un action-RPG en pixel-art trois quarts pour navigateur, développé avec Phaser 3 et JavaScript. Dans le village, rejoins le cristal du guide. La ronce rouge, le pont et le gardien conduisent au coffre de la terrasse. Le retour au guide termine le premier niveau.

## Lancement Rapide

1. Installez les dépendances : `npm install`
2. Lancez le serveur local : `npm start`
3. Ouvrez votre navigateur sur `http://localhost:3000`

## Tests

Les tests Node couvrent l’état de partie, les cartes, le déplacement et les fenêtres de frappe.
- **Lancer les tests** : `npm test`

Ces tests valident :
- L'initialisation du joueur.
- L'ajout et la suppression d'objets dans l'inventaire.
- La logique de montée en niveau.
- Le système de craft.
- L'utilisation des objets.
- La validation des quêtes.

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

## Modifier le premier niveau

- `src/data/config.js` regroupe les vitesses, le frein, la portée et le rythme des attaques, les recettes et les consignes du passage.
- `src/maps/maps.js` définit le village de 40 × 25 cases, la maison, la ronce, le débarcadère, la sentinelle et les marches de la terrasse.
- `assets/village/` contient les poses du héros, le gardien et le saule au fond transparent, adaptés des images du dépôt.
- Le journal s’ouvre avec **J**. Dans le sac (**I**), **1** boit une potion et **2** affûte l’épée après avoir trouvé la pierre. **Échap** ferme les menus.

Le scénario de régression navigateur utilise une installation facultative de Playwright pour Python avec Chromium. Avec le jeu lancé par `npm start`, exécuter `python tests/play_village.py`. Le test ouvre une partie de test isolée et pilote les touches jusqu'au retour de la maison. Le jeu lui-même et `npm test` ne nécessitent pas Playwright.

Le diagnostic, les sources et les réglages sont détaillés dans [GAME_FEEL_REFERENCE.md](GAME_FEEL_REFERENCE.md).
