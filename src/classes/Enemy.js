class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, type) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // "minor" = Action RPG | "major" = Boss Tour-par-Tour
        this.enemyType = type; 

        // Hitbox et échelle 2.5D calibrées selon la texture et le type
        if (texture === 'enemy') {
            this.setScale(0.12);
            this.body.setSize(300, 150);
            this.body.setOffset(362, 850);
        } else if (texture === 'monster_boss' || type === 'major') {
            this.setScale(1.0);
            this.body.setSize(72, 36);
            this.body.setOffset(28, 86);
        } else {
            // Texture découpée mineure (ex: monster_slime, monster_shooter, 64x64 px)
            this.setScale(1.0);
            this.body.setSize(36, 18);
            this.body.setOffset(14, 43);
        }

        this.setOrigin(0.5, 0.95); // Ancrage 2.5D au sol (aux pieds)
        this.setCollideWorldBounds(true);
        this.setImmovable(true);

        this.hp = (type === 'minor' || type === 'slime_charger') ? 30 : 100;
        this.isFlashing = false;
        this.isDead = false;

        // Mouvement aléatoire / IA charger
        if(this.enemyType === 'minor' || this.enemyType === 'shooter' || this.enemyType === 'slime_charger' || this.enemyType === 'goblin_shooter') {
            this.moveEvent = scene.time.addEvent({
                delay: 2000,
                callback: this.randomWander,
                callbackScope: this,
                loop: true
            });
        }

        // Tir pour le shooter
        if (this.enemyType === 'shooter' || this.enemyType === 'goblin_shooter') {
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
        if(this.isFlashing || this.isDead) return; // Ne bouge pas quand on prend un coup ou mort

        // IA Charger : fonce vers le joueur s'il est proche (< 180px)
        const player = this.scene && this.scene.player;
        const isPlayerAlive = player && (player.active !== false) &&
            (!window.gameState || !window.gameState.player || window.gameState.player.hp > 0) &&
            (player.hp === undefined || player.hp > 0);

        if (isPlayerAlive && (this.enemyType === 'minor' || this.enemyType === 'slime_charger')) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 180 * 180 && distSq > 0.001) {
                let vec = new Phaser.Math.Vector2(dx, dy).normalize().scale(110);
                this.setVelocity(vec.x, vec.y);
                return;
            }
        }

        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [0,0]];
        const dir = Phaser.Utils.Array.GetRandom(directions);
        this.setVelocity(dir[0] * 50, dir[1] * 50);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        // Depth sorting unifié 2.5D aux pieds
        this.setDepth(Math.floor(this.y));
    }

    shootAtPlayer() {
        if (this.hp <= 0 || !this.scene || !this.scene.player) return;
        
        let dx = this.scene.player.x - this.x;
        let dy = (this.scene.player.y - 15) - (this.y - 20);
        
        // Tire seulement si proche (max 400px)
        if (dx*dx + dy*dy > 400*400) return;
        
        let vec = new Phaser.Math.Vector2(dx, dy).normalize().scale(250);
        let bullet = this.scene.add.circle(this.x, this.y - 20, 8, 0xff0000);
        this.scene.physics.add.existing(bullet);
        bullet.body.setVelocity(vec.x, vec.y);
        bullet.setDepth(Math.floor(this.y) + 10);
        
        this.scene.time.delayedCall(2000, () => {
            if (bullet && bullet.active) bullet.destroy();
        });
        
        this.scene.physics.add.overlap(this.scene.player, bullet, (p, b) => {
            if (b && b.active) b.destroy();
            window.gameState.player.hp -= 10;
            this.scene.cameras.main.shake(100, 0.01);
            if (window.audioManager && window.audioManager.play) window.audioManager.play('hit');
            // Effet rouge sur le joueur
            p.setTint(0xff0000);
            this.scene.time.delayedCall(200, () => p.clearTint());
        }, null, this.scene);
    }

    takeDamage(amount) {
        if (this.isFlashing || this.isDead) return; // Invincibilité temporaire ou déjà mort

        this.hp -= amount;
        this.isFlashing = true;
        
        // Effet de dégat
        this.setTint(0xff0000);
        this.scene.time.delayedCall(300, () => {
            if (this.active) {
                this.clearTint();
                this.isFlashing = false;
            }
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
        if (this.isDead) return;
        this.isDead = true;

        if(this.moveEvent) this.moveEvent.remove();
        if(this.shootEvent) this.shootEvent.remove();
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
            let xpText = this.scene.add.text(this.x, this.y - 40, "+20 XP\n+5 Gold", { fontSize: '14px', fontFamily: '"Press Start 2P"', color: '#ffff00', align: 'center' }).setOrigin(0.5);
            xpText.setDepth(9002);
            this.scene.tweens.add({ targets: xpText, y: this.y - 80, alpha: 0, duration: 1500, onComplete: () => xpText.destroy() });

            // Feedback Level Up
            if (leveledUp && this.scene.player) {
                let lvlText = this.scene.add.text(this.scene.player.x, this.scene.player.y - 60, "LEVEL UP!", { fontSize: '20px', fontFamily: '"Press Start 2P"', color: '#00ff00', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
                lvlText.setDepth(9002);
                this.scene.tweens.add({ targets: lvlText, y: this.scene.player.y - 110, alpha: 0, duration: 2500, onComplete: () => lvlText.destroy() });
                this.scene.cameras.main.flash(500, 255, 255, 255); // Flash blanc de niveau
                if (window.audioManager && window.audioManager.play) window.audioManager.play('levelup');
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
