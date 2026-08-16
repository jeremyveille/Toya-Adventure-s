/**
 * @typedef {Object} PlayerState
 * @property {number} level
 * @property {number} xp
 * @property {number} hp
 * @property {number} maxHp
 * @property {number} mp
 * @property {number} maxMp
 * @property {number} gold
 * @property {number} damage
 */

/**
 * @typedef {Object} InventoryItem
 * @property {string} id
 * @property {string} name
 * @property {number} qty
 */

/**
 * @typedef {Object} Quest
 * @property {string} id
 * @property {string} title
 * @property {string} desc
 * @property {string} status - "not_started" | "active" | "completed"
 * @property {string} goalType
 * @property {string} goalTarget
 */

class GameManager {
    /**
     * @param {Object} config - The global game configuration
     */
    constructor(config) {
        this.config = config || (typeof GameConfig !== 'undefined' ? GameConfig : {});
        this.reset();
    }

    /**
     * Reset the game state to default
     */
    reset() {
        // Deep copy from config to avoid mutating the original config
        this.player = JSON.parse(JSON.stringify(this.config.initialPlayerState || {}));
        /** @type {InventoryItem[]} */
        this.inventory = [];
        /** @type {Quest[]} */
        this.quests = JSON.parse(JSON.stringify(this.config.initialQuests || []));
    }

    /**
     * Saves the current game state to localStorage if RGPD consent is given
     */
    save() {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('rpg_save_consent') !== 'true') {
            console.log("Sauvegarde ignorée (pas de consentement RGPD)");
            return;
        }
        
        const data = {
            player: this.player,
            inventory: this.inventory,
            quests: this.quests
        };
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('rpg_save_v1', JSON.stringify(data));
                console.log("Jeu sauvegardé !");
            }
        } catch (e) {
            console.error("Erreur lors de la sauvegarde", e);
        }
    }

    /**
     * Loads the game state from localStorage with basic validation
     * @returns {boolean} True if load was successful
     */
    load() {
        if (typeof localStorage === 'undefined') return false;
        
        const savedStr = localStorage.getItem('rpg_save_v1');
        if (savedStr) {
            try {
                const data = JSON.parse(savedStr);
                // Validation très basique pour des raisons de sécurité / RGPD (minimisation des données)
                // On s'assure que les types attendus sont présents.
                if (data && typeof data === 'object') {
                    if (data.player && typeof data.player.hp === 'number') this.player = data.player;
                    if (Array.isArray(data.inventory)) this.inventory = data.inventory;
                    if (Array.isArray(data.quests)) this.quests = data.quests;
                    console.log("Partie chargée !");
                    return true;
                }
            } catch (e) {
                console.error("Erreur de chargement (données potentiellement corrompues)", e);
            }
        }
        return false;
    }

    /**
     * Adds an item to the inventory
     * @param {InventoryItem} item 
     */
    addItem(item) {
        if (!item || typeof item.id !== 'string') return;
        
        let existing = this.inventory.find(i => i.id === item.id);
        if(existing) {
            existing.qty += item.qty;
        } else {
            this.inventory.push({...item}); // Shallow copy to avoid reference mutation
        }
        this.save();
    }

    /**
     * Removes an item from the inventory
     * @param {string} itemId 
     * @param {number} qty 
     * @returns {boolean} True if successfully removed
     */
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

    /**
     * Completes a quest goal
     * @param {string} goalType 
     * @param {string} goalTarget 
     * @returns {boolean} True if a quest was updated
     */
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

    /**
     * Checks and applies level up if enough XP
     * @returns {boolean} True if the player leveled up
     */
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

    /**
     * Crafts an item based on recipeId
     * @param {string} recipeId 
     * @returns {boolean} True if crafted successfully
     */
    craftItem(recipeId) {
        const recipes = this.config.recipes || {};
        let recipe = recipes[recipeId];
        if(!recipe) return false;
        
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

    /**
     * Uses an item from the inventory
     * @param {string} itemId 
     * @returns {boolean} True if used successfully
     */
    useItem(itemId) {
        if (this.removeItem(itemId, 1)) {
            if (itemId === 'potion') {
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + 30);
                return true;
            }
        }
        return false;
    }
}

// Permet l'import dans Node.js pour les tests, tout en fonctionnant dans le navigateur
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameManager;
} else {
    // Instance globale du manager de jeu dans le navigateur
    window.gameState = new GameManager();
}
