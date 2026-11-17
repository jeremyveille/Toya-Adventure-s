# Toya Adventure's — référence de sensations de jeu

Analyse réalisée le 17 novembre 2026, à partir du dépôt initial
`e83ebb4a4516ade018be45c79d1928c5b34e51de` et des sources ci-dessous.
L'objectif est un premier niveau original, lisible et agréable au clavier,
en conservant Phaser 3 et les systèmes existants.

## Sources, méthode et limites

1. [Manuel officiel Nintendo, Phantom Hourglass](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_ds_21/Manual_NintendoDS_TheLegendOfZeldaPhantomHourglass_EN.pdf),
   notamment pages imprimées 12–13 et 16–19. Le texte et les captures des pages
   16–19 ont été examinés. Source légale d'instructions et d'images fixes,
   pas un enregistrement de temps d'exécution.
2. [Entretien officiel avec Eiji Aonuma](https://www.nintendo.com/en-gb/News/2007/Interview-Zelda-Phantom-Hourglass-249679.html),
   9 août 2007 : simplification des commandes, interaction directe,
   apprentissage et retours au Temple du Roi des Mers.
3. [Présentation jouée publiée par Nintendo](https://www.nintendo.com/en-gb/News/2009/Playtest-The-Legend-of-Zelda-Phantom-Hourglass-251587.html) :
   déplacement au stylet, carte et exploration. C'est un compte rendu écrit,
   pas une capture vidéo analysée image par image.
4. [REA, documentation du projet officiel](https://github.com/morluto/rea#readme) :
   investigation, collecte de preuves, hypothèses et limites explicites.
5. [Vidéo indiquée dans la demande, à 6 min 18](https://www.youtube.com/watch?v=6MpHBHw30OE&t=378s).
   La récupération de cette page a été limitée par YouTube. Elle n'a donc pas
   été visionnée et aucune conclusion précise n'est attribuée à ce passage.
   [La présentation publique de son auteur](https://www.patreon.com/Stefan3DAI/posts/everyone-can-now-172792120)
   confirme le principe général d'une adaptation de sensations avec REA.

**REA :** aucun exécutable `rea` n'a été trouvé dans le PATH et aucun serveur
REA n'est disponible dans les outils de cette session. Aucun binaire, ROM ou
enregistrement exploitable de Phantom Hourglass n'a été fourni. Il n'y a donc
pas eu de désassemblage, d'extraction d'assets ou d'exécution de REA. Son
installation n'est pas nécessaire pour lire et améliorer le JavaScript ouvert
de Toya. La méthode retenue est une analyse documentaire et visuelle, suivie
d'essais comportementaux sur Toya.

Les mentions suivantes évitent de transformer une intuition en donnée :

- **Documenté** : comportement explicitement décrit par une source primaire.
- **Observé sur image fixe** : composition visible dans les captures officielles.
- **Choix Toya / estimation** : adaptation originale à tester ; ce n'est pas une
  mesure des paramètres Nintendo.
- **Non déterminé** : information absente des ressources consultées.

## Ce que la référence apporte

Le manuel documente une marche/course dépendant de la distance du stylet,
des interactions contextuelles, une attaque ciblée qui oriente le personnage,
une taille directionnelle et une attaque circulaire. L'épée peut aussi couper
l'herbe : une action sert à la fois au combat et à l'exploration. La vie est
présente sur l'écran principal. Les images montrent une vue trois-quarts,
des arbres volumineux et une séparation nette entre terrain, falaise et eau.
Ces constats ne donnent ni accélération ni cadence d'animation.

L'entretien d'Aonuma met l'accent sur des commandes accessibles qui permettent
d'expérimenter. Il décrit un donjon central revisité, avec des menaces que
l'on doit parfois éviter, et l'intérêt d'apprendre un trajet. Pour Toya,
on retient la compréhension immédiate d'une action et le plaisir de mieux
maîtriser un lieu connu. Le niveau initial n'a pas besoin d'un chronomètre.

| Axe demandé | Évidence et limite | Adaptation originale pour Toya |
| --- | --- | --- |
| Accélération, arrêt | Marche/course documentées ; courbe d'accélération non déterminée. | Petite montée en vitesse réglable, freinage plus court et arrêt franc sur collision. Éviter une glissade longue. |
| Changements de direction | L'attaque ciblée réoriente le personnage ; latence exacte inconnue. | Huit directions normalisées, orientation visuelle à quatre directions stable sur les diagonales. |
| Rythme des animations | Captures avant/après visibles ; durées et nombre d'images non déterminés. | Cadence de marche liée à la vitesse physique réelle, idle conservant l'orientation. Ne pas simuler une animation d'épée absente de la feuille de sprites. |
| Distance d'attaque | Attaque directionnelle documentée ; portée en unités de jeu inconnue. | Volume devant les pieds, plus étroit et plus court qu'une tuile de 64 px ; vérifier les quatre orientations et les cibles derrière le joueur. |
| Récupération | Aucun minutage utilisable. | Séparer préparation, fenêtre de dégâts et récupération. Une seule touche produit un coup ; une cible ne reçoit qu'un impact par coup. |
| Ennemis | La source distingue des menaces à combattre et à éviter ; IA et timings inconnus. | Premier ennemi : attente, approche bornée, annonce visible, attaque engagée dans une direction, récupération. Recul bref au contact de l'épée. |
| Caméra et zones | Carte/exploration documentées ; amortissement caméra et délais de transition non déterminés. | Suivi doux borné à la carte, coordonnées arrondies, transition unique par franchissement de porte et délai avant réactivation. |
| Feedback | Coupe d'herbe et effets d'épée visibles sur les images ; rythme inconnu. | Fragments carrés, bref éclair de dégâts, recul, clignotement d'invulnérabilité et retour visible sur les objets collectés. |
| Tutoriels et donjons | L'expérimentation et la maîtrise progressive sont documentées. Le parcours exact des premières salles n'a pas été vérifié. | Parcours A–G propre à Toya : montrer un besoin, enseigner une action puis la réutiliser dans un contexte simple. Aucun plan de donjon Nintendo n'est reproduit. |

Les commandes restent ZQSD/flèches, Shift, Espace et E. Une entrée au stylet,
le double écran, le saut automatique et une attaque circulaire ne sont pas
nécessaires pour atteindre l'objectif demandé.

## Diagnostic du dépôt avant intervention

Les fichiers `README.md`, `AGENTS.md`, `WorldScene.js`, `Player.js`, `Enemy.js`,
`GameManager.js`, `maps.js` et la configuration ont été lus avant modification.

**Bases à conserver :** déplacement dans huit directions avec normalisation
diagonale et Shift, orientations et animations de marche, boîtes de collision
aux pieds, épée temps réel, recul et éclair rouge des ennemis, tri par Y,
gestionnaire d'occlusion, textures procédurales d'arbres/maisons/falaises,
pont avec garde-corps, Village/House1 et portes, inventaire, recettes, quêtes,
XP et sauvegarde conditionnée au consentement.

**Points à corriger progressivement :**

- La vitesse est imposée instantanément à chaque frame. L'animation répond aux
  touches plutôt qu'au déplacement réel ; un mur peut donc laisser marcher
  le personnage sur place.
- Une hitbox d'épée de 80 × 80 reste active pendant tout l'effet de 150 ms.
  Les phases de coup et la portée ne sont pas explicitement configurées.
- Les ennemis errent au hasard. Le tir d'un shooter retire directement de la
  vie sans passer par une réception de dégâts commune avec invulnérabilité.
  Le premier ennemi de type minor manque d'une attaque annoncée structurée.
- Le tutoriel initial comporte quatre textes de proximité. Il peut valider
  « attaquer » sans buisson détruit et « combat » dès qu'on perd de la vie.
  Ce ne sont pas des preuves de maîtrise de l'objectif.
- Le spawn `S` et le guide `N` sont éloignés. Le pont est à l'est, l'ennemi et
  le coffre au sud-ouest. La première route n'organise pas encore une suite
  évidente découverte → action → récompense → retour.
- L'état sauvegardé contient joueur, inventaire et quêtes, mais pas un état
  persistant du tutoriel, des buissons et des coffres. Les revisites doivent
  éviter les récompenses répétées et les objectifs redevenus impossibles.
- Le tri par Y et l'occlusion existent déjà : les améliorer aux points
  incohérents au lieu de les réécrire. Le calcul par défaut d'une borne
  verticale d'occlusion utilise `originX` à la place d'`originY`.
- L'eau est dessinée de façon statique et les ombres comportent des formes
  lisses. Le changement souhaité concerne des détails et leur cohérence.

**Assets examinés :** le dossier contient sept PNG. `player.png` fait 32 × 32,
`hero_spritesheet.png`, `hero.png` et `enemy.png` font 1024 × 1024 ;
`tree_main.png` fait 1086 × 1448. Les deux tilesets sont RGB 1024 × 1024.
La feuille du héros est découpée en 3 × 4 frames de 341 × 256 dans le code,
avec une colonne résiduelle d'un pixel. L'inspection visuelle montre des poses
d'orientation incohérente à l'intérieur des lignes 2 et 3 : la dernière pose
de la ligne « gauche » regarde à droite, la première de la ligne « droite »
est de face. Cela explique un risque de retournement pendant la marche.
Un frame de marche n'est pas une animation d'attaque. Le slime `enemy.png`
porte encore un grand carré d'herbe dans l'image : son canal alpha ne suffit
pas à en faire un objet isolé. Le tileset avancé contient une grille et des
étiquettes imprimées dans l'image ; son usage brut ferait apparaître ces
repères. Les cadrages doivent être vérifiés en jeu avant tout changement
d'échelle. Les décors procéduraux actuels offrent une base cohérente sans
nouvelle dépendance ni récupération d'art Nintendo.

## Paramètres de départ à régler dans Toya

Les valeurs ci-dessous sont des **estimations de design pour Toya**, exprimées
dans son monde de tuiles de 64 px. Aucune n'a été mesurée sur Phantom Hourglass.
La configuration JavaScript demeure la source des valeurs effectivement
utilisées ; les plages donnent un point de départ pour les essais.

| Paramètre | Plage de départ proposée | Critère d'ajustement |
| --- | --- | --- |
| Atteinte de la vitesse de marche | 80–140 ms en espace libre | Le départ répond immédiatement sans vitesse maximale instantanée. |
| Freinage sans entrée | 60–100 ms | L'arrêt reste précis près d'un coffre ou d'une berge. |
| Course | 1,4–1,6 × la marche | Le pont reste franchissable sans heurter constamment ses rails. |
| Préparation du coup | 40–80 ms | L'intention est visible sans donner une sensation de retard. |
| Fenêtre de dégâts | 70–110 ms | L'impact correspond au passage visible de l'épée. |
| Récupération | 90–150 ms | Une décision suit le coup ; éviter le martèlement continu. |
| Portée effective | Environ 30–45 px depuis les pieds | Toucher devant soi sans traverser les murs ou frapper derrière. |
| Annonce du premier ennemi | 400–650 ms | Le joueur novice peut reconnaître l'attaque et s'écarter. |
| Invulnérabilité du joueur | 650–900 ms | Un chevauchement ne vide pas la barre de vie. |
| Recul ennemi | 80–140 ms, borné par les murs | Impact lisible sans éjecter la cible hors de l'arène. |

Vérifier ces durées au delta réel et à plusieurs fréquences d'affichage.
Ne pas déduire une accélération de la seule durée cible sans préciser la vitesse
choisie : pour une rampe linéaire, `accélération = vitesse / durée`.

## Direction artistique retenue

Toya reste un RPG en sprites 2D, vu de trois-quarts. La sensation de hauteur
vient du cadrage des sprites, des surfaces/faces des falaises, des bases de
bâtiments, des pieds des personnages et du tri des profondeurs. La référence
utilise un rendu 3D stylisé ; la traduction en pixel-art 16/32-bit est un choix
artistique original de Toya, pas une reproduction de sa technique.

Conserver une palette chaude de verts, bruns, beiges, gris et bleus modérés.
Éclairer en haut à gauche ; ombres de contact nettes décalées vers le bas à
droite. Construire feuillages et toits en volumes simples à contours francs.
Les nouveaux objets isolés ont un fond transparent, sans dalle de sol ajoutée.
Utiliser des fragments et reflets rectangulaires ; pas de flou ni de filtre
réaliste. Les garde-corps sont des objets séparés dont la profondeur correspond
à leur base. Le joueur caché par un toit/feuillage reste lisible par une
transparence locale temporaire.

## Niveau 1 : progression originale A–G

1. **Découverte :** spawn près du guide, espace sûr où essayer les directions.
2. **Interaction :** invite contextuelle E ; une phrase du guide désigne le
   buisson du chemin. Valider l'échange réel.
3. **Première attaque :** le buisson bloque effectivement la route. Valider sa
   destruction, montrer l'objet obtenu et retirer son collider.
4. **Exploration :** chemin menant au pont ; petit rappel Shift. Valider le
   franchissement physique et l'essai de course, pas l'ouverture d'un texte.
5. **Premier combat :** un ennemi isolé, annonce visible et espace pour esquiver.
   Valider sa défaite, jamais le fait d'avoir subi des dégâts.
6. **Récompense :** coffre identifiable, interaction E, récompense unique et
   persistante ; elle apparaît dans l'inventaire existant.
7. **Première quête :** petit objectif explicite puis retour au guide. Marquer
   la quête terminée et rendre visible la suite, sans agrandir le monde avant
   que cette boucle fonctionne.

Une seule instruction prioritaire est affichée à la fois. Le journal conserve
l'objectif pour qu'il reste retrouvable après un dialogue ou un chargement.
Les menus inventaire/craft/équipement partagent un cadre compact et la même
typographie ; ils n'ajoutent pas de second écran artificiel.

## Phases et vérification

| Phase | Intervention progressive | Preuve attendue |
| --- | --- | --- |
| 1. Audit | Document présent, baseline des tests, inventaire des systèmes et ressources. | Diff limité aux composants nécessaires ; limites des sources explicites. |
| 2. Mouvement | Réglages centralisés, accélération/freinage, animation réelle et idle orienté. | Diagonale à la même vitesse, arrêt contre murs et course sur le pont. |
| 3. Combat | Phases du coup, hitbox directionnelle, dégâts communs, annonce et récupération ennemies. | Une cible touchée une fois/coup ; aucune blessure répétée par frame. |
| 4. Profondeur | Corriger les bornes d'occlusion, ombres et eau ; garder les couches existantes. | Passer devant/derrière arbre et maison ; rails et falaise lisibles. |
| 5. Niveau | Ajuster le Village et enregistrer les événements A–G. | Parcours neuf complet, coffre unique, retour guide et reprise sauvegardée. |
| 6. Polish | Vie, interaction proche, dialogue et objectif compact ; caméra et portes. | HUD lisible, menus bloquant les actions du monde, entrée/sortie maison sans boucle. |
| 7. Validation | `npm test`, tests pertinents et essais dans un vrai navigateur. | Aucun échec masqué ; rapport séparant tests simulés et vérifications en jeu. |

Les tests Node existants utilisent des mocks Phaser ; leurs succès ne prouvent
pas à eux seuls le rendu ou le franchissement réel des collisions. Après chaque
phase, exécuter `npm test`, puis vérifier dans le navigateur les comportements
modifiés. Ne pas annoncer une sensation équivalente à Zelda sur la seule base
d'une suite automatisée.

Pour une future mesure vidéo autorisée : noter la source et son horodatage,
la fréquence d'image, l'événement visible de départ/fin et plusieurs essais.
Une vidéo seule ne révèle pas le moment exact d'entrée de la commande ; garder
cette incertitude distincte de la latence interne et des paramètres du moteur.
N'importer aucun sprite, son, dialogue, carte ou code propriétaire dans Toya.
