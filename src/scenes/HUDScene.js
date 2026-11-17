class HUDScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HUDScene' });
    }

    create() {
        this.worldScene = this.scene.get('WorldScene');
        this.isDialogueActive = false;
        this.isMenuActive = false;
        this.typewriterEvent = null;
        this.menuPage = 0;
        this.lastHp = null;
        this.feedbackUntil = 0;
        this.textStyle = {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '11px', color: '#f4ecd2', lineSpacing: 9
        };

        this.lifePanel = this.panel(16, 16, 234, 66);
        this.lifeText = this.add.text(31, 28, '', { ...this.textStyle, fontSize: '12px' });
        this.lifeBar = this.add.graphics();
        this.statsText = this.add.text(31, 61, '', { ...this.textStyle, fontSize: '9px', color: '#ddc586' });
        this.locationText = this.add.text(782, 23, '', { ...this.textStyle, color: '#fff4ce', stroke: '#263525', strokeThickness: 4 }).setOrigin(1, 0);
        this.targetText = this.add.text(782, 47, '', { ...this.textStyle, fontSize: '9px', color: '#e8dfb0', stroke: '#263525', strokeThickness: 3 }).setOrigin(1, 0);

        this.objectivePanel = this.panel(16, 536, 768, 48);
        this.objectiveText = this.add.text(30, 548, '', { ...this.textStyle, fontSize: '10px', wordWrap: { width: 738 }, lineSpacing: 5 });
        this.contextPanel = this.panel(208, 489, 384, 32);
        this.contextText = this.add.text(400, 500, '', { ...this.textStyle, fontSize: '10px' }).setOrigin(0.5, 0);
        this.contextPanel.setVisible(false);
        this.contextText.setVisible(false);
        this.feedbackText = this.add.text(400, 93, '', {
            ...this.textStyle, fontSize: '11px', color: '#fff1ac',
            stroke: '#263525', strokeThickness: 4, align: 'center'
        }).setOrigin(0.5, 0).setDepth(50);

        this.dialogueBox = this.panel(40, 398, 720, 172);
        this.dialogueNameBox = this.panel(56, 378, 232, 38);
        this.dialogueName = this.add.text(70, 391, '', { ...this.textStyle, color: '#f1d78a' });
        this.dialogueText = this.add.text(62, 429, '', {
            ...this.textStyle, fontSize: '12px', wordWrap: { width: 672 }, lineSpacing: 12
        });
        this.dialogueIndicator = this.add.text(738, 547, '[E / Espace] Continuer', {
            ...this.textStyle, fontSize: '9px', color: '#ddc586'
        }).setOrigin(1, 0);
        this.dialogueGroup = this.add.group([
            this.dialogueBox, this.dialogueNameBox, this.dialogueName,
            this.dialogueText, this.dialogueIndicator
        ]);
        this.dialogueGroup.setVisible(false);

        this.menuBox = this.panel(48, 84, 704, 436);
        this.menuTitle = this.add.text(70, 108, '', { ...this.textStyle, fontSize: '18px', color: '#f1d78a' });
        this.menuContent = this.add.text(70, 153, '', {
            ...this.textStyle, fontSize: '11px', wordWrap: { width: 656 }, lineSpacing: 10
        });
        this.menuFooter = this.add.text(70, 490, '', { ...this.textStyle, fontSize: '9px', color: '#ddc586' });
        this.menuGroup = this.add.group([this.menuBox, this.menuTitle, this.menuContent, this.menuFooter]);
        this.menuGroup.setVisible(false);

        const codes = Phaser.Input.Keyboard.KeyCodes;
        this.keys = this.input.keyboard.addKeys({
            space: codes.SPACE, interact: codes.E, inventory: codes.I,
            quests: codes.J, crafting: codes.C, one: codes.ONE, two: codes.TWO,
            escape: codes.ESC, previous: codes.PAGE_UP, next: codes.PAGE_DOWN
        });
        this.worldScene.events.on('StartDialogue', this.showDialogue, this);
        this.worldScene.events.on('ItemCollected', this.showToast, this);
        this.events.once('shutdown', () => {
            this.stopTypewriter();
            this.worldScene.events.off('StartDialogue', this.showDialogue, this);
            this.worldScene.events.off('ItemCollected', this.showToast, this);
        });
        this.updateStatus();
    }

    panel(x, y, width, height) {
        const graphics = this.add.graphics();
        graphics.fillStyle(0x14281f, 0.96);
        graphics.fillRect(x, y, width, height);
        graphics.lineStyle(2, 0xd8c18a);
        graphics.strokeRect(x + 1, y + 1, width - 2, height - 2);
        graphics.lineStyle(1, 0x53604a);
        graphics.strokeRect(x + 5, y + 5, width - 10, height - 10);
        return graphics;
    }

    updateStatus() {
        const state = window.gameState;
        if (!state) return;
        const player = state.player;
        const hp = Math.max(0, Math.ceil(player.hp));
        const key = `${hp}/${player.maxHp}`;
        if (this.lastHp !== key) {
            this.lastHp = key;
            this.lifeText.setText(`VIE  ${hp} / ${player.maxHp}`);
            this.lifeBar.clear();
            this.lifeBar.fillStyle(0x0c1914);
            this.lifeBar.fillRect(31, 47, 202, 8);
            this.lifeBar.fillStyle(hp <= player.maxHp * 0.25 ? 0xd8795b : 0x83b85b);
            this.lifeBar.fillRect(32, 48, Math.floor(200 * Phaser.Math.Clamp(hp / player.maxHp, 0, 1)), 6);
        }
        this.statsText.setText(`Niv.${player.level}   ${player.gold} or`);
        this.locationText.setText(this.worldScene.targetMapName === 'House1' ? 'Maison du village' : 'Village des sources');
        const target = this.worldScene.tutorial && this.worldScene.tutorial.getTarget();
        if (target && this.worldScene.player) {
            const dx = target.x - this.worldScene.player.x, dy = target.y - this.worldScene.player.y;
            const distance = Math.hypot(dx, dy);
            const direction = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][(Math.round(Math.atan2(dx, -dy) / (Math.PI / 4)) + 8) % 8];
            this.targetText.setText(distance < 90 ? `${target.label} : à proximité` : `${target.label} : ${direction} · ${Math.ceil(distance / 64)} cases`);
        } else this.targetText.setText('');
        const hint = this.worldScene.tutorial ? this.worldScene.tutorial.getHint() : 'Explore la maison. [E] Ouvrir un coffre';
        this.objectiveText.setText(hint || 'Explore le village à ton rythme.');
        const context = this.worldScene.interactionHint || '';
        const showContext = !!context && !this.isDialogueActive && !this.isMenuActive;
        this.contextPanel.setVisible(showContext);
        this.contextText.setVisible(showContext).setText(context);
        this.objectivePanel.setVisible(!this.isDialogueActive && !this.isMenuActive);
        this.objectiveText.setVisible(!this.isDialogueActive && !this.isMenuActive);
        if (this.feedbackUntil && this.time.now > this.feedbackUntil) {
            this.feedbackText.setText('');
            this.feedbackUntil = 0;
        }
    }

    update() {
        this.updateStatus();
        const pressed = key => Phaser.Input.Keyboard.JustDown(key);
        if (this.isDialogueActive) {
            // The E which opened the dialogue must be released before advancing it.
            if (!this.dialogueInputReady) {
                this.dialogueInputReady = !this.keys.interact.isDown && !this.keys.space.isDown;
                return;
            }
            if (pressed(this.keys.space) || pressed(this.keys.interact)) {
                if (this.isTyping) this.finishTyping();
                else this.endDialogue();
            }
            return;
        }
        if (pressed(this.keys.inventory)) this.toggleMenu('INVENTAIRE');
        else if (pressed(this.keys.quests)) this.toggleMenu('QUETES');
        else if (pressed(this.keys.crafting)) this.toggleMenu('CRAFTING');
        else if (this.isMenuActive && pressed(this.keys.escape)) this.closeMenu();
        if (!this.isMenuActive) return;
        if (pressed(this.keys.previous)) {
            this.menuPage = Math.max(0, this.menuPage - 1);
            this.renderMenu();
        }
        if (pressed(this.keys.next)) {
            this.menuPage = Math.min(this.menuPageCount - 1, this.menuPage + 1);
            this.renderMenu();
        }
        if (this.menuTitle.text === 'CRAFTING') {
            if (pressed(this.keys.one)) this.menuAction(() => window.gameState.craftItem('bridge'), 'Pont fabriqué.', 'Il faut 5 bois.');
            if (pressed(this.keys.two)) this.menuAction(() => window.gameState.craftItem('potion'), 'Potion fabriquée.', 'Il faut 2 bois et 1 pierre.');
        } else if (this.menuTitle.text === 'INVENTAIRE') {
            if (pressed(this.keys.one)) this.menuAction(() => window.gameState.useItem('potion'), 'Potion : +30 vie.', 'Aucune potion disponible.');
            if (pressed(this.keys.two)) this.menuAction(() => window.gameState.useItem('sword_upgrade'), 'Épée renforcée : +5 dégâts.', 'Aucune pierre à aiguiser.');
        }
    }

    showToast(message) {
        this.feedbackText.setText(String(message));
        this.feedbackUntil = this.time.now + 2400;
        if (window.announce) window.announce(String(message));
    }

    lockWorld() {
        const world = this.worldScene;
        this.previousWorldLock = !!world.controlsLocked;
        world.controlsLocked = true;
        if (world.player) {
            if (world.player.cancelAttack) world.player.cancelAttack();
            world.player.setVelocity(0);
            world.player.anims.stop();
        }
        this.didPauseWorld = !this.scene.isPaused('WorldScene');
        if (this.didPauseWorld) this.scene.pause('WorldScene');
    }

    unlockWorld() {
        const world = this.worldScene;
        world.controlsLocked = this.previousWorldLock;
        if (world.player) world.player.suppressActionUntilRelease = true;
        if (this.didPauseWorld) this.scene.resume('WorldScene');
        this.didPauseWorld = false;
    }

    stopTypewriter() {
        if (this.typewriterEvent) {
            this.typewriterEvent.remove();
            this.typewriterEvent = null;
        }
        this.isTyping = false;
    }

    showDialogue(npcName, text, callback) {
        if (this.isMenuActive || this.isDialogueActive) return;
        this.stopTypewriter();
        this.dialogueGroup.setVisible(true);
        this.dialogueGroup.getChildren().forEach(child => child.setAlpha(1));
        this.dialogueName.setText(npcName);
        this.dialogueText.setText('');
        this.fullDialogueText = String(text || '');
        this.isDialogueActive = true;
        this.dialogueInputReady = false;
        this.dialogueCallback = callback;
        this.lockWorld();
        if (window.announce) window.announce(`${npcName} : ${this.fullDialogueText}. E ou Espace pour continuer.`);
        if (!this.fullDialogueText.length) return;
        this.isTyping = true;
        let index = 0;
        this.typewriterEvent = this.time.addEvent({
            delay: 22,
            repeat: this.fullDialogueText.length - 1,
            callback: () => {
                index++;
                this.dialogueText.setText(this.fullDialogueText.slice(0, index));
                if (index >= this.fullDialogueText.length) this.stopTypewriter();
            }
        });
    }

    finishTyping() {
        this.stopTypewriter();
        this.dialogueText.setText(this.fullDialogueText);
    }

    endDialogue() {
        this.stopTypewriter();
        this.isDialogueActive = false;
        this.dialogueGroup.setVisible(false);
        this.unlockWorld();
        const callback = this.dialogueCallback;
        this.dialogueCallback = null;
        if (callback) callback();
    }

    toggleMenu(type) {
        if (this.isDialogueActive) return;
        if (this.isMenuActive && this.menuTitle.text === type) {
            this.closeMenu();
            return;
        }
        if (!this.isMenuActive) this.lockWorld();
        this.isMenuActive = true;
        this.menuPage = 0;
        this.menuGroup.setVisible(true);
        this.menuTitle.setText(type);
        this.renderMenu();
    }

    closeMenu() {
        this.isMenuActive = false;
        this.menuGroup.setVisible(false);
        this.unlockWorld();
    }

    menuAction(action, success, failure) {
        const worked = action();
        if (window.audioManager) window.audioManager.play(worked ? 'collect' : 'hit');
        this.showToast(worked ? success : failure);
        this.renderMenu();
    }

    renderMenu() {
        const state = window.gameState;
        let lines = [];
        const type = this.menuTitle.text;
        if (type === 'INVENTAIRE') {
            lines.push(`Niveau ${state.player.level}  |  Épée : ${state.player.damage} dégâts  |  ${state.player.gold} or`, '');
            lines.push('[1] Boire une potion (+30 vie)', '[2] Utiliser une pierre à aiguiser (+5 dégâts)', '');
            if (!state.inventory.length) lines.push('Le sac est encore vide.');
            state.inventory.forEach(item => lines.push(`${item.name}  x${item.qty}`));
        } else if (type === 'QUETES') {
            if (!state.quests.length) lines.push('Aucune quête pour le moment.');
            state.quests.forEach(quest => {
                lines.push(`${quest.status === 'completed' ? '[x]' : '[ ]'} ${quest.title}`, `    ${quest.desc}`, '');
            });
            if (this.worldScene.tutorial) lines.push(this.worldScene.tutorial.getHint());
        } else if (type === 'CRAFTING') {
            const quantity = id => (state.inventory.find(item => item.id === id) || { qty: 0 }).qty;
            lines.push('Fabriquer avec les ressources du sac', '', '[1] Pont en bois : 5 bois', '[2] Potion de soin : 2 bois + 1 pierre', '', `En réserve : ${quantity('wood')} bois, ${quantity('stone')} pierre`);
        }
        const perPage = 14;
        this.menuPageCount = Math.max(1, Math.ceil(lines.length / perPage));
        this.menuPage = Math.min(this.menuPage, this.menuPageCount - 1);
        this.menuContent.setText(lines.slice(this.menuPage * perPage, (this.menuPage + 1) * perPage).join('\n'));
        this.menuFooter.setText(`I Sac  J Quêtes  C Craft  Échap Fermer${this.menuPageCount > 1 ? `  |  Pg↑/Pg↓ ${this.menuPage + 1}/${this.menuPageCount}` : ''}`);
    }
}
