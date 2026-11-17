# Validation — 17 novembre 2026

## Résultat

Le premier niveau est jouable de bout en bout dans Chromium avec le vrai moteur
Phaser 3.55.2. Les tests automatisés Node passent : **79 sur 79**.
Les vérifications ont été effectuées sur la copie locale. La version livrée est
disponible sur la branche GitHub `codex/toya-2-5d-delivery-c208f6e7` ; aucun de ces
changements n'a été fusionné dans `main`.

## Suite Node

Commande : `npm test`.

| Suite | Tests réussis |
| --- | ---: |
| GameManager historique | 5 |
| Contrats 2.5D historiques | 52 |
| Mouvement et épée | 7 |
| Tutoriel et persistance | 7 |
| Ennemis, projectiles et destruction de scène | 8 |
| Total | 79 |

Les assertions historiques ont été conservées, avec adaptation du point de
départ désormais près du Guide et de la vitesse initiale désormais accélérée.
Les nouvelles vérifications couvrent notamment 30/60/120 Hz, quatre orientations
d'épée, phases sans dégâts, une seule touche par cible/coup, invulnérabilité,
direction de charge verrouillée, nettoyage des projectiles, migration v1 et
idempotence des récompenses.

## Vérifications dans le navigateur

Deux scénarios sont fournis dans `tests/browser/`. Ils utilisent Playwright
disponible dans l'environnement de validation, sans l'ajouter aux dépendances du jeu.
Le serveur a été démarré avec `npm start` sur le port 3000.

`playthrough.cjs` parcourt le niveau **au clavier**, sans modifier les PV ennemis
ni attribuer les objectifs artificiellement :

- Déplacement depuis le départ jusqu'au Guide, dialogue et réouverture opaque.
- Fermeture d'un dialogue sans lancer une attaque parasite.
- Chemin jusqu'au passage, blocage physique, puis destruction par l'épée.
- Traversée du pont et course reconnues.
- Combat réel contre la créature, ouverture du coffre, retour et quête terminée.
- Utilisation de la récompense d'équipement et reprise après rechargement.
- Absence de buisson, ennemi ou récompense régénérés ; aucune erreur JavaScript.

`world_checks.cjs` place le joueur près d'éléments précis, puis utilise les
touches et les collisions réelles pour vérifier :

- Blocage par l'eau et les falaises, arrêt de l'animation contre un mur.
- Transparence derrière une canopée et restauration devant elle.
- Accès à la terrasse par l'escalier.
- Trois allers-retours Village → Maison → Village et ouverture du coffre intérieur.
- Un seul écouteur de dialogue et d'interaction après chaque transition.
- Retour au point de départ après défaite avec conservation des faits du monde.
- Caméra bornée et affichage 4:3 à une fenêtre de 640 × 850.

Le test a exposé un défaut réel de destruction de scène : après tri par Y,
détruire le propriétaire et son ombre modifiait deux entrées de la liste que
Phaser était en train de parcourir. Les entités laissent désormais Phaser
détruire chaque objet lors de l'arrêt ; elles libèrent leurs timers et colliders.
Deux régressions Node protègent ce comportement.

## Rendu et fluidité

Le terrain et les chemins sont rasterisés une fois par carte ; le tri des objets,
l'eau et les effets restent dynamiques. Le rendu utilise Canvas de Phaser,
adapté à ces sprites sans effet WebGL spécifique.

Dans cette machine Cloud avec WebGL logiciel, un échantillon d'environ 1,2 s
a produit 10 images en mode AUTO/WebGL contre 73 en mode Canvas, sur la même
carte. C'est une comparaison locale du rendu, pas une garantie sur tous les PC.

## Limites explicites

- Phaser et la police restent chargés par CDN comme dans le projet initial.
  Dans Chromium Cloud, le certificat du proxy a nécessité l'option de test
  `TOYA_IGNORE_HTTPS_ERRORS=1`. Le code du jeu ne désactive aucune vérification TLS.
- Les tests Node simulent Phaser ; les scénarios navigateur les complètent.
- Les animations latérales du héros d'origine n'offrent que deux poses cohérentes.
  L'épée combine poses directionnelles et effet original, sans nouvelle spritesheet.
- La hauteur des terrasses est une illusion graphique avec accès par marches :
  pas de moteur 3D, de saut ou de superposition de deux sols jouables au même point.
- Les timings sont des réglages Toya. Aucune analyse REA ni mesure image par image
  de la vidéo indisponible n'est revendiquée.
