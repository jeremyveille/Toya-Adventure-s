class HUDScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HUDScene' });
    }

    create() {
        this.world = this.scene.get('WorldScene');
        this.isDialogueActive = false;
        this.isMenuActive = false;
        this.menu = '';
        this.lastHp = '';
        this.dialogueCallback = null;
        this.keys = this.input.keyboard.addKeys('SPACE,I,J,C,ONE,TWO,ESC');

        const label = (x, y, text, size = 16, color = '#fff5d8') =>
            this.add.text(x, y, text, { fontFamily: 'monospace', fontSize: size + 'px',
                color, lineSpacing: 5 }).setOrigin(0, 0);
        const panel = (x, y, w, h) => {
            const g = this.add.graphics();
            g.fillStyle(0x27362f, 0.55).fillRect(x + 3, y + 4, w, h);
            g.fillStyle(0x202f30).fillRect(x, y, w, h);
            g.lineStyle(2, 0xc5a973).strokeRect(x + 1, y + 1, w - 2, h - 2);
            return g;
        };

        panel(14, 14, 172, 57);
        this.healthText = label(26, 22, '', 15);
        this.healthBar = this.add.graphics();
        this.goalPanel = panel(390, 14, 396, 48);
        this.place = label(402, 19, '', 12, '#ecc682');
        this.goal = label(402, 36, '', 15);
        this.context = label(0, 0, '', 15).setOrigin(0.5, 1)
            .setBackgroundColor('#263733').setPadding(8, 4).setVisible(false);
        this.notice = label(400, 535, '', 17).setOrigin(0.5, 0)
            .setBackgroundColor('#293b34').setPadding(14, 7).setVisible(false);

        const dialoguePanel = panel(62, 435, 676, 141);
        const crest = this.add.image(104, 484, 'tex_npc');
        this.dialogueName = label(146, 450, '', 17, '#f0ca84');
        this.dialogueText = label(146, 479, '', 17).setWordWrapWidth(559);
        const next = label(544, 548, 'Espace · Continuer', 15, '#ddcba6');
        this.dialogueGroup = this.add.group([dialoguePanel, crest, this.dialogueName, this.dialogueText, next]);
        this.dialogueGroup.setVisible(false);

        const menuPanel = panel(68, 86, 664, 430);
        this.menuTitle = label(94, 110, '', 25, '#f6d19a');
        this.menuContent = label(94, 165, '', 17).setWordWrapWidth(605);
        const shortcuts = label(94, 478, 'I  Sac     J  Quêtes     C  Atelier     Échap  Fermer', 15, '#d9caab');
        this.menuGroup = this.add.group([menuPanel, this.menuTitle, this.menuContent, shortcuts]);
        this.menuGroup.setVisible(false);

        this.world.events.on('StartDialogue', this.showDialogue, this);
        this.world.events.on('Notice', this.showNotice, this);
        this.events.once('shutdown', () => {
            this.world.events.off('StartDialogue', this.showDialogue, this);
            this.world.events.off('Notice', this.showNotice, this);
        });
    }

    update() {
        const state = window.gameState;
        const hp = state.player.hp + ' / ' + state.player.maxHp;
        if (hp !== this.lastHp) {
            this.lastHp = hp;
            this.healthText.setText('PV  ' + hp);
            const width = Math.round(148 * state.player.hp / state.player.maxHp);
            this.healthBar.clear().fillStyle(0x101d20).fillRect(26, 47, 148, 11);
            this.healthBar.fillStyle(0xd86e54).fillRect(26, 47, width, 11);
            this.healthBar.fillStyle(0xf9af84).fillRect(26, 47, width, 3);
        }
        const village = !!this.world.currentMapData.passage;
        const goal = village && state.passage === 'meet' && !this.world.hasMoved
            ? 'ZQSD ou flèches · Rejoins le guide.'
            : (village ? GameConfig.passageHints[state.passage] : 'La sortie se trouve au sud.');
        this.place.setText(village ? 'LE PASSAGE DES SAULES' : 'MAISON DU PASSEUR');
        this.goal.setText(goal);
        this.goalPanel.setVisible(!!goal);
        this.place.setVisible(!!goal);
        const player = this.world.player;
        const showContext = this.world.contextHint && player.active && !player.isAttacking &&
            !this.isDialogueActive && !this.isMenuActive && !this.world.transitioning;
        this.context.setVisible(!!showContext);
        if (showContext) {
            const cam = this.world.cameras.main;
            this.context.setText(this.world.contextHint).setPosition(
                Math.round((player.x - cam.worldView.x) * cam.zoom),
                Math.round((player.y - 48 - cam.worldView.y) * cam.zoom));
        }
        if (this.world.isDead || this.world.transitioning || window.privacyDialogOpen) return;
        const pressed = key => Phaser.Input.Keyboard.JustDown(this.keys[key]);
        if (this.isDialogueActive) {
            if (pressed('SPACE') || pressed('ESC')) this.endDialogue();
            return;
        }
        if (pressed('I')) this.toggleMenu('Inventaire');
        else if (pressed('J')) this.toggleMenu('Quêtes');
        else if (pressed('C')) this.toggleMenu('Atelier');
        else if (this.isMenuActive && pressed('ESC')) this.toggleMenu(this.menu);
        else if (this.isMenuActive && pressed('ONE')) this.menuAction(1);
        else if (this.isMenuActive && pressed('TWO')) this.menuAction(2);
    }

    showNotice(message) {
        if (this.noticeTimer) this.noticeTimer.remove();
        this.notice.setText(message).setVisible(true);
        if (window.announce) window.announce(message);
        this.noticeTimer = this.time.delayedCall(1800, () => this.notice.setVisible(false));
    }

    showDialogue(name, message, callback) {
        this.isDialogueActive = true;
        this.dialogueCallback = callback;
        this.dialogueGroup.setVisible(true);
        this.dialogueName.setText(name);
        this.dialogueText.setText(message);
        this.world.player.setVelocity(0);
        this.world.player.active = false;
        this.scene.pause('WorldScene');
        if (window.announce) window.announce(name + '. ' + message + ' Espace pour continuer.');
    }

    endDialogue() {
        this.isDialogueActive = false;
        this.dialogueGroup.setVisible(false);
        this.world.player.active = true;
        this.world.player.waitForSpaceRelease = true;
        this.scene.resume('WorldScene');
        if (this.dialogueCallback) this.dialogueCallback();
        this.dialogueCallback = null;
    }

    toggleMenu(type) {
        if (this.isMenuActive && this.menu === type) {
            this.menuGroup.setVisible(false);
            this.isMenuActive = false;
            this.world.player.waitForSpaceRelease = true;
            this.scene.resume('WorldScene');
            return;
        }
        this.menu = type;
        this.isMenuActive = true;
        this.world.player.setVelocity(0);
        this.menuGroup.setVisible(true);
        this.scene.pause('WorldScene');
        this.drawMenu();
    }

    menuAction(number) {
        const state = window.gameState;
        let ok;
        if (this.menu === 'Atelier') ok = state.craftItem(number === 1 ? 'bridge' : 'potion');
        else if (this.menu === 'Inventaire') ok = number === 1 ? state.useItem('potion') : state.sharpenSword();
        else return;
        window.audioManager.play(ok ? 'collect' : 'hit');
        this.showNotice(ok ? 'Objet utilisé ou fabriqué.' : 'Ressources insuffisantes.');
        this.drawMenu();
    }

    drawMenu() {
        const state = window.gameState;
        this.menuTitle.setText(this.menu);
        let lines;
        if (this.menu === 'Inventaire') {
            lines = ['Équipement · ' + (state.sharpened ? 'Épée affûtée' : 'Épée de Toya') + ' · ' + state.player.damage + ' dégâts',
                'Niveau ' + state.player.level + '   ·   ' + state.player.gold + ' pièces', '',
                ...state.inventory.map(i => i.name + ' × ' + i.qty)];
            if (!state.inventory.length) lines.push('Sac vide');
            lines.push('', '1  Boire une potion (+30 PV)');
            if (!state.sharpened && state.inventory.some(i => i.id === 'sword_upgrade')) lines.push('2  Affûter l’épée (+5 dégâts)');
        } else if (this.menu === 'Quêtes') {
            lines = state.quests.flatMap(q => [(q.status === 'completed' ? '✓  ' : '•  ') + q.title, '   ' + q.desc, '']);
        } else {
            const count = id => state.inventory.find(i => i.id === id)?.qty || 0;
            lines = ['1  Pont en bois     · 5 bois', '2  Potion de soin   · 2 bois + 1 pierre', '',
                'Réserves · ' + count('wood') + ' bois, ' + count('stone') + ' pierre'];
        }
        this.menuContent.setText(lines.join('\n'));
    }
}
