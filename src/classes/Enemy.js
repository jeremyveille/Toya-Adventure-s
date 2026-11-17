class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, type = 'minor') {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.settings = GameFeelConfig.enemy;
        this.enemyType = type;
        const pixelSprite = texture === 'tex_slime';
        this.setScale(pixelSprite ? 1 : 0.12);
        this.setOrigin(0.5, 0.95);
        this.setCollideWorldBounds(true);
        // Arcade doit pouvoir séparer ce corps des murs statiques.
        this.setImmovable(false);
        this.body.setSize(pixelSprite ? 32 : 300, pixelSprite ? 14 : 150);
        this.body.setOffset(pixelSprite ? 16 : 362, pixelSprite ? 44 : 850);

        this.hp = type === 'minor' ? 30 : 100;
        this.isFlashing = false;
        this.state = 'idle';
        this.stateRemaining = 250;
        this.attackVector = { x: 0, y: 1 };
        this.projectiles = new Set();
        this.warning = null;
        this.defeated = false;
        if (scene.events) scene.events.once('shutdown', this.onSceneShutdown, this);
    }

    changeState(state, duration = 0) {
        this.state = state;
        this.stateRemaining = duration;
        if (state !== 'lunge' && state !== 'hurt') this.setVelocity(0);
        if (state !== 'telegraph' && this.warning) {
            this.warning.destroy();
            this.warning = null;
        }
        if (state === 'telegraph') {
            // Rectangles espacés : direction verrouillée et anticipation lisible au sol.
            this.warning = this.scene.add.graphics();
            this.warning.setDepth(Math.floor(this.y) - 0.1);
            this.warning.fillStyle(0xefba55, 0.75);
            for (let i = 12; i <= 54; i += 10) {
                const px = Math.round((this.x + this.attackVector.x * i) / 2) * 2;
                const py = Math.round((this.y + this.attackVector.y * i - 3) / 2) * 2;
                this.warning.fillRect(px - 3, py - 3, 6, 6);
            }
            this.setTint(0xffd074);
        } else if (state !== 'hurt') {
            this.clearTint();
        }
    }

    preUpdate(time, delta) {
        if (super.preUpdate) super.preUpdate(time, delta);
        if (!this.active || this.hp <= 0) return;
        this.setDepth(Math.floor(this.y));
        const player = this.scene.player;
        const locked = !player || !player.active || this.scene.controlsLocked || this.scene.isDead;
        this.projectiles.forEach(record => {
            record.bullet.body.setVelocity(locked ? 0 : record.velocityX, locked ? 0 : record.velocityY);
            record.bullet.setDepth(Math.floor(record.bullet.y + 7));
            if (record.timer) record.timer.paused = Boolean(locked);
        });
        if (this.enemyType === 'major' || locked) {
            this.setVelocity(0);
            return;
        }

        const elapsed = Math.min(Math.max(delta || 1000 / 60, 0), 100);
        this.stateRemaining -= elapsed;
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);
        const ux = distance > 0 ? dx / distance : 0;
        const uy = distance > 0 ? dy / distance : 1;
        const attackRange = this.enemyType === 'shooter' ? 170 : this.settings.attackRange;

        if (this.state === 'hurt') {
            if (this.stateRemaining <= 0) {
                this.isFlashing = false;
                this.changeState('recover', this.settings.recoveryMs * 0.5);
            }
            return;
        }
        if (this.state === 'telegraph') {
            if (this.stateRemaining <= 0) {
                if (this.enemyType === 'shooter') {
                    this.shootAtPlayer();
                    this.changeState('recover', this.settings.recoveryMs);
                } else {
                    this.changeState('lunge', this.settings.lungeMs);
                    this.setVelocity(this.attackVector.x * this.settings.lungeSpeed, this.attackVector.y * this.settings.lungeSpeed);
                }
            }
            return;
        }
        if (this.state === 'lunge') {
            if (this.stateRemaining <= 0) this.changeState('recover', this.settings.recoveryMs);
            else this.setVelocity(this.attackVector.x * this.settings.lungeSpeed, this.attackVector.y * this.settings.lungeSpeed);
            return;
        }
        if (this.state === 'recover' && this.stateRemaining > 0) return;
        if (distance > this.settings.detectionRadius) {
            this.changeState('idle');
            return;
        }
        if (distance <= attackRange) {
            this.attackVector = { x: ux, y: uy };
            this.changeState('telegraph', this.settings.telegraphMs);
            return;
        }
        this.changeState('approach');
        this.setVelocity(ux * this.settings.walkSpeed, uy * this.settings.walkSpeed);
    }

    canDamagePlayer() {
        return this.active && this.hp > 0 && this.state === 'lunge' && !this.scene.controlsLocked;
    }

    shootAtPlayer() {
        if (!this.active || this.hp <= 0 || !this.scene.player || this.scene.controlsLocked) return;
        const scene = this.scene;
        const bullet = scene.add.rectangle(this.x, this.y - 6, 8, 8, 0xe9b766);
        scene.physics.add.existing(bullet);
        bullet.setDepth(Math.floor(this.y) + 1);
        bullet.body.setVelocity(this.attackVector.x * this.settings.projectileSpeed, this.attackVector.y * this.settings.projectileSpeed);
        const record = {
            bullet, colliders: [], timer: null, remove: null,
            velocityX: this.attackVector.x * this.settings.projectileSpeed,
            velocityY: this.attackVector.y * this.settings.projectileSpeed
        };
        record.remove = (fromScene = false) => {
            if (!this.projectiles.has(record)) return;
            this.projectiles.delete(record);
            if (record.timer) record.timer.remove(false);
            record.colliders.forEach(collider => collider.destroy());
            if (fromScene !== true && bullet.active) bullet.destroy();
        };
        this.projectiles.add(record);
        record.colliders.push(scene.physics.add.overlap(scene.player, bullet, player => {
            player.receiveDamage(this.settings.contactDamage, bullet);
            record.remove();
        }));
        if (scene.walls) record.colliders.push(scene.physics.add.collider(bullet, scene.walls, record.remove));
        record.timer = scene.time.delayedCall(this.settings.projectileLifetimeMs, record.remove);
    }

    takeDamage(amount, source = this.scene.player) {
        if (!this.active || this.hp <= 0 || this.isFlashing) return false;
        this.hp -= amount;
        this.isFlashing = true;
        this.changeState('hurt', this.settings.hurtMs);
        this.setTint(0xffdfba);
        let dx = source ? this.x - source.x : 0;
        let dy = source ? this.y - source.y : 1;
        const distance = Math.hypot(dx, dy) || 1;
        if (dx === 0 && dy === 0) dy = 1;
        this.setVelocity(dx / distance * this.settings.knockbackSpeed, dy / distance * this.settings.knockbackSpeed);
        this.spawnImpact();
        if (this.hp <= 0) this.die();
        return true;
    }

    spawnImpact() {
        for (let i = 0; i < 4; i++) {
            const p = this.scene.add.rectangle(Math.round(this.x), Math.round(this.y - 16), 4, 4, i % 2 ? 0xffe2a4 : 0xffffff);
            p.setDepth(Math.floor(this.y) + 2);
            this.scene.tweens.add({ targets: p, x: p.x + (i % 2 ? 16 : -16), y: p.y + (i < 2 ? -14 : 8), alpha: 0, duration: 180, onComplete: () => p.destroy() });
        }
    }

    die() {
        if (this.defeated) return;
        this.defeated = true;
        const scene = this.scene;
        this.cleanup();
        if (scene && window.gameState) {
            window.gameState.player.xp += 20;
            window.gameState.player.gold += 5;
            const leveledUp = window.gameState.checkLevelUp();
            if (scene.events) scene.events.emit('EnemyDefeated', this.spawnId);
            window.gameState.save();
            const xpText = scene.add.text(this.x, this.y - 40, '+20 XP  +5 Or', {
                fontSize: '11px', fontFamily: 'monospace', color: '#ffe1a3', stroke: '#27332d', strokeThickness: 3
            });
            xpText.setOrigin(0.5);
            xpText.setDepth(9002);
            scene.tweens.add({ targets: xpText, y: this.y - 70, alpha: 0, duration: 1200, onComplete: () => xpText.destroy() });
            if (leveledUp && scene.player) {
                const label = scene.add.text(scene.player.x, scene.player.y - 60, 'NIVEAU +1', {
                    fontSize: '14px', fontFamily: 'monospace', color: '#fff1bb', stroke: '#27332d', strokeThickness: 3
                });
                label.setOrigin(0.5);
                label.setDepth(9002);
                scene.tweens.add({ targets: label, y: label.y - 30, alpha: 0, duration: 1800, onComplete: () => label.destroy() });
                if (window.audioManager) window.audioManager.play('levelup');
            }
        }
        this.destroy();
    }

    onSceneShutdown() {
        this.cleanup(true);
    }

    cleanup(fromScene = false) {
        if (this.warning) {
            if (fromScene !== true) this.warning.destroy();
            this.warning = null;
        }
        if (this.shadow) {
            if (fromScene !== true) this.shadow.destroy();
            this.shadow = null;
        }
        this.projectiles.forEach(record => record.remove(fromScene === true));
    }

    destroy(fromScene) {
        if (this.scene && this.scene.events) this.scene.events.off('shutdown', this.onSceneShutdown, this);
        // Laisser Phaser détruire chaque sibling pendant DisplayList.shutdown.
        this.cleanup(fromScene === true);
        super.destroy(fromScene);
    }
}
