const config = {
    type: Phaser.AUTO,
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
    scale: {
        zoom: 1 // On peut ajuster le zoom global ici si nécessaire
    }
};

// Tentative de chargement de sauvegarde
window.gameState.load();

const game = new Phaser.Game(config);
