class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        const style = { fontFamily: '"Press Start 2P", monospace', fontSize: '11px', color: '#f4ecd2' };
        this.graphics = this.add.graphics();
        this.graphics.fillStyle(0x14281f, 0.97);
        this.graphics.fillRect(16, 424, 768, 160);
        this.graphics.lineStyle(2, 0xd8c18a);
        this.graphics.strokeRect(17, 425, 766, 158);
        this.graphics.lineStyle(1, 0x53604a);
        this.graphics.strokeRect(21, 429, 758, 150);
        this.messageText = this.add.text(34, 446, 'Le Gardien des Lieux attaque !', {
            ...style, wordWrap: { width: 358 }, lineSpacing: 10
        });

        this.menus = [];
        this.createMenuItem(416, 450, '[1] Attaquer', 'attack');
        this.createMenuItem(416, 493, '[2] Magie 15 PM', 'magic');
        this.createMenuItem(626, 450, '[3] Soin 10 PM', 'heal');
        this.createMenuItem(626, 493, '[4] Fuir', 'flee');
        this.add.text(416, 555, 'Choisis une action.', { ...style, fontSize: '9px', color: '#ddc586' });
        this.hpGraphics = this.add.graphics();
        this.barTexts = [];
        this.battleScene = this.scene.get('BattleScene');
        this.battleScene.events.on('Message', this.updateMessage, this);
        this.battleScene.events.on('EnableMenu', this.enableMenu, this);
        this.battleScene.events.on('UpdateStats', this.drawBars, this);
        this.events.once('shutdown', () => {
            this.battleScene.events.off('Message', this.updateMessage, this);
            this.battleScene.events.off('EnableMenu', this.enableMenu, this);
            this.battleScene.events.off('UpdateStats', this.drawBars, this);
        });
        this.actionKeys = this.input.keyboard.addKeys('ONE,TWO,THREE,FOUR');
        this.drawBars({
            php: this.battleScene.playerHp, pmax: this.battleScene.playerMaxHp,
            pmp: this.battleScene.playerMp,
            ehp: this.battleScene.enemyHp, emax: this.battleScene.enemyMaxHp
        });
    }

    createMenuItem(x, y, text, id) {
        const item = this.add.text(x, y, text, {
            fontFamily: '"Press Start 2P", monospace', fontSize: '10px',
            color: '#f4ecd2', padding: { x: 3, y: 8 }
        }).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.selectAction(id))
            .on('pointerover', () => item.setColor('#f1d78a'))
            .on('pointerout', () => item.setColor('#f4ecd2'));
        this.menus.push(item);
        return item;
    }

    update() {
        const actions = ['attack', 'magic', 'heal', 'flee'];
        ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((key, index) => {
            if (Phaser.Input.Keyboard.JustDown(this.actionKeys[key])) this.selectAction(actions[index]);
        });
    }

    drawBars(stats) {
        this.hpGraphics.clear();
        this.barTexts.forEach(text => text.destroy());
        this.barTexts = [];
        const drawBar = (x, y, value, max, color, label) => {
            this.hpGraphics.fillStyle(0x14281f, 0.96);
            this.hpGraphics.fillRect(x - 8, y - 20, 218, 38);
            this.hpGraphics.fillStyle(0x0c1914);
            this.hpGraphics.fillRect(x, y, 200, 8);
            this.hpGraphics.fillStyle(color);
            this.hpGraphics.fillRect(x + 1, y + 1, Math.floor(198 * Phaser.Math.Clamp(value / max, 0, 1)), 6);
            this.hpGraphics.lineStyle(1, 0xd8c18a);
            this.hpGraphics.strokeRect(x, y, 200, 8);
            this.barTexts.push(this.add.text(x, y - 15, `${label} ${Math.max(0, value)} / ${max}`, {
                fontSize: '9px', fontFamily: '"Press Start 2P", monospace', color: '#f4ecd2'
            }));
        };
        drawBar(34, 519, stats.php, stats.pmax, 0x83b85b, 'VIE');
        drawBar(34, 556, stats.pmp, window.gameState.player.maxMp, 0x78b4c4, 'MAGIE');
        drawBar(300, 45, stats.ehp, stats.emax, 0xd8795b, 'GARDIEN');
    }

    updateMessage(text) {
        this.messageText.setText(text);
        this.menus.forEach(menu => menu.setVisible(false));
    }

    enableMenu() {
        this.menus.forEach(menu => menu.setVisible(true));
        this.messageText.setText('À toi de jouer.');
    }

    selectAction(action) {
        if (!this.menus.length || !this.menus[0].visible) return;
        this.menus.forEach(menu => menu.setVisible(false));
        this.battleScene.receivePlayerSelection(action);
    }
}
