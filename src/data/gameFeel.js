/** Paramètres Toya : valeurs de départ à ajuster en jeu, aucune mesure de Zelda. */
const GameFeelConfig = {
    movement: {
        walkSpeed: 150,
        runSpeed: 230,
        acceleration: 1350,
        deceleration: 1850,
        animationFps: 8,
        idleSpeed: 5,
        interactionDistance: 32,
        maxDeltaMs: 50
    },
    combat: {
        windupMs: 65,
        activeMs: 110,
        recoveryMs: 140,
        reach: 29,
        hitboxWidth: 42,
        hitboxLength: 34,
        playerInvulnerabilityMs: 750,
        playerKnockbackMs: 135,
        playerKnockbackSpeed: 150
    },
    camera: {
        followLerp: 0.12,
        zoom: 1.25
    },
    enemy: {
        detectionRadius: 250,
        attackRange: 58,
        walkSpeed: 45,
        lungeSpeed: 220,
        telegraphMs: 500,
        lungeMs: 260,
        recoveryMs: 700,
        hurtMs: 220,
        knockbackSpeed: 140,
        contactDamage: 10,
        projectileSpeed: 170,
        projectileLifetimeMs: 2200
    }
};

if (typeof globalThis !== 'undefined') globalThis.GameFeelConfig = GameFeelConfig;
if (typeof module !== 'undefined' && module.exports) module.exports = GameFeelConfig;
