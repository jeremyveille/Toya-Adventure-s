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
        this.hitTargets = new Set();
        this.hurtUntil = 0;
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
        this.weaponHitbox = scene.add.zone(0, 0, 1, 1);
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
        if (this.isAttacking && this.active) this.updateAttack(delta);
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

        this.interactionHitbox.body.updateFromGameObject();
        const attackPressed = Phaser.Input.Keyboard.JustDown(this.spaceBar);
        if (this.waitForSpaceRelease) {
            if (!this.spaceBar.isDown) this.waitForSpaceRelease = false;
        } else if (attackPressed) this.performActionAttack();
    }

    performActionAttack() {
        if (!this.active || this.isAttacking) return;
        this.isAttacking = true;
        this.attackTime = 0;
        this.hitTargets.clear();
        this.setVelocity(0);
        this.anims.stop();
        this.attackRow = { down: 0, left: 3, right: 6, up: 9 }[this.facing];
        this.setFrame(this.attackRow);
        if (window.audioManager) window.audioManager.play('swing');
        this.slash = this.scene.add.graphics();
        this.slash.setDepth(this.depth + (this.facing === 'up' ? -0.1 : 1));
        this.updateAttack(0);
    }

    updateAttack(delta) {
        const c = GameConfig.combat;
        this.attackTime += Math.min(delta, 50);
        const t = this.attackTime;
        const end = c.windupMs + c.strikeMs;
        const active = t >= c.windupMs && t < end;
        if (t >= end + c.recoverMs) {
            this.weaponHitbox.body.setEnable(false);
            this.slash.destroy();
            this.isAttacking = false;
            return;
        }

        const [dx, dy] = { down: [0, 1], up: [0, -1], right: [1, 0], left: [-1, 0] }[this.facing];
        if (active && !this.weaponHitbox.body.enable) {
            const length = c.reach - 4;
            const half = c.reach - length / 2;
            this.weaponHitbox.setSize(dx ? length : c.width, dy ? length : c.width);
            this.weaponHitbox.body.setSize(this.weaponHitbox.width, this.weaponHitbox.height, false);
            this.weaponHitbox.body.reset(this.x + dx * half, this.y - 5 + dy * half);
            this.setFrame(this.attackRow + 2);
        }
        this.weaponHitbox.body.setEnable(active);
        const swing = Phaser.Math.Clamp((t - c.windupMs) / c.strikeMs, 0, 1);
        const sweep = (swing - 0.5) * 1.35;
        const angle = Math.atan2(dy, dx) + sweep;
        const blade = this.slash;
        blade.clear();
        if (t >= end) {
            this.setFrame(this.attackRow + 1);
            return;
        }
        // Une lame en pixels entiers, une poignée en laiton et un fil clair.
        const radius = active ? c.reach : c.reach * 0.55;
        for (let r = 7; r <= radius; r += 2) {
            const x = Math.round(this.x + Math.cos(angle) * r);
            const y = Math.round(this.y - 10 + Math.sin(angle) * r);
            blade.fillStyle(r < 14 ? 0x63432d : r < 18 ? 0xe5ae55 : 0x5e7581);
            blade.fillRect(x - 2, y - 2, 5, 5);
            if (r >= 18) {
                blade.fillStyle(0xfff2ce);
                blade.fillRect(x - 2, y - 2, 3, 3);
            }
        }
    }

    takeHit(damage) {
        const now = this.scene.time.now;
        if (!this.active || now < this.hurtUntil || this.scene.transitioning) return false;
        this.hurtUntil = now + GameConfig.combat.hurtMs;
        const stats = window.gameState.player;
        stats.hp = Math.max(0, stats.hp - damage);
        this.setTint(0xffb093);
        this.scene.tweens.add({
            targets: this, alpha: 0.5, yoyo: true, repeat: 3,
            duration: GameConfig.combat.hurtMs / 8,
            onComplete: () => { this.clearTint(); this.setAlpha(1); }
        });
        this.scene.events.emit('Notice', '−' + damage + ' PV');
        if (this.scene.floatText) this.scene.floatText(this.x, this.y - 46, '−' + damage, '#ff9a7a');
        if (this.scene.hitStop) this.scene.hitStop(70);
        if (this.scene.cameras && this.scene.cameras.main) this.scene.cameras.main.shake(120, 0.007);
        if (window.audioManager) window.audioManager.play('hurt');
        return true;
    }
}
