/**
 * src/systems/MapDiscoverySystem.js
 * Système léger de découverte de carte, landmarks, zones de danger et marqueurs personnels.
 * Logique pure découplée du rendu Phaser pour faciliter la persistance et les tests.
 * Compatible Browser (global window) & Node.js (CommonJS).
 */

const DANGER_LEVELS = {
    peaceful: { id: 'peaceful', label: 'Zone Paisible', color: '#6eb532', hex: 0x6eb532 },
    wild: { id: 'wild', label: 'Zone Sauvage', color: '#e6a832', hex: 0xe6a832 },
    hostile: { id: 'hostile', label: 'Zone Hostile', color: '#d9534f', hex: 0xd9534f },
    cursed: { id: 'cursed', label: 'Zone Maudite', color: '#9b59b6', hex: 0x9b59b6 }
};

class MapDiscoverySystem {
    constructor(savedData = null) {
        this.discoveredLandmarks = {}; // { [mapName]: { [landmarkId]: { id, name, type, tileX, tileY, discoveredAt } } }
        this.visitedCells = {};        // { [mapName]: Set<"x,y"> }
        this.customMarkers = {};       // { [mapName]: [{ id, tileX, tileY, label }] }
        this.currentZone = {
            mapName: 'Village',
            dangerLevel: 'peaceful',
            zoneName: 'Clairière du Village'
        };
        if (savedData) {
            this.deserialize(savedData);
        }
    }

    /**
     * Checks player world position against map landmarks & danger zones.
     * Returns { newlyDiscovered: Landmark[], zoneChanged: ZoneInfo|null }.
     */
    updatePlayerPosition(mapName, mapData, worldX, worldY) {
        if (!mapName || !mapData) {
            return { newlyDiscovered: [], zoneChanged: null };
        }
        const ts = mapData.tileSize || 64;
        const tileX = Math.floor(worldX / ts);
        const tileY = Math.floor(worldY / ts);

        // Reveal surrounding tiles (radius 3 tiles) for fog-of-war map
        this.markAreaVisited(mapName, tileX, tileY, 3);

        // 1. Check landmark proximity
        const newlyDiscovered = [];
        const landmarks = Array.isArray(mapData.landmarks) ? mapData.landmarks : [];
        for (let i = 0; i < landmarks.length; i++) {
            const lm = landmarks[i];
            if (this.isLandmarkDiscovered(mapName, lm.id)) continue;
            const lx = (lm.tileX !== undefined ? lm.tileX : 0) * ts + ts / 2;
            const ly = (lm.tileY !== undefined ? lm.tileY : 0) * ts + ts / 2;
            const radius = lm.radius || 180;
            const dist = Math.hypot(worldX - lx, worldY - ly);
            if (dist <= radius) {
                const discovered = this.discoverLandmark(mapName, lm);
                if (discovered) newlyDiscovered.push(discovered);
            }
        }

        // 2. Check danger zone transitions
        const zoneInfo = this.resolveZoneAtTile(mapName, mapData, tileX, tileY);
        let zoneChanged = null;
        if (
            zoneInfo.dangerLevel !== this.currentZone.dangerLevel ||
            zoneInfo.zoneName !== this.currentZone.zoneName ||
            zoneInfo.mapName !== this.currentZone.mapName
        ) {
            this.currentZone = zoneInfo;
            zoneChanged = zoneInfo;
        }

        return { newlyDiscovered, zoneChanged };
    }

    resolveZoneAtTile(mapName, mapData, tileX, tileY) {
        const zones = Array.isArray(mapData && mapData.zones) ? mapData.zones : [];
        for (let i = 0; i < zones.length; i++) {
            const z = zones[i];
            const minX = z.minX !== undefined ? z.minX : -Infinity;
            const maxX = z.maxX !== undefined ? z.maxX : Infinity;
            const minY = z.minY !== undefined ? z.minY : -Infinity;
            const maxY = z.maxY !== undefined ? z.maxY : Infinity;
            if (tileX >= minX && tileX <= maxX && tileY >= minY && tileY <= maxY) {
                const levelMeta = DANGER_LEVELS[z.dangerLevel] || DANGER_LEVELS.peaceful;
                return {
                    mapName,
                    id: z.id || levelMeta.id,
                    dangerLevel: levelMeta.id,
                    dangerLabel: levelMeta.label,
                    color: levelMeta.color,
                    zoneName: z.name || levelMeta.label
                };
            }
        }
        const fallbackLevel = DANGER_LEVELS[(mapData && mapData.dangerLevel) || 'peaceful'] || DANGER_LEVELS.peaceful;
        return {
            mapName,
            id: fallbackLevel.id,
            dangerLevel: fallbackLevel.id,
            dangerLabel: fallbackLevel.label,
            color: fallbackLevel.color,
            zoneName: mapName
        };
    }

    discoverLandmark(mapName, landmark) {
        if (!mapName || !landmark || !landmark.id) return null;
        if (!this.discoveredLandmarks[mapName]) {
            this.discoveredLandmarks[mapName] = {};
        }
        if (this.discoveredLandmarks[mapName][landmark.id]) {
            return null; // Already discovered
        }
        const entry = {
            id: landmark.id,
            name: landmark.name || landmark.id,
            type: landmark.type || 'landmark',
            tileX: landmark.tileX || 0,
            tileY: landmark.tileY || 0,
            zone: landmark.zone || 'peaceful'
        };
        this.discoveredLandmarks[mapName][landmark.id] = entry;
        return entry;
    }

    isLandmarkDiscovered(mapName, landmarkId) {
        return Boolean(
            this.discoveredLandmarks[mapName] &&
            this.discoveredLandmarks[mapName][landmarkId]
        );
    }

    getDiscoveredLandmarks(mapName) {
        const mapEntries = this.discoveredLandmarks[mapName] || {};
        return Object.values(mapEntries);
    }

    markAreaVisited(mapName, centerTileX, centerTileY, radius = 3) {
        if (!this.visitedCells[mapName]) {
            this.visitedCells[mapName] = new Set();
        }
        const set = this.visitedCells[mapName];
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx * dx + dy * dy <= radius * radius) {
                    set.add(`${centerTileX + dx},${centerTileY + dy}`);
                }
            }
        }
    }

    isTileVisited(mapName, tileX, tileY) {
        return Boolean(
            this.visitedCells[mapName] &&
            this.visitedCells[mapName].has(`${tileX},${tileY}`)
        );
    }

    /**
     * Places or replaces a personal player marker on the map.
     */
    setPersonalMarker(mapName, tileX, tileY, label = 'Repère') {
        if (!mapName) return null;
        if (!this.customMarkers[mapName]) {
            this.customMarkers[mapName] = [];
        }
        // Keep up to 3 personal markers (FIFO)
        const marker = {
            id: `marker_${tileX}_${tileY}`,
            tileX: Math.floor(tileX),
            tileY: Math.floor(tileY),
            label
        };
        const existingIdx = this.customMarkers[mapName].findIndex(
            m => m.tileX === marker.tileX && m.tileY === marker.tileY
        );
        if (existingIdx !== -1) {
            // Clicking same cell toggles marker off
            this.customMarkers[mapName].splice(existingIdx, 1);
            return null;
        }
        if (this.customMarkers[mapName].length >= 3) {
            this.customMarkers[mapName].shift();
        }
        this.customMarkers[mapName].push(marker);
        return marker;
    }

    getPersonalMarkers(mapName) {
        return (this.customMarkers[mapName] || []).slice();
    }

    serialize() {
        const visitedSerialized = {};
        Object.keys(this.visitedCells).forEach(mapName => {
            visitedSerialized[mapName] = Array.from(this.visitedCells[mapName]);
        });
        return {
            discoveredLandmarks: JSON.parse(JSON.stringify(this.discoveredLandmarks)),
            visitedCells: visitedSerialized,
            customMarkers: JSON.parse(JSON.stringify(this.customMarkers))
        };
    }

    deserialize(data) {
        if (!data || typeof data !== 'object') return;
        if (data.discoveredLandmarks && typeof data.discoveredLandmarks === 'object') {
            this.discoveredLandmarks = JSON.parse(JSON.stringify(data.discoveredLandmarks));
        }
        if (data.visitedCells && typeof data.visitedCells === 'object') {
            this.visitedCells = {};
            Object.keys(data.visitedCells).forEach(mapName => {
                if (Array.isArray(data.visitedCells[mapName])) {
                    this.visitedCells[mapName] = new Set(data.visitedCells[mapName]);
                }
            });
        }
        if (data.customMarkers && typeof data.customMarkers === 'object') {
            this.customMarkers = JSON.parse(JSON.stringify(data.customMarkers));
        }
    }
}

if (typeof window !== 'undefined') {
    window.DANGER_LEVELS = DANGER_LEVELS;
    window.MapDiscoverySystem = MapDiscoverySystem;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DANGER_LEVELS,
        MapDiscoverySystem
    };
}
