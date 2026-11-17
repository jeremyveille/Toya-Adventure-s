# Toya Adventure's — audit et mise en œuvre

Audit initial réalisé sur `e83ebb4a4516ade018be45c79d1928c5b34e51de`.
`README.md` et `AGENTS.md` lus avant toute modification.

## Ce qui fonctionne et doit rester

- Phaser 3.55.2, scènes/classes JavaScript sans compilation.
- ZQSD/flèches, diagonales normalisées, Shift, quatre animations de marche.
- Corps physiques aux pieds, collisions avec les décors, tri Y et occlusion.
- Village, intérieur de maison et transitions avec coordonnées de retour.
- Inventaire, recettes, progression XP, quête initiale, sauvegarde avec consentement.
- 5 tests métier et 52 tests 2.5D passent avant modification (`npm test`).

## Diagnostic initial

- Le mouvement applique immédiatement la vitesse maximale et s'arrête sans inertie ;
  l'animation est indépendante de la vitesse réelle et des murs.
- L'épée active une grande zone carrée pendant tout l'effet ; aucune préparation
  ni récupération distincte, et pas de mémoire des cibles touchées par coup.
- Les ennemis errent au hasard ; le contact ne constitue pas une attaque annoncée.
  Les projectiles retirent directement des PV sans passer par une protection commune.
- Les didacticiels sont des textes de proximité indépendants : aucune chaîne
  découverte → guide → buisson → pont → ennemi → coffre → retour.
- Le buisson annoncé n'obstrue pas réellement l'accès au pont. Le coffre et les
  ressources ne sont pas persistés ; les données du coffre sont mutées dans la carte.
- Un dialogue désactive le joueur mais pas les menaces. Les fenêtres réouvertes
  gardent leur alpha final à zéro ; les écouteurs s'accumulent aux transitions.
- Les éléments de profondeur existent déjà : les améliorer plutôt que remplacer
  la scène. Les vagues sont statiques, les garde-corps utilisent une seule profondeur.
- Les ressources sont hétérogènes : héros 1024² découpé en 341×256 (12 frames),
  slime 1024² avec carré d'herbe incrusté, arbre 1086×1448, deux grands tilesets
  opaques et ancien joueur 32². Le héros animé est conservé ; le slime reçoit une
  texture originale transparente. Les décors procéduraux sont harmonisés.

## Phases

1. Documenter les références accessibles et séparer observations et réglages Toya.
2. Centraliser mouvement/combat ; introduire accélération, arrêt et animation
   proportionnelle au déplacement.
3. Décomposer les attaques, synchroniser les corps physiques, ajouter télégraphie,
   recul, invulnérabilité et dégâts communs.
4. Conserver le rendu multicouche et l'enrichir par textures pixel, eau animée,
   ombres, limites/caméra et garde-corps segmentés.
5. Relier les événements du monde au tutoriel et à une progression sauvegardée.
6. Corriger les dialogues, harmoniser les menus et afficher vie/objectif/contexte.
7. Exécuter la suite existante et des vérifications de régression, puis parcourir
   le niveau dans le vrai moteur navigateur (collisions, combat, portes, sauvegarde).

Les constantes de gameplay proposées sont des réglages Toya, pas des mesures de
Phantom Hourglass. Voir `GAME_FEEL_REFERENCE.md` pour sources et limites.


## Bilan des phases livrées

- **Mouvement :** paramètres regroupés dans `gameFeel.js`, vitesses 150/230 px/s,
  accélération 1350 et freinage 1850 px/s², quatre orientations et huit directions.
- **Combat :** préparation 65 ms, dégâts 110 ms, récupération 140 ms ; mémoire des
  cibles par coup, corps synchronisé, recul et invulnérabilité 750 ms. Ennemis avec
  annonce 500 ms, charge à 220 px/s durant 260 ms et récupération 700 ms.
- **Profondeur :** génération originale factorisée dans `PixelArt.js` à la place
  de la longue méthode de textures dans WorldScene ; superposition conservée,
  surfaces/faces distinctes, ombres, eau animée, rails segmentés et terrasse avec marches.
- **Niveau 1 :** départ près du Guide ; seuls le buisson au goulet et le pont
  permettent le passage vers le sud. Combat, coffre et retour reliés par le
  `TutorialManager`. Les objets consommés et les étapes sont persistés.
- **Interface :** vie, objectif et repère de direction compacts ; dialogues
  réouvrables ; menus existants harmonisés, améliorations d'équipement utilisables.
- **Technique :** terrain précalculé et rendu Canvas de Phaser ; pas de nouveau
  moteur, bundler ou dépendance de production. Correction du nettoyage des
  entités lors de l'arrêt d'une scène triée par Y.
- **Validation :** 79 tests Node passent et les scénarios navigateur couvrent
  le niveau complet, les collisions, la terrasse, trois allers-retours de maison,
  la reprise après défaite, l'occlusion et la sauvegarde. Détails dans `VALIDATION.md`.
