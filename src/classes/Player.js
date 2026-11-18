class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(1);
        this.setOrigin(0.5, 0.95); // Ancrage 2.5D au sol (aux pieds)
        this.setCollideWorldBounds(true);

        // Hitbox 2.5D restreinte strictement à l'empreinte au sol des pieds (~18x10 px monde)
        this.body.setSize(16, 9);
        this.body.setOffset(8, 36);

        this.speed = GameConfig.movement.walkSpeed;
        this.isAttacking = false;
        this.lastX = x;
        this.lastY = y;

        // Direction actuelle pour savoir où lancer l'attaque
        this.facing = 'down';

        // Contrôles (ZQSD + Flèches)
        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keys = scene.input.keyboard.addKeys('Z,Q,S,D');
        this.spaceBar = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.shiftKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        // Zone d'interaction (pour parler, ouvrir des coffres)
        this.interactionHitbox = scene.add.zone(0, 0, 40, 40);
        scene.physics.add.existing(this.interactionHitbox);

        // Création de l'arme (Zone de dégat invisible)
        this.weaponHitbox = scene.add.zone(0, 0, 80, 80);
        scene.physics.add.existing(this.weaponHitbox);
        this.weaponHitbox.body.setEnable(false); // Désactivée par défaut

        this.createAnimations();
    }

    createAnimations() {
        // Définition des animations (basé sur 3 colonnes, 4 lignes)
        // Ligne 1: Down (0,1,2), Ligne 2: Left (3,4,5), Ligne 3: Right (6,7,8), Ligne 4: Up (9,10,11)
        const anims = this.scene.anims;
        if(!anims.exists('walk-down')) {
            anims.create({ key: 'walk-down', frames: anims.generateFrameNumbers(this.texture.key, { start: 0, end: 2 }), frameRate: GameConfig.movement.walkFps, repeat: -1 });
            anims.create({ key: 'walk-left', frames: anims.generateFrameNumbers(this.texture.key, { start: 3, end: 5 }), frameRate: GameConfig.movement.walkFps, repeat: -1 });
            anims.create({ key: 'walk-right', frames: anims.generateFrameNumbers(this.texture.key, { start: 6, end: 8 }), frameRate: GameConfig.movement.walkFps, repeat: -1 });
            anims.create({ key: 'walk-up', frames: anims.generateFrameNumbers(this.texture.key, { start: 9, end: 11 }), frameRate: GameConfig.movement.walkFps, repeat: -1 });
        }
    }

    update(delta = 1000 / 60) {
        const moved = Math.hypot(this.x - this.lastX, this.y - this.lastY);
        this.lastX = this.x;
        this.lastY = this.y;
        this.setDepth(Math.floor(this.y));
        if (!this.active || this.isAttacking) {
            this.setVelocity(0);
            return;
        }

        const settings = GameConfig.movement;
        const x = Number(this.cursors.right.isDown || this.keys.D.isDown)
            - Number(this.cursors.left.isDown || this.keys.Q.isDown);
        const y = Number(this.cursors.down.isDown || this.keys.S.isDown)
            - Number(this.cursors.up.isDown || this.keys.Z.isDown);
        const directionLength = Math.hypot(x, y);
        const speed = this.shiftKey.isDown ? settings.runSpeed : this.speed;
        const vx = this.body.velocity.x;
        const vy = this.body.velocity.y;
        const dx = x * speed / (directionLength || 1) - vx;
        const dy = y * speed / (directionLength || 1) - vy;
        const change = (directionLength ? settings.acceleration : settings.braking) * Math.min(delta, 50) / 1000;
        const fraction = Math.min(1, change / (Math.hypot(dx, dy) || 1));
        this.setVelocity(vx + dx * fraction, vy + dy * fraction);

        const horizontal = x > 0 ? 'right' : 'left';
        const vertical = y > 0 ? 'down' : 'up';
        if (x && (!y || this.facing !== vertical)) this.facing = horizontal;
        else if (y) this.facing = vertical;

        const actualSpeed = moved * 1000 / Math.max(delta, 1);
        if (actualSpeed > 5) {
            this.anims.timeScale = Math.min(1.8, Math.max(0.45, actualSpeed / this.speed));
            this.anims.play('walk-' + this.facing, true);
        } else {
            this.anims.stop();
            this.setFrame({ down: 1, left: 4, right: 7, up: 10 }[this.facing]);
        }

        const offset = settings.interactionOffset;
        this.interactionHitbox.x = this.x + (this.facing === 'right' ? offset : this.facing === 'left' ? -offset : 0);
        this.interactionHitbox.y = this.y - 8 + (this.facing === 'down' ? offset : this.facing === 'up' ? -offset : 0);

        if (Phaser.Input.Keyboard.JustDown(this.spaceBar)) this.performActionAttack();
    }

    performActionAttack() {
        this.isAttacking = true;
        
        // On positionne la hitbox devant le joueur selon sa direction
        const offset = 40;
        this.weaponHitbox.x = this.x + (this.facing === 'right' ? offset : this.facing === 'left' ? -offset : 0);
        this.weaponHitbox.y = (this.y - 12) + (this.facing === 'down' ? offset : this.facing === 'up' ? -offset : 0);
        
        this.weaponHitbox.body.setEnable(true);

        // Effet visuel d'épée (Arc graphique)
        let slash = this.scene.add.graphics();
        slash.lineStyle(4, 0xffffff); // Bordure blanche
        slash.fillStyle(0x00ffff, 0.8); // Remplissage cyan
        slash.beginPath();
        slash.arc(0, 0, 40, Phaser.Math.DegToRad(-45), Phaser.Math.DegToRad(45), false);
        slash.lineTo(0, 0);
        slash.fillPath();
        slash.strokePath();

        slash.setPosition(this.weaponHitbox.x, this.weaponHitbox.y);
        slash.setDepth(this.depth + 1);
        
        // Orientation de base selon la direction
        let baseRotation = 0;
        if (this.facing === 'left') baseRotation = 180;
        if (this.facing === 'up') baseRotation = -90;
        if (this.facing === 'down') baseRotation = 90;
        slash.rotation = Phaser.Math.DegToRad(baseRotation - 45); // Démarre un peu en arrière
        
        this.scene.tweens.add({
            targets: slash,
            alpha: { from: 1, to: 0 },
            scale: { from: 0.8, to: 1.5 },
            rotation: Phaser.Math.DegToRad(baseRotation + 45), // Balayage vers l'avant
            duration: 150,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                slash.destroy();
                this.isAttacking = false;
                this.weaponHitbox.body.setEnable(false); // Désactive la hitbox
            }
        });
    }
}
