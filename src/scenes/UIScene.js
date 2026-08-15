class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        // Dessin du cadre bas
        this.graphics = this.add.graphics();
        this.graphics.lineStyle(4, 0xffffff);
        this.graphics.fillStyle(0x111133, 0.9); // Bleu foncé
        this.graphics.fillRect(10, 450, 780, 140);
        this.graphics.strokeRect(10, 450, 780, 140);

        // Zone de message
        this.messageText = this.add.text(30, 470, "", { color: '#ffffff', fontSize: '20px', fontFamily: 'Courier' });

        // Menu d'actions
        this.menus = [];
        this.createMenuItem(450, 470, "> Attaquer", 'attack');
        this.createMenuItem(450, 510, "> Magie (PM: 15)", 'magic');
        this.createMenuItem(650, 470, "> Soin (PM: 10)", 'heal');
        this.createMenuItem(650, 510, "> Fuir", 'flee');

        // Créer les graphiques pour les Barres de vie
        this.hpGraphics = this.add.graphics();
        this.barTexts = []; // Pour stocker et mettre à jour les textes des barres
        this.battleScene = this.scene.get('BattleScene');
        this.battleScene.events.on('Message', this.updateMessage, this);
        this.battleScene.events.on('EnableMenu', this.enableMenu, this);
        this.battleScene.events.on('UpdateStats', this.drawBars, this);
    }

    createMenuItem(x, y, text, id) {
        let txt = this.add.text(x, y, text, { color: '#ffffff', fontSize: '20px', fontFamily: 'Courier' })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.selectAction(id))
            .on('pointerover', () => txt.setColor('#ffff00'))
            .on('pointerout', () => txt.setColor('#ffffff'));
        
        this.menus.push(txt);
        return txt;
    }

    drawBars(stats) {
        this.hpGraphics.clear();
        this.barTexts.forEach(t => t.destroy());
        this.barTexts = [];

        // Fonction locale
        const drawBar = (x, y, val, max, color, labelText) => {
            let width = 200;
            // Background
            this.hpGraphics.fillStyle(0x000000);
            this.hpGraphics.fillRect(x, y, width, 15);
            // Filled
            let percent = Phaser.Math.Clamp(val / max, 0, 1);
            this.hpGraphics.fillStyle(color);
            this.hpGraphics.fillRect(x, y, width * percent, 15);
            // Border
            this.hpGraphics.lineStyle(2, 0xffffff);
            this.hpGraphics.strokeRect(x, y, width, 15);
            
            // Label
            let txt = this.add.text(x + width + 10, y - 2, `${labelText} ${val}/${max}`, { fontSize: '14px', fontFamily: 'Courier', color: '#ffffff' });
            this.barTexts.push(txt);
        }

        // Joueur : HP
        drawBar(30, 520, stats.php, stats.pmax, 0x00ff00, "HP");
        // Joueur : MP
        drawBar(30, 550, stats.pmp, 50, 0x0000ff, "MP"); // Max MP assumé
        
        // Boss HP (en haut !)
        drawBar(300, 20, stats.ehp, stats.emax, 0xff0000, "BOSS HP");
    }

    updateMessage(text) {
        this.messageText.setText(text);
        // Cacher temporairement les options pendant une animation
        this.menus.forEach(m => m.setVisible(false));
    }

    enableMenu() {
        this.menus.forEach(m => m.setVisible(true));
        this.messageText.setText("À l'attaque !");
    }

    selectAction(action) {
        this.menus.forEach(m => m.setVisible(false));
        this.battleScene.receivePlayerSelection(action);
    }
}
