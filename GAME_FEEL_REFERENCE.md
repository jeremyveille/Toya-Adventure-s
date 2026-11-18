# Toya Adventure's · Le passage des Saules

## Diagnostic initial

Révision auditée : `e83ebb4a4516ade018be45c79d1928c5b34e51de`. Lecture du README, des consignes du dépôt, des quatre scènes, des entités, de la configuration, du gestionnaire d'état, des cartes et des tests. Les 5 tests historiques et les 52 contrôles complémentaires passent avant modification. Plusieurs contrôles simulent des étapes avec des coordonnées ou des récompenses écrites dans le test, sans démarrer Phaser.

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

La référence est le manuel français illustré de Nintendo (pages imprimées 12–19) et les parcours documentés de l'île Melka et du Temple du Feu. La vidéo méthodologique fournie n'a pas pu être lue dans cet environnement. REA n'est pas installé. L'analyse porte sur les commandes, les captures et les situations décrites, sans extraction de ROM ni chronométrage vidéo.

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

| Paramètre ajustable dans `src/data/config.js` | Valeur initiale | Effet en jeu |
|---|---:|---|
| Marche / course | 176 / 272 px/s | Traverser une case de 64 px prend environ 0,36 / 0,24 s à vitesse établie (calcul). |
| Accélération / frein | 1 850 / 2 400 px/s² | Depuis le repos, environ 95 ms pour atteindre la marche. Environ 73 ms pour s’arrêter depuis cette allure (calcul continu). |
| Marche à vitesse nominale | 8 images/s | La cadence suit le déplacement observé des pieds. À l'arrêt, les poses regardent dans quatre directions. |
| Épée | 70 ms de préparation, 100 ms de frappe, 145 ms de reprise | Le manche apparaît d'abord. La lame s'étend pendant les dégâts. L'action complète dure 315 ms. |
| Zone d'attaque | 44 px vers l'avant, 34 px de large | Les empreintes des cibles entrent en compte. Une même cible reçoit un seul coup par balayage. |
| Gardien | Alerte à 62 px, annonce de 480 ms, charge de 205 ms, repos de 620 ms | Les trois marques ambrées fixent sa direction. Prendre un pas de côté puis contre-attaquer. |
| Impact | 12 PV, immunité du joueur de 680 ms, recul ennemi de 110 ms | La charge traversante peut blesser une fois. L'ennemi récupère après un coup reçu. |

## Bilan par phase

1. **Audit.** Inspection des sept PNG et des scripts. Les poses sources, les cartes Village / House1, la fabrication, les quêtes et le stockage local restent la base.
2. **Mouvement.** Douze poses recentrées, deux allures, déplacement diagonal normalisé, frein et collision aux pieds. Le regard reste stable lors d'une diagonale.
3. **Combat.** Quatre orientations, trois phases de frappe, zone active synchronisée, impact et recul bornés. La sentinelle du pont poursuit sur une courte distance, annonce sa charge puis récupère.
4. **Décor.** Saule extrait de la ressource du dépôt, ombres de contact, plate-forme de pierre et marches praticables, tablier continu, garde-corps triés par segment et rides d'eau animées. Le terrain fixe est mis en texture une fois par carte.
5. **Village.** Le guide enseigne la première coupe. La ronce occupe toute la passe. La rive sud déclenche la rencontre, puis le coffre de la terrasse donne la navette et les potions. Rapporter la navette achève la quête. Une reprise replace Toya sur une rive adaptée à l’étape enregistrée.
6. **Interface.** Vie et conseil bref dans le HUD, action contextuelle au-dessus du joueur, notification d'objet et dialogue. Le sac présente l'épée équipée et permet d'appliquer la pierre de la maison.
7. **Vérification.** `npm test` a été exécuté après chaque phase technique. La suite finale contient 5 tests historiques et 57 contrôles complémentaires. Le parcours `tests/play_village.py` pilote le clavier dans Chromium avec Phaser 3.55.2 et Arcade Physics. Il couvre la ronce solide, la traversée, la frappe, le coffre, le rechargement, le retour au guide, les deux portes et les menus. Une vérification séparée a laissé le gardien toucher puis vaincre Toya et contrôlé la reprise au point de passage. Des contrôles ciblés ont aussi vérifié le blocage de l'eau et du garde-corps ainsi que le tri et l'occlusion de l'arbre et du toit, devant et derrière le joueur.

La compatibilité des anciennes parties conserve inventaire, statistiques et quêtes. Une conversation du guide déjà terminée reprend à la coupe. Les anciens fichiers ne contiennent pas l'historique exhaustif des coffres ouverts. La pierre présente dans le sac permet de reconnaître le coffre de la maison.
