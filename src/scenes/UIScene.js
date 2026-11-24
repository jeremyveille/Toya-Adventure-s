class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        // Dessin du cadre bas (style fantasy cohérent avec le HUD)
        this.graphics = this.add.graphics();
        this.graphics.fillStyle(0x0c151c, 0.94);
        this.graphics.lineStyle(4, 0xb89947);
        this.graphics.fillRoundedRect(10, 450, 780, 140, 8);
        this.graphics.strokeRoundedRect(10, 450, 780, 140, 8);
        this.graphics.lineStyle(2, 0x5c4620);
        this.graphics.strokeRoundedRect(16, 456, 768, 128, 5);

        // Zone de message
        this.messageText = this.add.text(30, 470, "", { color: '#ffffff', fontSize: '20px', fontFamily: 'Courier' });

        // Menu d'actions
        this.menus = [];
        this.menuActions = ['attack', 'magic', 'heal', 'flee'];
        this.selectedIndex = 0;
        this.menuEnabled = true;
        this.createMenuItem(450, 470, "> Attaquer", 'attack', 0);
        this.createMenuItem(450, 510, "> Magie (PM: 15)", 'magic', 1);
        this.createMenuItem(650, 470, "> Soin (PM: 10)", 'heal', 2);
        this.createMenuItem(650, 510, "> Fuir", 'flee', 3);
        this.updateSelectionHighlight();

        // Navigation clavier / manette dans le menu de combat
        this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
        this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
        this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
        this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Créer les graphiques pour les Barres de vie
        this.hpGraphics = this.add.graphics();
        this.barTexts = []; // Pour stocker et mettre à jour les textes des barres
        this.battleScene = this.scene.get('BattleScene');
        this.battleScene.events.on('Message', this.updateMessage, this);
        this.battleScene.events.on('EnableMenu', this.enableMenu, this);
        this.battleScene.events.on('UpdateStats', this.drawBars, this);
    }

    createMenuItem(x, y, text, id, index) {
        let txt = this.add.text(x, y, text, { color: '#ffffff', fontSize: '20px', fontFamily: 'Courier' })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.selectAction(id))
            .on('pointerover', () => {
                this.selectedIndex = index;
                this.updateSelectionHighlight();
            })
            .on('pointerout', () => this.updateSelectionHighlight());
        
        this.menus.push(txt);
        return txt;
    }

    updateSelectionHighlight() {
        for (let i = 0; i < this.menus.length; i++) {
            if (this.menus[i] && typeof this.menus[i].setColor === 'function') {
                this.menus[i].setColor(i === this.selectedIndex ? '#ffff00' : '#ffffff');
            }
        }
    }

    update() {
        if (!this.menuEnabled) return;
        const im = (typeof window !== 'undefined' && window.inputManager) ? window.inputManager : null;
        if (im && typeof im.update === 'function') im.update();

        let moved = false;
        const nav = im ? im.getMenuNavigationJustPressed() : { x: 0, y: 0 };
        if (Phaser.Input.Keyboard.JustDown(this.upKey) || nav.y < 0) {
            this.selectedIndex = (this.selectedIndex + 3) % 4;
            moved = true;
        } else if (Phaser.Input.Keyboard.JustDown(this.downKey) || nav.y > 0) {
            this.selectedIndex = (this.selectedIndex + 1) % 4;
            moved = true;
        } else if (Phaser.Input.Keyboard.JustDown(this.leftKey) || Phaser.Input.Keyboard.JustDown(this.rightKey) || nav.x !== 0) {
            this.selectedIndex = (this.selectedIndex + 2) % 4;
            moved = true;
        }
        if (moved) this.updateSelectionHighlight();

        const confirm = Phaser.Input.Keyboard.JustDown(this.enterKey) ||
            Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
            Boolean(im && im.inputMode === 'gamepad' && im.justDown('CONFIRM'));
        if (confirm) {
            this.selectAction(this.menuActions[this.selectedIndex] || 'attack');
        }
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
        this.menuEnabled = false;
        this.menus.forEach(m => m.setVisible(false));
    }

    enableMenu() {
        this.menuEnabled = true;
        this.menus.forEach(m => m.setVisible(true));
        this.updateSelectionHighlight();
        this.messageText.setText("À l'attaque !");
    }

    selectAction(action) {
        this.menuEnabled = false;
        this.menus.forEach(m => m.setVisible(false));
        this.battleScene.receivePlayerSelection(action);
    }
}
