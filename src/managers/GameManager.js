class GameManager {
    constructor() {
        this.reset();
    }

    reset() {
        this.player = {
            level: 1,
            xp: 0,
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            gold: 0,
            damage: 20
        };

        // Inventaire (Tableau d'objets)
        // Objet: { id: "potion", name: "Potion de Soin", qty: 2 }
        this.inventory = [];

        // Quêtes
        // Quête: { id: "q1", title: "Le Début", desc: "Parler à l'ancien", status: "active", goal: "talk_ancien" }
        // status = "not_started" | "active" | "completed"
        this.quests = [
            { 
                id: "q1", 
                title: "L'Eveil du Héros", 
                desc: "Parlez à l'Ancien du village.", 
                status: "active",
                goalType: "talk",
                goalTarget: "npc1"
            }
        ];
    }

    save() {
        if (localStorage.getItem('rpg_save_consent') !== 'true') {
            console.log("Sauvegarde ignorée (pas de consentement RGPD)");
            return;
        }
        
        const data = {
            player: this.player,
            inventory: this.inventory,
            quests: this.quests
        };
        try {
            localStorage.setItem('rpg_save_v1', JSON.stringify(data));
            console.log("Jeu sauvegardé !");
        } catch (e) {
            console.error("Erreur lors de la sauvegarde", e);
        }
    }

    load() {
        const savedStr = localStorage.getItem('rpg_save_v1');
        if (savedStr) {
            try {
                const data = JSON.parse(savedStr);
                this.player = data.player;
                this.inventory = data.inventory;
                this.quests = data.quests;
                console.log("Partie chargée !");
                return true;
            } catch (e) {
                console.error("Erreur de chargement", e);
            }
        }
        return false;
    }

    addItem(item) {
        let existing = this.inventory.find(i => i.id === item.id);
        if(existing) {
            existing.qty += item.qty;
        } else {
            this.inventory.push(item);
        }
        this.save();
    }

    removeItem(itemId, qty = 1) {
        let existing = this.inventory.find(i => i.id === itemId);
        if(existing && existing.qty >= qty) {
            existing.qty -= qty;
            if(existing.qty <= 0) {
                this.inventory = this.inventory.filter(i => i.id !== itemId);
            }
            this.save();
            return true;
        }
        return false;
    }

    completeQuestGoal(goalType, goalTarget) {
        let updated = false;
        this.quests.forEach(q => {
            if (q.status === "active" && q.goalType === goalType && q.goalTarget === goalTarget) {
                q.status = "completed";
                this.player.xp += 50;
                this.player.gold += 20;
                this.checkLevelUp();
                updated = true;
            }
        });
        if (updated) this.save();
        return updated;
    }

    checkLevelUp() {
        let xpNeeded = this.player.level * 100;
        if(this.player.xp >= xpNeeded) {
            this.player.xp -= xpNeeded;
            this.player.level++;
            this.player.maxHp += 20;
            this.player.hp = this.player.maxHp;
            this.player.damage += 5;
            return true;
        }
        return false;
    }

    craftItem(recipeId) {
        const recipes = {
            "bridge": { name: "Pont en Bois", cost: [{id: "wood", qty: 5}], result: {id: "bridge", name: "Pont en Bois", qty: 1} },
            "potion": { name: "Potion de Soin", cost: [{id: "wood", qty: 2}, {id: "stone", qty: 1}], result: {id: "potion", name: "Potion de Soin", qty: 1} }
        };
        
        let recipe = recipes[recipeId];
        if(!recipe) return false;
        
        // Check if we have resources
        let canCraft = true;
        recipe.cost.forEach(c => {
            let item = this.inventory.find(i => i.id === c.id);
            if (!item || item.qty < c.qty) canCraft = false;
        });
        
        if (canCraft) {
            recipe.cost.forEach(c => this.removeItem(c.id, c.qty));
            this.addItem({ id: recipe.result.id, name: recipe.result.name, qty: recipe.result.qty });
            return true;
        }
        return false;
    }

    useItem(itemId) {
        // Tente de retirer 1 quantité de l'objet
        if (this.removeItem(itemId, 1)) {
            if (itemId === 'potion') {
                // Soin de 30 HP
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30);
                return true;
            }
        }
        return false;
    }
}

// Instance globale du manager de jeu
window.gameState = new GameManager();
