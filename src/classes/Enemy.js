class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, type) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // "minor" = Action RPG | "major" = Boss Tour-par-Tour
        this.enemyType = type; 

        this.setScale(1);
        this.setOrigin(0.5, 0.95); // Ancrage 2.5D au sol (aux pieds)
        this.setCollideWorldBounds(true);
        this.setImmovable(true);

        // Hitbox 2.5D restreinte strictement à l'empreinte au sol (~36x18 px monde)
        this.body.setSize(26, 12);
        this.body.setOffset(8, 25);
        this.home = { x, y };
        this.phase = 'watch';
        this.phaseUntil = 0;
        this.aiTime = 0;

        this.hp = type === 'minor' ? 30 : 100;
        this.isFlashing = false;
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        this.setDepth(Math.floor(this.y));
        if (this.enemyType === 'minor' && this.hp > 0) {
            this.aiTime += Math.min(delta, 50);
            this.updateGuard();
        }
    }

    updateGuard() {
        const player = this.scene.player;
        const now = this.aiTime;
        const c = GameConfig.combat;
        if (!player || !player.active || this.scene.transitioning) {
            this.setVelocity(0);
            return;
        }
        if (this.phase !== 'watch') {
            if (this.phase === 'lunge' && this.scene.physics.overlap(this, player)) {
                player.takeHit(c.enemyDamage);
            }
            if (now < this.phaseUntil) return;
            if (this.phase === 'warn') {
                this.clearWarning();
                this.phase = 'lunge';
                this.phaseUntil = now + c.lungeMs;
                this.setVelocity(this.aimX * c.lungeSpeed, this.aimY * c.lungeSpeed);
                return;
            }
            this.setVelocity(0);
            if (this.phase === 'lunge' || this.phase === 'hurt') {
                this.clearTint();
                this.isFlashing = false;
                this.phase = 'rest';
                this.phaseUntil = now + c.restMs;
                return;
            }
            this.phase = 'watch';
        }
        const dx = player.x - this.x, dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);
        if (distance < c.warningRange) {
            this.aimX = distance ? dx / distance : 0;
            this.aimY = distance ? dy / distance : 1;
            this.setVelocity(0);
            this.phase = 'warn';
            this.phaseUntil = now + c.warningMs;
            this.setTint(0xffcd79);
            this.warning = this.scene.add.graphics().setDepth(this.depth + 1);
            // Trois repères au sol montrent la direction figée de la charge.
            for (let d = 16; d <= 40; d += 12) {
                const x = Math.round(this.x + this.aimX * d);
                const y = Math.round(this.y + this.aimY * d);
                this.warning.fillStyle(0x603d32).fillRect(x - 4, y - 3, 8, 6);
                this.warning.fillStyle(0xffce65).fillRect(x - 3, y - 2, 6, 4);
            }
        } else {
            const pursue = distance < c.sight && Math.hypot(player.x - this.home.x, player.y - this.home.y) < c.sight * 1.45;
            const tx = pursue ? dx : this.home.x - this.x;
            const ty = pursue ? dy : this.home.y - this.y;
            const length = Math.hypot(tx, ty);
            const speed = length < 3 ? 0 : c.approachSpeed / length;
            this.setVelocity(tx * speed, ty * speed);
        }
    }

    clearWarning() {
        if (this.warning) this.warning.destroy();
        this.warning = null;
        this.clearTint();
    }

    takeDamage(amount) {
        if (this.isFlashing) return; // Invincibilité temporaire

        this.hp -= amount;
        this.isFlashing = true;
        
        this.clearWarning();
        this.phase = 'hurt';
        this.phaseUntil = this.aiTime + GameConfig.combat.knockbackMs;
        this.setTint(0xffaa83);
        const player = this.scene.player;
        const dx = this.x - player.x, dy = this.y - player.y;
        const length = Math.hypot(dx, dy) || 1;
        this.setVelocity(dx / length * GameConfig.combat.knockbackSpeed, dy / length * GameConfig.combat.knockbackSpeed);
        if (this.enemyType !== 'minor') {
            this.scene.time.delayedCall(GameConfig.combat.knockbackMs, () => {
                if (!this.active) return;
                this.setVelocity(0);
                this.clearTint();
                this.isFlashing = false;
            });
        }

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.clearWarning();
        if (this.onDefeat) this.onDefeat();
        if(this.shadow) {
            this.shadow.destroy();
            this.shadow = null;
        }
        
        // Gain XP et Gold
        if(this.scene && window.gameState) {
            window.gameState.player.xp += 20;
            window.gameState.player.gold += 5;
            let leveledUp = window.gameState.checkLevelUp();
            window.gameState.save();

            // Textes flottants pour XP et Gold
            let xpText = this.scene.add.text(this.x, this.y - 40, "+20 XP · +5 or", { fontSize: '14px', fontFamily: '"Press Start 2P"', color: '#ffff00', align: 'center' }).setOrigin(0.5);
            xpText.setDepth(9002);
            this.scene.tweens.add({ targets: xpText, y: this.y - 80, alpha: 0, duration: 1500, onComplete: () => xpText.destroy() });

            // Feedback Level Up
            if (leveledUp && this.scene.player) {
                let lvlText = this.scene.add.text(this.scene.player.x, this.scene.player.y - 60, "LEVEL UP!", { fontSize: '20px', fontFamily: '"Press Start 2P"', color: '#00ff00', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
                lvlText.setDepth(9002);
                this.scene.tweens.add({ targets: lvlText, y: this.scene.player.y - 110, alpha: 0, duration: 2500, onComplete: () => lvlText.destroy() });
                this.scene.cameras.main.flash(500, 255, 255, 255); // Flash blanc de niveau
                if (window.audioManager.play) window.audioManager.play('levelup');
            }
        }

        // Petite explosion particule basique
        for(let i=0; i<5; i++){
            let p = this.scene.add.rectangle(this.x, this.y - 15, 10, 10, 0xff0000);
            p.setDepth(Math.floor(this.y) + 5);
            this.scene.physics.add.existing(p);
            p.body.setVelocity(Phaser.Math.Between(-100,100), Phaser.Math.Between(-100,100));
            this.scene.tweens.add({ targets: p, alpha: 0, duration: 500, onComplete: () => p.destroy() });
        }
        
        this.destroy();
    }
}
