class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, type) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // "minor" = Acton RPG | "major" = Boss Tour-par-Tour
        this.enemyType = type; 

        this.setScale(0.12);
        this.setCollideWorldBounds(true);
        this.setImmovable(true);

        this.hp = type === 'minor' ? 30 : 100;
        this.isFlashing = false;

        // Mouvement aléatoire simple
        if(this.enemyType === 'minor' || this.enemyType === 'shooter') {
            this.moveEvent = scene.time.addEvent({
                delay: 2000,
                callback: this.randomWander,
                callbackScope: this,
                loop: true
            });
        }

        // Tir pour le shooter
        if (this.enemyType === 'shooter') {
            this.setTint(0x00ffff); // Cyan
            this.shootEvent = scene.time.addEvent({
                delay: 3000,
                callback: this.shootAtPlayer,
                callbackScope: this,
                loop: true
            });
        }
    }

    randomWander() {
        if(this.isFlashing) return; // Ne bouge pas quand on prend un coup
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [0,0]];
        const dir = Phaser.Utils.Array.GetRandom(directions);
        this.setVelocity(dir[0] * 50, dir[1] * 50);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        this.setDepth(this.y);
    }

    shootAtPlayer() {
        if (this.hp <= 0 || !this.scene || !this.scene.player) return;
        
        let dx = this.scene.player.x - this.x;
        let dy = this.scene.player.y - this.y;
        
        // Tire seulement si proche (max 400px)
        if (dx*dx + dy*dy > 400*400) return;
        
        let vec = new Phaser.Math.Vector2(dx, dy).normalize().scale(250);
        let bullet = this.scene.add.circle(this.x, this.y, 8, 0xff0000);
        this.scene.physics.add.existing(bullet);
        bullet.body.setVelocity(vec.x, vec.y);
        
        this.scene.time.delayedCall(2000, () => {
            if (bullet && bullet.active) bullet.destroy();
        });
        
        this.scene.physics.add.overlap(this.scene.player, bullet, (p, b) => {
            if (b && b.active) b.destroy();
            window.gameState.player.hp -= 10;
            this.scene.cameras.main.shake(100, 0.01);
            if (window.audioManager.play) window.audioManager.play('hit');
            // Effet rouge sur le joueur
            p.setTint(0xff0000);
            this.scene.time.delayedCall(200, () => p.clearTint());
        }, null, this.scene);
    }

    takeDamage(amount) {
        if (this.isFlashing) return; // Invincibilité temporaire

        this.hp -= amount;
        this.isFlashing = true;
        
        // Effet de dégat
        this.setTint(0xff0000);
        this.scene.time.delayedCall(300, () => {
            this.clearTint();
            this.isFlashing = false;
        });

        // Knockback (repousse en arrière depuis le joueur)
        if (this.scene && this.scene.player) {
            let dx = this.x - this.scene.player.x;
            let dy = this.y - this.scene.player.y;
            let vec = new Phaser.Math.Vector2(dx, dy).normalize().scale(200);
            this.setVelocity(vec.x, vec.y);
        } else {
            this.setVelocity(-this.body.velocity.x * 2, -this.body.velocity.y * 2);
        }

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        if(this.moveEvent) this.moveEvent.remove();
        if(this.shootEvent) this.shootEvent.remove();
        
        // Gain XP et Gold
        if(this.scene && window.gameState) {
            window.gameState.player.xp += 20;
            window.gameState.player.gold += 5;
            let leveledUp = window.gameState.checkLevelUp();
            window.gameState.save();

            // Textes flottants pour XP et Gold
            let xpText = this.scene.add.text(this.x, this.y - 20, "+20 XP\n+5 Gold", { fontSize: '14px', fontFamily: '"Press Start 2P"', color: '#ffff00', align: 'center' }).setOrigin(0.5);
            this.scene.tweens.add({ targets: xpText, y: this.y - 60, alpha: 0, duration: 1500, onComplete: () => xpText.destroy() });

            // Feedback Level Up
            if (leveledUp && this.scene.player) {
                let lvlText = this.scene.add.text(this.scene.player.x, this.scene.player.y - 50, "LEVEL UP!", { fontSize: '20px', fontFamily: '"Press Start 2P"', color: '#00ff00', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
                this.scene.tweens.add({ targets: lvlText, y: this.scene.player.y - 100, alpha: 0, duration: 2500, onComplete: () => lvlText.destroy() });
                this.scene.cameras.main.flash(500, 255, 255, 255); // Flash blanc de niveau
                if (window.audioManager.play) window.audioManager.play('levelup');
            }
        }

        // Petite explosion particule basique
        for(let i=0; i<5; i++){
            let p = this.scene.add.rectangle(this.x, this.y, 10, 10, 0xff0000);
            this.scene.physics.add.existing(p);
            p.body.setVelocity(Phaser.Math.Between(-100,100), Phaser.Math.Between(-100,100));
            this.scene.tweens.add({ targets: p, alpha: 0, duration: 500, onComplete: () => p.destroy() });
        }
        
        this.destroy();
    }
}
