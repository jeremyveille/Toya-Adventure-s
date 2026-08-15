class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
    }

    create() {
        // Fond de combat, style Toriyama (désert/forêt simplifiée)
        this.add.image(0, 0, 'tiles').setOrigin(0,0).setScale(1.5).setTint(0x777777); // Assombrit
        this.cameras.main.fadeIn(500, 255, 255, 255); // Le flash de transition

        // Joueur : on utilise la frame où il regarde à droite (Frame 7 ou 8)
        this.playerSprite = this.add.sprite(150, 350, 'hero', 7);
        this.playerSprite.setScale(0.8);
        
        // Ennemi (Le boss rose qu'on a touché)
        this.enemySprite = this.add.sprite(650, 350, 'enemy');
        this.enemySprite.setScale(0.5);
        this.enemySprite.setTint(0xff00ff);

        // Stats du combat
        let p = window.gameState.player;
        this.playerHp = p.hp;
        this.playerMaxHp = p.maxHp;
        this.playerMp = p.mp; // Points de magie
        this.enemyHp = 200;
        this.enemyMaxHp = 200;

        // Émission initiale des stats vers l'UI
        this.time.delayedCall(10, () => {
            this.updateUIBars();
        });

        // Lancer la scène d'interface par-dessus !
        this.scene.launch('UIScene');
        this.events.emit('Message', `Le Gardien des Lieux attaque !`);
    }

    updateUIBars() {
        this.events.emit('UpdateStats', {
            php: this.playerHp, pmax: this.playerMaxHp,
            pmp: this.playerMp,
            ehp: this.enemyHp, emax: this.enemyMaxHp
        });
    }

    // Fonction appelée par la scène UI quand on clique sur une action
    receivePlayerSelection(action) {
        if(action === 'attack') {
            this.events.emit('Message', `Attaque physique !`);
            
            // Tween d'attaque : le perso saute vers l'avant !
            this.tweens.add({
                targets: this.playerSprite,
                x: 500,
                duration: 200,
                yoyo: true, // Revient à sa place
                onYoyo: () => {
                    // Au moment d'impacter
                    this.enemySprite.setTint(0xff0000);
                    this.cameras.main.shake(100, 0.01);
                    let dmg = window.gameState.player.damage + Phaser.Math.Between(-5, 5);
                    this.enemyHp -= dmg;
                    this.showFloatingText(this.enemySprite.x, this.enemySprite.y - 50, `-${dmg}`, 0xffffff);
                    this.updateUIBars();
                    
                    this.time.delayedCall(200, () => this.enemySprite.setTint(0xff00ff));
                },
                onComplete: () => this.time.delayedCall(1000, this.enemyTurn, [], this)
            });

        } else if (action === 'magic') {
            if (this.playerMp >= 15) {
                this.playerMp -= 15;
                this.updateUIBars();
                this.events.emit('Message', `Magie Explosive !`);
                
                // Effet visuel simple avec des formes géométriques
                for(let i=0; i<10; i++){
                    let spark = this.add.circle(650, 350, 20, 0x00ffff);
                    this.tweens.add({
                        targets: spark, x: 650 + Phaser.Math.Between(-100,100), y: 350 + Phaser.Math.Between(-100,100),
                        alpha: 0, scale: 0.1, duration: 800, onComplete: () => spark.destroy()
                    });
                }

                this.time.delayedCall(400, () => {
                     let dmg = 60 + Phaser.Math.Between(-10, 10);
                     this.enemyHp -= dmg;
                     this.showFloatingText(this.enemySprite.x, this.enemySprite.y - 50, `-${dmg}`, 0x00ffff);
                     this.updateUIBars();
                     this.enemySprite.setTintFill(0xffffff);
                     this.cameras.main.shake(300, 0.02);
                     this.time.delayedCall(200, () => this.enemySprite.setTint(0xff00ff));
                     
                     this.time.delayedCall(1000, this.enemyTurn, [], this);
                });
            } else {
                this.events.emit('Message', `Plus assez de Magie !`);
                this.events.emit('EnableMenu'); // Redonne la main
            }
        } else if (action === 'heal') {
            if (this.playerMp >= 10) {
                this.playerMp -= 10;
                let healAmount = 40;
                this.playerHp = Phaser.Math.Clamp(this.playerHp + healAmount, 0, this.playerMaxHp);
                this.updateUIBars();
                
                this.events.emit('Message', `Soin de Lumière !`);
                
                // Effet visuel de soin
                for(let i=0; i<15; i++){
                    let spark = this.add.circle(150 + Phaser.Math.Between(-30,30), 350 + Phaser.Math.Between(0, 50), 10, 0x00ff00);
                    this.tweens.add({
                        targets: spark, y: spark.y - 100, alpha: 0, scale: 0.1, duration: 1000, onComplete: () => spark.destroy()
                    });
                }
                this.showFloatingText(150, 350, `+${healAmount}`, 0x00ff00);

                this.time.delayedCall(1500, this.enemyTurn, [], this);
            } else {
                this.events.emit('Message', `Plus assez de Magie !`);
                this.events.emit('EnableMenu');
            }
        } else if (action === 'flee') {
            if (Math.random() > 0.5) {
                this.events.emit('Message', `Vous avez fui le combat !`);
                this.time.delayedCall(1500, this.endBattle, [], this);
            } else {
                this.events.emit('Message', `La fuite a échoué !`);
                this.time.delayedCall(1500, this.enemyTurn, [], this);
            }
        }
    }

    showFloatingText(x, y, message, color) {
        let txt = this.add.text(x, y, message, {
            fontSize: '24px', fontFamily: '"Press Start 2P", Courier', color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        });
        txt.setTint(color);
        txt.setOrigin(0.5);
        this.tweens.add({
            targets: txt,
            y: y - 50,
            alpha: 0,
            duration: 1000,
            onComplete: () => txt.destroy()
        });
    }

    enemyTurn() {
        if(this.enemyHp <= 0) {
            this.events.emit('Message', `Le Gardien est vaincu !`);
            
            // Animation de mort du boss
            this.tweens.add({
                targets: this.enemySprite, alpha: 0, y: 400, duration: 1000,
                onComplete: () => this.time.delayedCall(1000, this.endBattle, [], this)
            });
            return;
        }

        this.events.emit('Message', `Le Gardien riposte !`);
        
        // Le boss attaque (grosse boule rouge)
        let nrg = this.add.circle(650, 350, 30, 0xff0000);
        this.tweens.add({
            targets: nrg, x: 150, duration: 400,
            onComplete: () => {
                nrg.destroy();
                this.cameras.main.shake(200, 0.02);
                this.playerSprite.setTint(0xff0000);
                this.time.delayedCall(200, () => this.playerSprite.clearTint());

                let dmg = 30 + Phaser.Math.Between(-5, 5);
                this.playerHp -= dmg;
                this.showFloatingText(this.playerSprite.x, this.playerSprite.y - 50, `-${dmg}`, 0xff0000);
                this.updateUIBars();

                if(this.playerHp <= 0) {
                    this.events.emit('Message', `Vous etes mort...`);
                    this.time.delayedCall(2000, () => window.location.reload() );
                } else {
                    // Redonne la main au joueur
                    this.time.delayedCall(1000, () => this.events.emit('EnableMenu'));
                }
            }
        })
    }

    endBattle() {
        // Sauvegarder les HPs restants
        window.gameState.player.hp = this.playerHp;
        window.gameState.player.mp = this.playerMp;
        window.gameState.save();

        // Redonner le contrôle de la scène principale
        this.scene.stop('UIScene');
        this.scene.wake('WorldScene');
        this.scene.stop();
    }
}
