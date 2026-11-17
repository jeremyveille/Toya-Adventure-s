/**
 * First-level progression. World actions set durable facts; the HUD reads one short
 * objective. Discovering a step early never blocks a later step.
 */
class TutorialManager {
    constructor(scene) {
        this.scene = scene;
        this.state = scene.gameState || (typeof window !== 'undefined' ? window.gameState : null);
        this.data = scene.currentMapData.tutorial;
        this.flags = this.state.world.tutorial;
        this.syncFacts();
        if (this.flags.talked) this.ensureQuest();
    }

    syncFacts() {
        const gm = this.state;
        if (gm.isWorldObjectDone('clearedResources', this.data.gateId)) gm.setTutorialFlag('bushCleared');
        if (gm.isWorldObjectDone('defeatedEnemies', this.data.enemyId)) gm.setTutorialFlag('enemyDefeated');
        if (gm.isWorldObjectDone('openedChests', this.data.chestId)) gm.setTutorialFlag('chestOpened');
        // Migrate an old completed introduction quest without rewarding it twice.
        if (gm.quests.some(q => q.id === 'q1' && q.status === 'completed')) gm.setTutorialFlag('talked');
        if (gm.quests.some(q => q.id === 'village_intro' && q.status === 'completed')) gm.setTutorialFlag('completed');
    }

    ensureQuest() {
        if (this.state.quests.some(q => q.id === 'village_intro')) return;
        this.state.quests.push({
            id: 'village_intro', title: 'Le sentier de la clairière',
            desc: 'Traverse le pont, protège la clairière et rapporte tes découvertes au Guide.',
            status: this.flags.completed ? 'completed' : 'active',
            goalType: 'tutorial', goalTarget: 'village_intro'
        });
        this.state.save();
    }

    update() {
        const player = this.scene.player;
        if (!player || !player.active || this.scene.controlsLocked) return;
        const velocity = player.body && player.body.velocity;
        const moving = velocity && Math.hypot(velocity.x, velocity.y) > 10;
        if (moving) this.state.setTutorialFlag('moved');
        const ts = this.scene.currentMapData.tileSize;
        const bridge = this.data.bridge;
        if (player.y >= bridge.y * ts && player.x >= 26 * ts && player.x <= 30 * ts) {
            this.state.setTutorialFlag('crossedBridge');
        }
        if (this.flags.crossedBridge && moving && player.shiftKey && player.shiftKey.isDown) {
            this.state.setTutorialFlag('ran');
        }
    }

    onGuideInteraction(npc) {
        if (npc && npc.id !== 'npc1') return npc.dialogue;
        if (!this.flags.talked) {
            this.state.setTutorialFlag('talked');
            this.state.completeQuestGoal('talk', 'npc1');
            this.ensureQuest();
        }
        if (this.flags.chestOpened && !this.flags.completed) {
            this.state.setTutorialFlag('completed');
            this.state.completeQuestGoal('tutorial', 'village_intro');
            this.state.addItem({ id: 'sword_upgrade', name: 'Pierre à Aiguiser', qty: 1 });
            this.state.addItem({ id: 'stone', name: 'Pierre', qty: 1 });
            return 'Tu as protégé la clairière ! Voici une pierre à aiguiser.\n[I], puis [2] : renforce ton épée. Le village compte sur toi.';
        }
        if (this.flags.completed) return 'Le sentier est sûr grâce à toi.\nExplore la maison au nord-est, récolte et fabrique avec [C].';
        if (this.flags.enemyDefeated) return 'La clairière est sûre. Ouvre le coffre avec [E], puis reviens me voir.';
        if (this.flags.crossedBridge) return 'La créature devient dorée avant de charger. Écarte-toi, puis attaque avec Espace.';
        if (this.flags.bushCleared) return 'Le passage est libre. Traverse le pont au sud-est. Maintiens Maj pour courir.';
        return 'Suis le chemin vers le sud-est.\nCoupe le buisson avec Espace, puis traverse le pont. Reviens après avoir trouvé le coffre.';
    }

    onResourceCleared(id) {
        this.state.markWorldObject('clearedResources', id);
        if (id === this.data.gateId) this.state.setTutorialFlag('bushCleared');
    }

    onEnemyDefeated(id) {
        this.state.markWorldObject('defeatedEnemies', id);
        if (id === this.data.enemyId) this.state.setTutorialFlag('enemyDefeated');
    }

    canOpenChest(id) {
        return id !== this.data.chestId || this.flags.enemyDefeated;
    }

    onChestOpened(id) {
        this.state.markWorldObject('openedChests', id);
        if (id === this.data.chestId) this.state.setTutorialFlag('chestOpened');
    }

    getHint() {
        const f = this.flags;
        if (f.completed) return 'Clairière protégée · I : équipement · C : fabriquer';
        if (!f.moved) return 'ZQSD / flèches : explore près du Guide';
        if (!f.talked) return 'Approche le Guide · E : parler';
        if (!f.bushCleared) return 'Suis le chemin · Espace : coupe le buisson';
        if (!f.crossedBridge) return 'Traverse le pont au sud · Maj : courir';
        if (!f.enemyDefeated) return f.ran ? 'Esquive la charge annoncée, puis frappe avec Espace' : 'Maj : courir · Esquive la charge, puis frappe';
        if (!f.chestOpened) return 'E : ouvre le coffre de la clairière';
        return 'Retourne voir le Guide · E : terminer la quête';
    }

    getTarget() {
        let point, label;
        const f = this.flags;
        if (f.completed) return null;
        if (!f.talked || f.chestOpened) { point = this.data.guide; label = 'Guide'; }
        else if (!f.bushCleared) { point = this.data.gate; label = 'Passage'; }
        else if (!f.crossedBridge) { point = this.data.bridge; label = 'Pont'; }
        else if (!f.enemyDefeated) { point = this.data.enemy; label = 'Clairière'; }
        else { point = this.data.chest; label = 'Coffre'; }
        const ts = this.scene.currentMapData.tileSize;
        return { x: point.x * ts + ts / 2, y: point.y * ts + ts / 2, label };
    }
}

if (typeof module !== 'undefined' && module.exports) module.exports = TutorialManager;
