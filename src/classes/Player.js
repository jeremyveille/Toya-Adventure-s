class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setScale(0.21); // Proportions harmonisées avec les PNJ et décors 64px (~54px)
        this.setOrigin(0.5, 0.95); // Ancrage 2.5D au sol (aux pieds)
        this.setCollideWorldBounds(true);

        // Hitbox 2.5D restreinte strictement à l'empreinte au sol des pieds (~18x10 px monde)
        this.body.setSize(86, 48);
        this.body.setOffset(115, 160);

        // Statistiques
        this.hp = 100;
        this.maxHp = 100;
        this.mp = 50;
        this.maxMp = 50;
        this.speed = 250;
        this.isAttacking = false;
        this.isInvulnerable = false;

        // Direction actuelle pour savoir où lancer l'attaque
        this.facing = 'down';

        // Contrôles (ZQSD + Flèches, conservés pour compatibilité + InputManager multi-périphérique)
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
        // Garde 2.5D : bloque les mouvements pendant les dialogues ou la mort
        if (!this.active) {
            this.setVelocity(0);
            return;
        }

        if (this.isAttacking) {
            this.setVelocity(0); // On ne bouge pas pendant qu'on donne un coup d'épée
            return;
        }

        this.setVelocity(0);
        let isMoving = false;
        const im = (typeof window !== 'undefined' && window.inputManager) ? window.inputManager : null;
        const isSprinting = Boolean(this.shiftKey.isDown || (im && im.isDown('SPRINT')));
        let currentSpeed = isSprinting ? this.speed * 1.6 : this.speed;

        let left = this.cursors.left.isDown || this.keys.Q.isDown;
        let right = this.cursors.right.isDown || this.keys.D.isDown;
        let up = this.cursors.up.isDown || this.keys.Z.isDown;
        let down = this.cursors.down.isDown || this.keys.S.isDown;

        // Mouvement unifié : clavier direct (compat tests) ou InputManager (WASD / Stick gauche / D-Pad)
        if (left || right || up || down) {
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

            if (this.body.velocity.x !== 0 && this.body.velocity.y !== 0) {
                this.body.velocity.normalize().scale(currentSpeed);
            }
        } else if (im) {
            const move = im.getMovementVector();
            if (move.magnitude > 0) {
                const vx = move.x * currentSpeed;
                const vy = move.y * currentSpeed;
                this.setVelocity(vx, vy);
                if (Math.abs(move.x) >= Math.abs(move.y)) {
                    this.facing = move.x < 0 ? 'left' : 'right';
                } else {
                    this.facing = move.y < 0 ? 'up' : 'down';
                }
                this.anims.play(`walk-${this.facing}`, true);
                isMoving = true;
            }
        }

        if (!isMoving) {
            this.anims.stop();
            // Retour au frame de repos
            if(this.facing === 'down') this.setFrame(1);
            if(this.facing === 'left') this.setFrame(4);
            if(this.facing === 'right') this.setFrame(7);
            if(this.facing === 'up') this.setFrame(10);
        }

        // Mise à jour de la zone d'interaction (calibrée sur les pieds 2.5D)
        const offset = 35;
        this.interactionHitbox.x = this.x + (this.facing === 'right' ? offset : this.facing === 'left' ? -offset : 0);
        this.interactionHitbox.y = (this.y - 12) + (this.facing === 'down' ? offset : this.facing === 'up' ? -offset : 0);

        // Gestion de l'attaque (Espace, Clic gauche ou Bouton manette X/Carré)
        const attackTriggered = Phaser.Input.Keyboard.JustDown(this.spaceBar) || (im && im.justDown('ATTACK'));
        if (attackTriggered) {
            let aimDir = null;
            if (im) {
                const targets = (this.scene && this.scene.enemies && typeof this.scene.enemies.getChildren === 'function')
                    ? this.scene.enemies.getChildren()
                    : [];
                aimDir = im.getAimDirection(this.x, this.y - 12, this.facing, targets);
                if (aimDir && (aimDir.source === 'mouse' || aimDir.source === 'rightStick')) {
                    this.facing = aimDir.facing;
                }
            }
            this.performActionAttack(aimDir);
        }

        // Depth sorting unifié 2.5D au point de contact au sol (pieds)
        this.setDepth(Math.floor(this.y));
    }

    takeDamage(amount, sourceX = null, sourceY = null) {
        if (!this.active || this.isInvulnerable) return false;
        this.isInvulnerable = true;

        if (typeof window !== 'undefined' && window.gameState && window.gameState.player) {
            window.gameState.player.hp = Math.max(0, window.gameState.player.hp - amount);
            this.hp = window.gameState.player.hp;
        } else {
            this.hp = Math.max(0, this.hp - amount);
        }

        this.setTint(0xff4444);
        if (this.scene && this.scene.cameras && this.scene.cameras.main) {
            this.scene.cameras.main.shake(120, 0.012);
        }
        if (typeof window !== 'undefined' && window.audioManager && window.audioManager.play) {
            window.audioManager.play('hit');
        }
        if (typeof window !== 'undefined' && window.inputManager && typeof window.inputManager.vibrate === 'function') {
            window.inputManager.vibrate('medium');
        }

        // Knockback modéré depuis la source
        if (sourceX !== null && sourceY !== null && typeof Phaser !== 'undefined' && Phaser.Math && Phaser.Math.Vector2) {
            const vec = new Phaser.Math.Vector2(this.x - sourceX, this.y - sourceY).normalize().scale(160);
            this.setVelocity(vec.x, vec.y);
        }

        if (this.scene && this.scene.time && typeof this.scene.time.delayedCall === 'function') {
            this.scene.time.delayedCall(220, () => {
                if (this.active) this.clearTint();
            });
            this.scene.time.delayedCall(600, () => {
                this.isInvulnerable = false;
            });
        } else {
            this.isInvulnerable = false;
        }
        return true;
    }

    performActionAttack(aimDir = null) {
        this.isAttacking = true;
        
        // On positionne la hitbox devant le joueur selon sa direction (ou l'orientation souris/stick droit)
        const offset = 40;
        let dirX = this.facing === 'right' ? 1 : this.facing === 'left' ? -1 : 0;
        let dirY = this.facing === 'down' ? 1 : this.facing === 'up' ? -1 : 0;
        if (aimDir && (aimDir.source === 'mouse' || aimDir.source === 'rightStick')) {
            dirX = aimDir.x;
            dirY = aimDir.y;
        }
        this.weaponHitbox.x = this.x + dirX * offset;
        this.weaponHitbox.y = (this.y - 12) + dirY * offset;
        
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
        
        // Orientation de base selon la direction ou l'angle de visée
        let baseRotation = 0;
        if (aimDir && (aimDir.source === 'mouse' || aimDir.source === 'rightStick')) {
            baseRotation = (aimDir.angle * 180) / Math.PI;
        } else {
            if (this.facing === 'left') baseRotation = 180;
            if (this.facing === 'up') baseRotation = -90;
            if (this.facing === 'down') baseRotation = 90;
        }
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
