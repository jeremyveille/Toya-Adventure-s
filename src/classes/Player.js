class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.movementConfig = GameFeelConfig.movement;
        this.combatConfig = GameFeelConfig.combat;
        this.setScale(0.15);
        this.setOrigin(0.5, 0.95);
        this.setCollideWorldBounds(true);
        // Seuls les pieds sont solides, pas le torse ni l'épée.
        this.body.setSize(120, 67);
        this.body.setOffset(111, 180);
        this.hp = 100;
        this.maxHp = 100;
        this.mp = 50;
        this.maxMp = 50;
        this.speed = this.movementConfig.walkSpeed;
        this.facing = 'down';
        this.isAttacking = false;
        this.attackElapsed = 0;
        this.hitTargets = new Set();
        this.invulnerabilityMs = 0;
        this.knockbackMs = 0;
        this.suppressActionUntilRelease = false;

        this.cursors = scene.input.keyboard.createCursorKeys();
        this.keys = scene.input.keyboard.addKeys('Z,Q,S,D');
        this.spaceBar = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.shiftKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.interactionHitbox = scene.add.zone(x, y, 40, 40);
        this.weaponHitbox = scene.add.zone(x, y, 42, 34);
        scene.physics.add.existing(this.interactionHitbox);
        scene.physics.add.existing(this.weaponHitbox);
        this.interactionHitbox.body.moves = false;
        this.weaponHitbox.body.moves = false;
        this.interactionHitbox.body.allowGravity = false;
        this.weaponHitbox.body.allowGravity = false;
        this.weaponHitbox.body.enable = false;
        this.createAnimations();
        this.syncZones();
        // Zones dynamiques créées hors du Sprite : éviter leur fuite sur transition.
        if (this.once) this.once('destroy', (gameObject, fromScene) => {
            // DisplayList.shutdown parcourt sa liste vivante en ordre inverse.
            // Ses autres enfants doivent rester présents jusqu'à leur propre tour.
            this.cancelAttack(fromScene === true);
            if (fromScene !== true) {
                this.interactionHitbox.destroy();
                this.weaponHitbox.destroy();
            }
        });
    }

    createAnimations() {
        const anims = this.scene.anims;
        ['down', 'left', 'right', 'up'].forEach(direction => {
            if (!anims.exists(`walk-${direction}`)) {
                anims.create({
                    key: `walk-${direction}`,
                    frames: anims.generateFrameNumbers(this.texture.key, { frames: { down: [0, 1, 2], left: [3, 4], right: [7, 8], up: [9, 10, 11] }[direction] }),
                    frameRate: this.movementConfig.animationFps,
                    repeat: -1
                });
            }
        });
    }

    update(time, delta = 1000 / 60) {
        const elapsed = Math.max(0, Math.min(delta, this.movementConfig.maxDeltaMs));
        this.invulnerabilityMs = Math.max(0, this.invulnerabilityMs - elapsed);
        this.knockbackMs = Math.max(0, this.knockbackMs - elapsed);
        if (this.invulnerabilityMs > 0) {
            this.alpha = Math.floor(this.invulnerabilityMs / 70) % 2 ? 0.5 : 1;
        } else {
            this.alpha = 1;
            this.clearTint();
        }
        this.setDepth(Math.floor(this.y));
        this.syncZones();

        // Fin d'un dialogue : Espace doit être relâché avant un nouveau coup.
        if (this.suppressActionUntilRelease && !this.spaceBar.isDown) {
            this.suppressActionUntilRelease = false;
            Phaser.Input.Keyboard.JustDown(this.spaceBar);
        }
        if (!this.active || this.scene.controlsLocked || this.scene.isDead) {
            this.setVelocity(0);
            this.cancelAttack();
            this.playIdle();
            return;
        }
        if (this.knockbackMs > 0) {
            this.cancelAttack();
            this.playIdle();
            return;
        }
        if (this.isAttacking) {
            this.setVelocity(0);
            this.updateAttack(elapsed);
            return;
        }

        const inputX = Number(!!(this.cursors.right.isDown || this.keys.D.isDown)) - Number(!!(this.cursors.left.isDown || this.keys.Q.isDown));
        const inputY = Number(!!(this.cursors.down.isDown || this.keys.S.isDown)) - Number(!!(this.cursors.up.isDown || this.keys.Z.isDown));
        const hasInput = inputX !== 0 || inputY !== 0;
        this.isRunning = hasInput && this.shiftKey.isDown;
        const maxSpeed = this.isRunning ? this.movementConfig.runSpeed : this.speed;
        const inputLength = Math.hypot(inputX, inputY) || 1;
        const targetX = inputX / inputLength * maxSpeed;
        const targetY = inputY / inputLength * maxSpeed;
        const velocity = this.body.velocity;
        const differenceX = targetX - velocity.x;
        const differenceY = targetY - velocity.y;
        const differenceLength = Math.hypot(differenceX, differenceY);
        const maxChange = (hasInput ? this.movementConfig.acceleration : this.movementConfig.deceleration) * elapsed / 1000;
        const ratio = differenceLength > 0 ? Math.min(1, maxChange / differenceLength) : 0;
        let nextX = velocity.x + differenceX * ratio;
        let nextY = velocity.y + differenceY * ratio;
        const nextSpeed = Math.hypot(nextX, nextY);
        if (nextSpeed > maxSpeed) {
            nextX *= maxSpeed / nextSpeed;
            nextY *= maxSpeed / nextSpeed;
        }
        if (!hasInput && nextSpeed < this.movementConfig.idleSpeed) nextX = nextY = 0;
        this.setVelocity(nextX, nextY);

        if (hasInput) {
            // En diagonale, conserver l'axe déjà regardé évite les oscillations.
            const keepsFacing = (this.facing === 'left' && inputX < 0) || (this.facing === 'right' && inputX > 0) ||
                (this.facing === 'up' && inputY < 0) || (this.facing === 'down' && inputY > 0);
            if (!keepsFacing) this.facing = inputY ? (inputY < 0 ? 'up' : 'down') : (inputX < 0 ? 'left' : 'right');
        }
        this.syncZones();
        // Arcade fournit le déplacement réellement effectué, y compris contre un mur.
        const actualSpeed = typeof this.body.deltaX === 'function' && elapsed > 0
            ? Math.min(maxSpeed, Math.hypot(this.body.deltaX(), this.body.deltaY()) * 1000 / elapsed)
            : Math.hypot(nextX, nextY);
        if (actualSpeed > this.movementConfig.idleSpeed) {
            this.anims.play(`walk-${this.facing}`, true);
            this.anims.timeScale = Math.max(0.45, actualSpeed / this.movementConfig.walkSpeed);
        } else {
            this.playIdle();
        }
        if (!this.suppressActionUntilRelease && Phaser.Input.Keyboard.JustDown(this.spaceBar)) this.performActionAttack();
    }

    playIdle() {
        this.anims.stop();
        this.setFrame({ down: 1, left: 4, right: 7, up: 10 }[this.facing]);
    }

    syncZone(zone, x, y) {
        zone.x = x;
        zone.y = y;
        // Déplacer le GameObject ne synchronise pas instantanément son Body Arcade.
        if (zone.body && typeof zone.body.updateFromGameObject === 'function') zone.body.updateFromGameObject();
    }

    syncZones() {
        const vector = { down: [0, 1], left: [-1, 0], right: [1, 0], up: [0, -1] }[this.facing];
        this.syncZone(this.interactionHitbox, this.x + vector[0] * this.movementConfig.interactionDistance,
            this.y - 8 + vector[1] * this.movementConfig.interactionDistance);
        this.syncZone(this.weaponHitbox, this.x + vector[0] * this.combatConfig.reach,
            this.y - 8 + vector[1] * this.combatConfig.reach);
    }

    performActionAttack() {
        if (this.isAttacking || !this.active || this.scene.controlsLocked || this.scene.isDead || this.knockbackMs > 0) return false;
        this.isAttacking = true;
        this.attackElapsed = 0;
        this.hitTargets.clear();
        this.setVelocity(0);
        this.anims.stop();
        this.setFrame({ down: 0, left: 4, right: 8, up: 9 }[this.facing]);
        const horizontal = this.facing === 'left' || this.facing === 'right';
        const width = horizontal ? this.combatConfig.hitboxLength : this.combatConfig.hitboxWidth;
        const height = horizontal ? this.combatConfig.hitboxWidth : this.combatConfig.hitboxLength;
        if (this.weaponHitbox.setSize) this.weaponHitbox.setSize(width, height);
        if (this.weaponHitbox.body.setSize) this.weaponHitbox.body.setSize(width, height);
        this.weaponHitbox.body.enable = false;
        this.syncZones();
        if (this.scene.events) this.scene.events.emit('PlayerAttack', this.facing);
        return true;
    }

    updateAttack(elapsed) {
        this.attackElapsed += elapsed;
        const cfg = this.combatConfig;
        const active = this.attackElapsed >= cfg.windupMs && this.attackElapsed < cfg.windupMs + cfg.activeMs;
        this.weaponHitbox.body.enable = active;
        this.syncZones();
        if (active) {
            this.setFrame({ down: 2, left: 3, right: 7, up: 11 }[this.facing]);
            this.drawSword((this.attackElapsed - cfg.windupMs) / cfg.activeMs);
        } else if (this.slash) {
            this.slash.destroy();
            this.slash = null;
        }
        if (this.attackElapsed >= cfg.windupMs + cfg.activeMs + cfg.recoveryMs) {
            this.cancelAttack();
            this.playIdle();
        }
    }

    drawSword(progress) {
        if (!this.slash) this.slash = this.scene.add.graphics();
        const g = this.slash;
        g.clear();
        g.setPosition(Math.round(this.x), Math.round(this.y - 8));
        g.setDepth(Math.floor(this.y) + (this.facing === 'up' ? -1 : 1));
        const baseAngle = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[this.facing];
        // Chaque point est un carré de pixels ; aucune texture lissée ni arc vectoriel.
        for (let trail = 0; trail < 5; trail++) {
            const angle = baseAngle - 1.1 + progress * 2.2 - trail * 0.17;
            for (let radius = 12; radius <= 42; radius += 4) {
                g.fillStyle(trail === 0 ? 0xfff4cf : 0xdab96e, 1 - trail * 0.16);
                const x = Math.round(Math.cos(angle) * radius / 2) * 2;
                const y = Math.round(Math.sin(angle) * radius / 2) * 2;
                g.fillRect(x - 2, y - 2, 4, 4);
            }
        }
    }

    canHitTarget(target) {
        if (!this.isAttacking || !this.weaponHitbox.body || !this.weaponHitbox.body.enable || this.scene.controlsLocked || this.hitTargets.has(target)) return false;
        this.hitTargets.add(target);
        return true;
    }

    cancelAttack(fromScene = false) {
        this.isAttacking = false;
        if (this.weaponHitbox.body) this.weaponHitbox.body.enable = false;
        if (this.slash) {
            if (fromScene !== true) this.slash.destroy();
            this.slash = null;
        }
    }

    receiveDamage(amount, source) {
        const state = typeof window !== 'undefined' && window.gameState;
        if (!this.active || this.scene.controlsLocked || this.scene.isDead || this.invulnerabilityMs > 0 || !state || state.player.hp <= 0) return false;
        state.player.hp = Math.max(0, state.player.hp - amount);
        this.hp = state.player.hp;
        this.invulnerabilityMs = this.combatConfig.playerInvulnerabilityMs;
        this.knockbackMs = this.combatConfig.playerKnockbackMs;
        this.cancelAttack();
        this.setTint(0xffa8a0);
        const dx = source ? this.x - source.x : 0;
        const dy = source ? this.y - source.y : 1;
        const distance = Math.hypot(dx, dy) || 1;
        this.setVelocity(dx / distance * this.combatConfig.playerKnockbackSpeed,
            dy / distance * this.combatConfig.playerKnockbackSpeed);
        if (this.scene.cameras) this.scene.cameras.main.shake(90, 0.003);
        if (window.audioManager) window.audioManager.play('hit');
        if (this.scene.events) this.scene.events.emit('PlayerDamaged', amount);
        state.save();
        return true;
    }
}
