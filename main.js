const config = {
    // This sprite-only game needs no WebGL effects. Canvas avoids software-WebGL
    // slowdowns and works with the cached terrain and nearest-neighbour sprites.
    type: Phaser.CANVAS,
    parent: 'game-container',
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false // Mettre à true pour voir les boites de collision
        }
    },
    // Le jeu démarre avec WorldScene
    scene: [ WorldScene, BattleScene, UIScene, HUDScene ],
    pixelArt: true, // Très important pour garder le style 16-bit net
    roundPixels: true,
    antialias: false,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        expandParent: false,
        zoom: 1 // On peut ajuster le zoom global ici si nécessaire
    }
};

// Tentative de chargement de sauvegarde
window.gameState.load();

const game = new Phaser.Game(config);
