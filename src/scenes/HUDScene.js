class HUDScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HUDScene' });
    }

    create() {
        // UI Container principal
        this.uiGroup = this.add.group();

        // 1. Barre de dialogue
        this.dialogueBox = this.add.graphics();
        this.dialogueBox.fillStyle(0x000000, 0.8);
        this.dialogueBox.lineStyle(4, 0xffffff);
        this.dialogueBox.fillRect(100, 450, 600, 130);
        this.dialogueBox.strokeRect(100, 450, 600, 130);
        this.dialogueText = this.add.text(120, 470, "", { fontSize: '14px', fontFamily: '"Press Start 2P", monospace', color: '#fff', wordWrap: { width: 560 } });
        this.dialogueName = this.add.text(110, 430, "", { fontSize: '16px', fontFamily: '"Press Start 2P", monospace', color: '#ffcc00' });
        this.dialogueInfo = this.add.text(500, 550, "[Espace] pour continuer", { fontSize: '10px', fontFamily: '"Press Start 2P", monospace', color: '#aaa' });
        
        this.dialogueGroup = this.add.group([this.dialogueBox, this.dialogueText, this.dialogueName, this.dialogueInfo]);
        this.dialogueGroup.setVisible(false);
        this.isDialogueActive = false;

        // 2. Écran d'inventaire / Quêtes
        this.menuBox = this.add.graphics();
        this.menuBox.fillStyle(0x111133, 0.95);
        this.menuBox.lineStyle(4, 0xaaaaaa);
        this.menuBox.fillRect(50, 50, 700, 400);
        this.menuBox.strokeRect(50, 50, 700, 400);
        
        this.menuTitle = this.add.text(70, 70, "MENU", { fontSize: '24px', fontFamily: '"Press Start 2P", monospace', color: '#fff' });
        this.menuContent = this.add.text(70, 120, "", { fontSize: '14px', fontFamily: '"Press Start 2P", monospace', color: '#ddd' });
        
        this.menuGroup = this.add.group([this.menuBox, this.menuTitle, this.menuContent]);
        this.menuGroup.setVisible(false);
        this.isMenuActive = false;

        // Écouteurs globaux
        const worldScene = this.scene.get('WorldScene');
        worldScene.events.on('StartDialogue', this.showDialogue, this);
        
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.iKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
        this.jKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
        this.cKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
        this.num1Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
        this.num2Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    }

    update() {
        if (this.isDialogueActive && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.endDialogue();
        }

        if (Phaser.Input.Keyboard.JustDown(this.iKey)) {
            this.toggleMenu("INVENTAIRE");
        }
        if (Phaser.Input.Keyboard.JustDown(this.jKey)) {
            this.toggleMenu("QUETES");
        }
        if (Phaser.Input.Keyboard.JustDown(this.cKey)) {
            this.toggleMenu("CRAFTING");
        }
        
        // Commandes de craft rapides si le menu craft est ouvert
        if (this.isMenuActive && this.menuTitle.text === "CRAFTING") {
            if (Phaser.Input.Keyboard.JustDown(this.num1Key)) {
                if (window.gameState.craftItem("bridge")) window.audioManager.play('levelup');
                else window.audioManager.play('hit'); // Son d'erreur
                this.toggleMenu("CRAFTING"); // Rafraichit
                this.toggleMenu("CRAFTING");
            }
            if (Phaser.Input.Keyboard.JustDown(this.num2Key)) {
                if (window.gameState.craftItem("potion")) window.audioManager.play('levelup');
                else window.audioManager.play('hit');
                this.toggleMenu("CRAFTING");
                this.toggleMenu("CRAFTING");
            }
        }
        
        // Commandes rapides pour l'inventaire
        if (this.isMenuActive && this.menuTitle.text === "INVENTAIRE") {
            if (Phaser.Input.Keyboard.JustDown(this.num1Key)) {
                if (window.gameState.useItem("potion")) {
                    window.audioManager.play('collect'); // Son agréable pour le soin
                } else {
                    window.audioManager.play('hit'); // Erreur (pas de potion)
                }
                this.toggleMenu("INVENTAIRE");
                this.toggleMenu("INVENTAIRE"); // Rafraichissement
            }
        }
    }

    showDialogue(npcName, text, callback) {
        this.isDialogueActive = true;
        
        // Animation d'apparition
        this.dialogueGroup.setAlpha(0);
        this.dialogueGroup.setVisible(true);
        this.tweens.add({ targets: this.dialogueGroup.getChildren(), alpha: 1, duration: 200, ease: 'Power2' });
        
        this.dialogueName.setText(npcName);
        this.dialogueText.setText(text);
        this.dialogueCallback = callback;

        // On bloque le joueur
        const worldScene = this.scene.get('WorldScene');
        worldScene.player.active = false;
        worldScene.player.setVelocity(0);
    }

    endDialogue() {
        this.isDialogueActive = false;
        
        // Disparition en douceur
        this.tweens.add({ 
            targets: this.dialogueGroup.getChildren(), 
            alpha: 0, 
            duration: 200, 
            onComplete: () => this.dialogueGroup.setVisible(false) 
        });
        
        // On libère le joueur
        const worldScene = this.scene.get('WorldScene');
        worldScene.player.active = true;

        if (this.dialogueCallback) {
            this.dialogueCallback();
            this.dialogueCallback = null;
        }
    }

    toggleMenu(type) {
        if(this.isDialogueActive) return;

        if(this.isMenuActive && this.menuTitle.text === type) {
            this.isMenuActive = false;
            this.tweens.add({ 
                targets: this.menuGroup.getChildren(), 
                alpha: 0, 
                duration: 200, 
                onComplete: () => this.menuGroup.setVisible(false) 
            });
            this.scene.resume('WorldScene');
            return;
        }

        this.isMenuActive = true;
        this.menuGroup.setAlpha(0);
        this.menuGroup.setVisible(true);
        this.tweens.add({ targets: this.menuGroup.getChildren(), alpha: 1, duration: 200, ease: 'Power2' });
        
        this.menuTitle.setText(type);
        this.scene.pause('WorldScene'); // Met le jeu en pause en fond

        let content = "";
        if (type === "INVENTAIRE") {
            content = "Or : " + window.gameState.player.gold + " G\n\nObjets :\n";
            if (window.gameState.inventory.length === 0) content += "(Vide)\n";
            window.gameState.inventory.forEach(item => {
                content += "- " + item.name + " (x" + item.qty + ")\n";
            });
            content += "\n[1] Utiliser Potion de Soin (+30 HP)";
            content += "\n\nStatistiques :\nHP: " + window.gameState.player.hp + "/" + window.gameState.player.maxHp + "\nNiveau: " + window.gameState.player.level;
        } else if (type === "QUETES") {
            if (window.gameState.quests.length === 0) content += "(Aucune quête)";
            window.gameState.quests.forEach(q => {
                let statusIcon = q.status === "completed" ? "[x]" : "[ ]";
                content += statusIcon + " " + q.title + "\n  " + q.desc + "\n\n";
            });
        } else if (type === "CRAFTING") {
            content += "Appuyez sur le numéro pour fabriquer:\n\n";
            content += "[1] Pont en Bois (Coût: 5 Bois)\n";
            content += "[2] Potion de Soin (Coût: 2 Bois, 1 Pierre)\n\n";
            
            let wood = window.gameState.inventory.find(i => i.id === 'wood');
            let stone = window.gameState.inventory.find(i => i.id === 'stone');
            content += `Ressources: ${wood?wood.qty:0} Bois, ${stone?stone.qty:0} Pierre`;
        }
        
        this.menuContent.setText(content);
    }
}
