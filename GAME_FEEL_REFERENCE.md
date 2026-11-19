# Toya Adventure's · Le passage des Saules

## Périmètre et méthode

Ce document consigne trois choses : l'état du prototype avant modification (révision `e83ebb4`), les repères observables dans *Phantom Hourglass*, puis les réglages retenus dans cette version (révision `73ca40c`).

Les valeurs de Toya sont des choix de projet, pas des mesures déduites du jeu de référence. Chaque affirmation chiffrée renvoie soit à `src/data/config.js`, soit à un contrôle automatisé, soit à une mesure sur vidéo dont la source est donnée. Les nombres en millisecondes décrivent des durées réelles : le découpage en images n'est qu'une lecture à 60 Hz.

## Diagnostic initial

Révision auditée : `e83ebb4a4516ade018be45c79d1928c5b34e51de`. Lecture du README, des consignes du dépôt, des quatre scènes, des entités, de la configuration, du gestionnaire d'état, des cartes et des tests. Les 5 tests historiques et les 52 contrôles complémentaires passent avant modification (vérifié : `node tests/run_tests.js` → 5 + 52 = 57 succès). Plusieurs contrôles simulent des étapes avec des coordonnées ou des récompenses écrites dans le test, sans démarrer Phaser.

| Système existant | Constat reproductible à la lecture du code ou des images | Intervention |
|---|---|---|
| Joueur | Huit directions, course et normalisation existent. La vitesse passe directement de 0 à 250 px/s. Deux animations peuvent démarrer dans une même mise à jour diagonale. | Conserver les commandes, régler séparément vitesse, mise en mouvement, frein et cadence. |
| Personnages | La planche de 1024 × 1024 contient douze poses. Le centre et parfois le sens du regard changent dans une même ligne. Le monstre transporte un carré de prairie. | Extraire des images du dépôt, aligner les semelles et détacher le monstre. |
| Ressources graphiques | Les deux tilesets opaques contiennent des planches composites. Le grand arbre possède une silhouette exploitable. Le portrait hero.png contient du sol. player.png est entièrement transparent. | Conserver les originaux. Employer des sprites de jeu transparents à résolution fixe. |
| Combat | Un secteur cyan accompagne une zone carrée de 80 px activée immédiatement. Le petit ennemi erre sans attaquer. Son recul peut durer jusqu'au prochain changement aléatoire. | Décomposer préparation, frappe et reprise. Annoncer la direction ennemie et limiter le recul dans le temps. |
| Monde | Le tri par les pieds, les troncs solides, le toit transparent, les fondations, la maison et les deux rives sont déjà en place. L'eau est fixe et le tablier est interrompu à chaque rangée. | Garder les capteurs de porte et les fondations. Aménager un passage continu, des marches et des rides sur l'eau. |
| Progression | Une frappe vide peut valider le conseil de coupe. Le guide, le pont et le coffre sont éloignés. L'état ouvert du coffre vit dans la définition de carte et disparaît au rechargement. | Rapprocher le départ du guide, conditionner chaque étape à son action et enregistrer la progression avec l'inventaire. |
| Interface | Le HUD de terrain ne montre pas les PV. Certains raccourcis HTML contredisent les scènes. Un dialogue terminé peut laisser le suivant transparent. | Afficher vie, objectif et action disponible. Garder les menus et le consentement de sauvegarde. |

## Ce qui est observable dans Phantom Hourglass

La référence est le manuel français illustré de Nintendo (pages imprimées 12–19) et les parcours documentés de l'île Melka et du Temple du Feu. La vidéo méthodologique fournie n'a pas pu être lue dans cet environnement. REA n'est pas installé. L’audit initial s’appuie sur les commandes, les captures et les situations décrites. La mesure sur vidéo figure plus bas.

| Aspect | Observation documentée | Choix pour Toya |
|---|---|---|
| Départ, arrêt, direction | Le point indiqué dirige le personnage. Sa distance détermine marche ou course. Les captures ne permettent pas de déduire la courbe d'accélération ni le délai de demi-tour. | Conserver deux allures au clavier et une courte transition. Orienter Toya dès la commande, garder son dernier regard au repos. |
| Animation, portée, récupération | Le manuel illustre une taille orientée et une attaque ciblée au contact. Une succession de tours peut étourdir Link. Ni les images actives ni la portée en pixels ne sont établies. | Une épée à quatre orientations avec trois temps visibles. Une cible ne subit qu'un impact par coup. |
| Ennemis et interactions | Dans le passage montagneux, un rat portant une clé retourne dans ses trous. Son trajet donne au joueur une information exploitable. L'épée agit aussi sur la végétation. | Une première coupe sans danger, puis une sentinelle qui marque la direction de sa charge et laisse une ouverture après celle-ci. |
| Caméra et zones | Le terrain et sa carte donnent des repères complémentaires. Le parcours alterne extérieur, passage et salles. Les sources ne donnent pas de coefficient de suivi. | Un seul écran PC, caméra bornée et chemin reconnaissable dans les deux sens. |
| Premiers défis | Sur Melka, une rencontre conduit à un coffre puis à un accès. Dans le Temple du Feu, une porte se referme le temps d'une rencontre. | Dans le village, la ronce bouche réellement le passage. Après le pont, on peut esquiver et revenir vers le guide avec un objet. |

Sources : [manuel Nintendo](https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_ds_21/Manual_NintendoDS_TheLegendOfZeldaPhantomHourglass_FR.pdf), [île Melka](https://www.zeldadungeon.net/phantom-hourglass-walkthrough/mercay-island/), [Temple du Feu](https://www.zeldadungeon.net/phantom-hourglass-walkthrough/temple-of-fire/), [démarche REA](https://github.com/morluto/rea), [vidéo proposée à 6 min 18](https://www.youtube.com/watch?v=6MpHBHw30OE&t=378s).

## Repères visuels dans la partie de RetroArchive

La partie intégrale fournie par Jérémy montre la version DS avec des textes en anglais. Les temps ci-dessous correspondent à des images de l’aperçu YouTube, échantillonné toutes les dix secondes. Ils permettent de vérifier la composition de la scène et l’ordre des situations. La vitesse d’un demi-tour, les images actives d’une frappe et le temps de récupération restent à mesurer sur un extrait continu.

| Moment de la vidéo | Ce que montre l’image | Application au passage des Saules |
|---|---|---|
| [12 min 30 · île Melka](https://youtu.be/aPgtEFwJc9Y?t=750) | Le chemin clair arrive au bord de l’eau. On voit simultanément Link, la rupture de la berge et les rochers du passage. | À l’approche de la ronce, vérifier que le joueur peut lire ensemble l’obstacle, l’eau et l’entrée du pont. |
| [15 min 10 · obtention de l’épée](https://youtu.be/aPgtEFwJc9Y?t=910) et [16 min 20 · exercice](https://youtu.be/aPgtEFwJc9Y?t=980) | L’épée est présentée en gros plan. Sur l’image suivante retenue, le cadre s’élargit autour de Link, lame sortie, au milieu de poteaux espacés. | Toya porte déjà son épée. La ronce donne un but au premier coup et permet de le recommencer sans pression avant la rencontre sur l’autre rive. |
| [48 min 20 · Temple du Feu](https://youtu.be/aPgtEFwJc9Y?t=2900) | Quatre dalles rouges sont groupées au bord de la lave. Le contour clair de la rive reste visible autour du motif. | Pour le gardien, vérifier que les marques de charge se distinguent de l’herbe et du chemin et que l’espace où esquiver reste visible. |

Ces repères complètent les sources de l’audit initial. Les valeurs de mouvement et de combat de Toya demeurent des réglages propres au projet.

## Du geste à l’impact sur une cible immobile

### Ce que montre Phantom Hourglass

Dans la [séquence continue d’entraînement de 2 min 26 à 2 min 31](https://archive.org/download/phantom_hourglass_video_guide/part-002_512kb.mp4#t=146,151), Link se tourne vers un poteau à sa droite. La première traînée claire apparaît vers 2 min 27,55 s et le poteau éclate vers 2 min 27,65 s. Ces deux indices visuels sont espacés de trois images dans cet enregistrement à 29,97 images/s, soit environ 100 ms. L’instant de la commande au stylet et celui où le jeu accepterait la commande suivante restent inconnus.

### Ce que fait Toya

Le contrôle a été effectué dans Chromium, face à la ronce après le dialogue du guide, en pilotant la boucle du jeu par pas de 1/60 s. Les pas utilisent `game.headlessStep(time, delta)`, l'appel de Phaser qui met à jour les scènes **sans rendu** : les images comptées ici sont des pas de simulation, le rendu visuel n'étant pas horodaté.

L’image 0 est celle où la lame de Toya apparaît. À l’image 5, la zone de frappe est active. À l’image 6 (100 ms), quatre effets sont produits par un seul appel de `hitResource` : la ronce disparaît, six éclats verts jaillissent, l’inventaire reçoit 1 bois (notification « +1 bois ») et l’état du passage passe de `cut` à `cross`. Le passage s’ouvre donc pendant le geste, et Toya termine sa reprise.

| Pas à 60 Hz | Temps | Phase | État observable |
|---:|---:|---|---|
| 0 | 0 ms | préparation | pose de préparation, manche et lame courte (55 % de la portée) tracés |
| 1 à 4 | 17 à 67 ms | préparation | zone de frappe désactivée |
| 5 | 83 ms | frappe | zone activée (40 px de portée, 34 px de large), pose de frappe, lame à pleine portée |
| 6 | 100 ms | frappe | premier test de recouvrement : ronce coupée, éclats, bois, passage ouvert |
| 7 à 10 | 117 à 167 ms | frappe | zone toujours active |
| 11 | 183 ms | reprise | zone désactivée, pose de reprise |
| 19 | 317 ms | fin | `isAttacking` retombe à faux (fin à 315 ms) |

La zone de frappe est activée dans la mise à jour de la scène (image 5), et le recouvrement est évalué au pas physique suivant (image 6) : c’est ce décalage d’une image qui produit l’impact à 100 ms.

### Rejouer la mesure

1. `npm start`, ouvrir Chromium sur `http://localhost:3000`, accepter la sauvegarde.
2. Parler au guide, descendre jusqu’à la ronce, se placer face à elle.
3. Mettre la boucle en pause (`game.loop.sleep()`) puis avancer de `1000 / 60` ms par appel à `game.headlessStep(t, 1000 / 60)`.
4. Compter à partir du pas où l’attaque démarre (`performActionAttack`, image 0) et vérifier `gameState.passage === 'cross'` à l’image 6.

`tests/play_village.py` automatise cette séquence et vérifie l’état juste après la coupe.

### Limites de la comparaison

- Les deux jeux ont des repères de départ différents : la traînée chez Link, l’apparition de la lame chez Toya.
- Phantom Hourglass est mesuré à 29,97 images/s (trois images ≈ 100 ms, tolérance ± 33 ms) ; Toya à 60 Hz (tolérance ± 17 ms). L’égalité annoncée est à la résolution de la mesure, pas au-delà.
- La fréquence de Toya n’est pas verrouillée : Phaser suit `requestAnimationFrame`. Les phases étant exprimées en millisecondes, seuls les pas intermédiaires changent avec la fréquence d’écran, pas les durées.
- Le réglage de l’épée de Toya a été conservé après la mesure.

## Ordre de réalisation et contrôles

1. Vérifier le point de départ, les silhouettes et les tests existants.
2. Aligner les poses du héros, vérifier diagonale, arrêt, changement de regard et pression contre un mur.
3. Vérifier les trois temps de la frappe, le côté atteint, l'esquive et l'immunité.
4. Contrôler dans le monde les pieds, les arbres, le toit, les rives et les garde-corps.
5. Parcourir le village de l'apparition au retour au guide, puis recharger une partie et revisiter la maison.
6. Vérifier la lecture des PV, du contexte, des dialogues et des menus en jouant au clavier.
7. Relancer les tests de régression et consigner le périmètre vérifié.

## Réglages de cette version

Les valeurs ci-dessous sont des choix de conception de Toya, en pixels du monde Phaser et en millisecondes. Le manuel de référence ne fournit pas de données temporelles mesurées. Le ressenti au clavier se juge en particulier sur un demi-tour et une esquive au bout du pont.

### Mouvement et caméra

| Paramètre ajustable dans `src/data/config.js` | Valeur | Effet en jeu |
|---|---:|---|
| Marche / course | 176 / 272 px/s | Traverser une case de 64 px prend environ 0,36 / 0,24 s à vitesse établie (calcul). |
| Accélération / frein | 1 850 / 2 400 px/s² | Depuis le repos, environ 95 ms pour atteindre la marche et 73 ms pour s’arrêter ; 147 / 113 ms pour la course (calcul continu). |
| Marche à vitesse nominale | 8 images/s | La cadence suit le déplacement observé des pieds ; la vitesse d’animation est bornée entre 0,45 et 1,8 fois la marche. À l'arrêt, les poses regardent dans quatre directions. |
| Décalage d’interaction | 32 px | Zone de 40 × 40 px placée devant Toya, recalculée à chaque pas. |
| Empreinte du joueur | 16 × 9 px | Boîte ancrée aux pieds : les collisions et le tri passent par le sol, pas par le sprite. |
| Caméra | suivi 0,14, bornes de la carte | Pas de dépassement hors carte, chemin lisible dans les deux sens. |

### Combat

| Paramètre ajustable dans `src/data/config.js` | Valeur | Effet en jeu |
|---|---:|---|
| Épée | 70 ms de préparation, 100 ms de frappe, 145 ms de reprise | Le manche et une lame courte apparaissent dès la préparation ; la lame atteint sa portée pendant la frappe. L'action complète dure 315 ms, soit 19 pas à 60 Hz. |
| Zone d'attaque | 40 px de portée, 34 px de large, de 4 à 44 px devant | Le centre est à 24 px devant Toya ; les empreintes des cibles entrent en compte. Une même cible reçoit un seul coup par balayage. |
| Impact | 12 PV, immunité du joueur de 680 ms, recul ennemi de 110 ms | La charge traversante peut blesser une fois. L'ennemi récupère après un coup reçu. |
| Recul de l’ennemi | 125 px/s pendant 110 ms | Environ 14 px, puis la vitesse est remise à zéro. |
| Gardien : guet | vision à 150 px, approche à 72 px/s | Poursuit si le joueur est à moins de 150 px du gardien et à moins de 217 px de son point d’origine (1,45 × 150), puis revient. |
| Gardien : annonce | alerte à 62 px, 480 ms | Les trois marques ambrées (16, 28 et 40 px) fixent sa direction. Prendre un pas de côté puis contre-attaquer. |
| Gardien : charge et repos | 200 px/s pendant 205 ms, puis 620 ms | Environ 41 px de course, puis une ouverture de 0,62 s. |
| PV du gardien | 30 | Deux coups à 20 dégâts ; il encaisse sans mourir au premier. |
| Retour à l'impact | arrêt de 46 ms (coup porté), 70 ms (dégât reçu ou ronce), secousse de 70–120 ms | La physique et les animations se figent sur l'image de contact ; la caméra tremble et le chiffre de dégâts monte au-dessus de la cible. Réglé dans `WorldScene.hitStop` et `Player.takeHit`. |
| Sons | `swing`, `hit`, `hurt`, `bush`, `chest`, `collect`, `levelup` | Synthèse Web Audio : aucun fichier audio. Le coup d'épée part au premier pas de la préparation. |

### Progression et monde

| Paramètre ajustable dans `src/data/config.js` | Valeur | Effet en jeu |
|---|---:|---|
| PV et dégâts de départ | 100 / 20 | Valeurs du HUD et de l’épée nue. |
| Pierre à aiguiser | +5 dégâts, une seule fois | Trouvée dans le coffre de la maison, puis appliquée depuis l’Inventaire (option 2). |
| Montée de niveau | 100 × niveau XP, +20 PV max, +5 dégâts | Soigne au maximum et reporte l’XP excédentaire. |
| Ennemi vaincu | +20 XP, +5 or | Le gardien du pont récompense comme un ennemi ordinaire. |
| Quête accomplie | +50 XP, +20 or | Une seule fois par objectif. |
| Potion | +30 PV | Plafonnée aux PV maximaux. |
| Rides d’eau | toutes les 180 ms | Deux traits animés par case d’eau ; le terrain est mis en texture une fois par carte (`sol-<carte>`). |
| Ombres portées | décalage de +3 px à droite et +4 px vers le bas | Lumière du haut-gauche : joueur, ennemis, arbres, rochers, PNJ, coffre et façade suivent le même décalage (`WorldScene.addShadow`). |
| Ronces coupées | liste `cutBushes` enregistrée avec la partie | Une ronce coupée ne repousse pas au rechargement ; identifiant `<carte>:<x>:<y>` (`GameManager.cutBush`). |
| Format de sauvegarde | `version: 2` dans `rpg_save_v1` | Les parties sans version restent lisibles : champs absents comblés, heuristique de la pierre à aiguiser conservée. |

### États du passage

| État | Déclencheur | Effet |
|---|---|---|
| `meet` | début de partie | Le guide attend à l’est ; la ronce est infranchissable. |
| `cut` | dialogue avec le guide | La ronce peut être coupée. |
| `cross` | frappe sur la ronce | Pont praticable, +1 bois. |
| `fight` | passage de la rive sud (arrivée + 10 px) | Le gardien apparaît. |
| `open` | gardien vaincu | Le coffre de la terrasse est ouvrable. |
| `return` | coffre ouvert | Navette + 3 potions ; retour au guide. |
| `done` | navette remise | Quête close, dialogue de fin. |

Une reprise replace Toya sur la rive d’arrivée pour les états `fight`, `open` et `return` ; l’état est enregistré avec l’inventaire et les coffres ouverts.

## Contrôles

| Action | Touches |
|---|---|
| Se déplacer | ZQSD ou flèches |
| Courir | Maj |
| Attaquer | Espace |
| Interagir (parler, ouvrir) | E |
| Sac / Quêtes / Atelier | I / J / C |
| Fermer un menu | Échap |
| Passer un dialogue | Espace ou Échap |

## Bilan par phase

1. **Audit.** Inspection des sept PNG présents au commit audité (dix aujourd’hui, dont trois extraits pour le village) et des scripts. Les poses sources, les cartes Village / House1, la fabrication, les quêtes et le stockage local restent la base.
2. **Mouvement.** Douze poses recentrées, deux allures, déplacement diagonal normalisé, frein et collision aux pieds. Le regard reste stable lors d'une diagonale.
3. **Combat.** Quatre orientations, trois phases de frappe, zone active synchronisée, impact et recul bornés. La sentinelle du pont poursuit sur une courte distance, annonce sa charge puis récupère.
4. **Décor.** Saule extrait de la ressource du dépôt, ombres de contact, plate-forme de pierre et marches praticables, tablier continu, garde-corps triés par segment et rides d'eau animées toutes les 180 ms. Le terrain fixe est mis en texture une fois par carte.
5. **Village.** Le guide enseigne la première coupe. La ronce occupe toute la passe (collision sur une case entière, sprite affiché en 92 × 70 px). La rive sud déclenche la rencontre, puis le coffre de la terrasse donne la navette et 3 potions. Rapporter la navette achève la quête. Une reprise replace Toya sur une rive adaptée à l’étape enregistrée.
6. **Interface.** Vie et conseil bref dans le HUD, action contextuelle au-dessus du joueur, notification d'objet et dialogue. Les panneaux ont un cadre pixel à clous d'angle, le dialogue affiche le portrait de Toya, la barre de PV pulse sous 30 % et l'ouverture du coffre est animée. Le sac présente l'épée équipée et permet d'appliquer la pierre de la maison.
7. **Vérification.** `npm test` a été exécuté après chaque phase technique. La suite finale contient 5 tests historiques et 62 contrôles complémentaires, soit 67 succès. Le parcours `tests/play_village.py` pilote le clavier dans Chromium avec Phaser 3.55.2 et Arcade Physics ; `npm run test:e2e` le lance sans serveur préalable. Il couvre la ronce solide, la traversée, la frappe, le coffre, le rechargement, le retour au guide, les deux portes et les menus. Une vérification séparée a laissé le gardien toucher puis vaincre Toya et contrôlé la reprise au point de passage. Des contrôles ciblés ont aussi vérifié le blocage de l'eau et du garde-corps ainsi que le tri et l'occlusion de l'arbre et du toit, devant et derrière le joueur.

La compatibilité des anciennes parties conserve inventaire, statistiques et quêtes. Une conversation du guide déjà terminée reprend à la coupe. Les anciens fichiers ne contiennent pas l'historique exhaustif des coffres ouverts. La pierre présente dans le sac permet de reconnaître le coffre de la maison.

## Vérification automatisée

| Commande | Contenu | Portée |
|---|---|---|
| `npm test` | 5 tests GameManager (`tests/run_tests.js`) + 62 contrôles en quatre niveaux (`tests/test_25d_suite.js`) | Sans navigateur : état de partie, cartes, déplacement, fenêtres de frappe, persistance (ronces, coffres, version de sauvegarde), tri et profondeur. Ne teste pas le rendu. |
| `node tests/test_25d_suite.js` | Suite 2.5D seule | Vérifie notamment que la zone de frappe reste fermée pendant la préparation, ouverte pendant la frappe dans les quatre directions, puis refermée pendant la reprise. |
| `npm run test:e2e` | Sert le dépôt, choisit un navigateur puis exécute `tests/play_village.py` | Demande Python, le paquet `playwright` et un Chromium (variable `CHROMIUM_PATH`, sinon Edge ou Chrome installé). Sans navigateur détecté, Playwright utilise son propre build. |
| `python tests/play_village.py` | Parcours complet piloté au clavier | Hors `npm test` : demande Python, Playwright, un Chromium (`CHROMIUM_PATH`) et un serveur déjà lancé sur `http://localhost:3000`. Avance par pas de 1/60 s via `game.headlessStep`, sans rendu. |

Les contrôles Node simulent Phaser avec des objets factices : ils valident les durées, les états et les enchaînements, pas l'image affichée. La mesure de Toya a été faite à part, dans Chromium ; celle de Phantom Hourglass vient de la vidéo citée.
