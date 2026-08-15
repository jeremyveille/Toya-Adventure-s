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

// Moteur Audio Synthétique (Web Audio API)
window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
window.playSound = function(type) {
    if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
    let osc = window.audioCtx.createOscillator();
    let gain = window.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(window.audioCtx.destination);
    
    let now = window.audioCtx.currentTime;
    if (type === 'hit') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'collect') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'levelup') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.1);
        osc.frequency.setValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
    }
};

const game = new Phaser.Game(config);
