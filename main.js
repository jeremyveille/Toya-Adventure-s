class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        // Load player asset
        this.load.image('player', 'assets/player.png');
    }

    create() {
        // Set background color
        this.cameras.main.setBackgroundColor('#2E8B57'); // A shade of green

        // Add player sprite
        this.player = this.physics.add.sprite(400, 300, 'player');

        // Initialize cursor keys
        this.cursors = this.input.keyboard.createCursorKeys();
    }

    update() {
        // Player movement
        const speed = 160;
        this.player.setVelocity(0);

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [GameScene]
};

const game = new Phaser.Game(config);
