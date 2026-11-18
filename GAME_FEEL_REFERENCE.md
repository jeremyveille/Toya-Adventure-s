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

## Ordre de réalisation et contrôles

1. Vérifier le point de départ, les silhouettes et les tests existants.
2. Aligner les poses du héros, vérifier diagonale, arrêt, changement de regard et pression contre un mur.
3. Vérifier les trois temps de la frappe, le côté atteint, l'esquive et l'immunité.
4. Contrôler dans le monde les pieds, les arbres, le toit, les rives et les garde-corps.
5. Parcourir le village de l'apparition au retour au guide, puis recharger une partie et revisiter la maison.
6. Vérifier la lecture des PV, du contexte, des dialogues et des menus en jouant au clavier.
7. Relancer les tests de régression et consigner le périmètre vérifié.
