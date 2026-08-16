class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.15); // Adapté à la taille des spritesheets IA (~1024px)
        this.setCollideWorldBounds(true);
        this.body.setSize(150, 150); // Ajustement de la hitbox physique 

        // Statistiques
        this.hp = 100;
        this.maxHp = 100;
        this.mp = 50;
        this.maxMp = 50;
        this.speed = 250;
        this.isAttacking = false;

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
            anims.create({ key: 'walk-down', frames: anims.generateFrameNumbers(this.texture.key, { start: 0, end: 2 }), frameRate: 8, repeat: -1 });
            anims.create({ key: 'walk-left', frames: anims.generateFrameNumbers(this.texture.key, { start: 3, end: 5 }), frameRate: 8, repeat: -1 });
            anims.create({ key: 'walk-right', frames: anims.generateFrameNumbers(this.texture.key, { start: 6, end: 8 }), frameRate: 8, repeat: -1 });
            anims.create({ key: 'walk-up', frames: anims.generateFrameNumbers(this.texture.key, { start: 9, end: 11 }), frameRate: 8, repeat: -1 });
        }
    }

    update() {
        if (this.isAttacking) {
            this.setVelocity(0); // On ne bouge pas pendant qu'on donne un coup d'épée
            return;
        }

        this.setVelocity(0);
        let isMoving = false;
        let currentSpeed = this.shiftKey.isDown ? this.speed * 1.6 : this.speed;

        let left = this.cursors.left.isDown || this.keys.Q.isDown;
        let right = this.cursors.right.isDown || this.keys.D.isDown;
        let up = this.cursors.up.isDown || this.keys.Z.isDown;
        let down = this.cursors.down.isDown || this.keys.S.isDown;

        // Horizontale
        if (left) {
            this.setVelocityX(-currentSpeed);
            this.anims.play('walk-left', true);
            this.facing = 'left';
            isMoving = true;
        } else if (right) {
            this.setVelocityX(currentSpeed);
            this.anims.play('walk-right', true);
            this.facing = 'right';
            isMoving = true;
        }

        // Verticale
        if (up) {
            this.setVelocityY(-currentSpeed);
            this.anims.play('walk-up', true);
            this.facing = 'up';
            isMoving = true;
        } else if (down) {
            this.setVelocityY(currentSpeed);
            this.anims.play('walk-down', true);
            this.facing = 'down';
            isMoving = true;
        }

        if (!isMoving) {
            this.anims.stop();
            // Retour au frame de repos
            if(this.facing === 'down') this.setFrame(1);
            if(this.facing === 'left') this.setFrame(4);
            if(this.facing === 'right') this.setFrame(7);
            if(this.facing === 'up') this.setFrame(10);
        }

        // Mise à jour de la zone d'interaction
        const offset = 40;
        this.interactionHitbox.x = this.x + (this.facing === 'right' ? offset : this.facing === 'left' ? -offset : 0);
        this.interactionHitbox.y = this.y + (this.facing === 'down' ? offset : this.facing === 'up' ? -offset : 0);

        // Gestion de l'attaque Espace (Mode Zelda)
        if (Phaser.Input.Keyboard.JustDown(this.spaceBar)) {
            this.performActionAttack();
        }

        // Depth sorting
        this.setDepth(this.y);
    }

    performActionAttack() {
        this.isAttacking = true;
        
        // On positionne la hitbox devant le joueur selon sa direction
        const offset = 60;
        this.weaponHitbox.x = this.x + (this.facing === 'right' ? offset : this.facing === 'left' ? -offset : 0);
        this.weaponHitbox.y = this.y + (this.facing === 'down' ? offset : this.facing === 'up' ? -offset : 0);
        
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
