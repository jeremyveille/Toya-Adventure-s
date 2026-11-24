/**
 * scripts/upgrade_graphics.js
 * Refonte graphique pixel-art 16/32-bit (Toya Adventure's) :
 * - Remplace les monstres à fond vert/rose par 3 créatures fantasy originales sur fond transparent RGBA
 * - Remplace les props plats (maison, falaise, ruine, coffres, panneau, clôture, mur intérieur)
 *   par du vrai pixel-art texturé à contours foncés et lumière haut-gauche
 * - Refait l'arène de combat (battle_bg.png, 800x600 en pixel-art 200x150 x4 nearest-neighbor)
 * Conserve strictement toutes les dimensions verrouillées par ASSET_MANIFEST.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const rootDir = path.resolve(__dirname, '..');

// --- PNG ENCODER (32-bit RGBA, RFC 2083) ---
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[n] = c >>> 0;
}
function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}
function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
}
function encodePNG(width, height, rgba) {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6; // RGBA
    const stride = width * 4 + 1;
    const raw = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y++) {
        raw[y * stride] = 0;
        rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
    }
    const idat = zlib.deflateSync(raw, { level: 9 });
    return Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', idat), makeChunk('IEND', Buffer.alloc(0))]);
}

function hash2d(x, y) {
    let n = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

/**
 * Pixel-art canvas with native pixel scale (e.g. 2x or 4x) for crisp nearest-neighbor output.
 */
class PixelArt {
    constructor(nativeW, nativeH, scale = 1) {
        this.nw = nativeW;
        this.nh = nativeH;
        this.scale = scale;
        this.w = nativeW * scale;
        this.h = nativeH * scale;
        this.grid = new Uint32Array(nativeW * nativeH); // 0xAARRGGBB, 0 = transparent
    }
    px(x, y, hex, a = 255) {
        x = Math.floor(x); y = Math.floor(y);
        if (x < 0 || y < 0 || x >= this.nw || y >= this.nh) return;
        this.grid[y * this.nw + x] = (((a & 255) << 24) | (hex & 0xffffff)) >>> 0;
    }
    get(x, y) {
        x = Math.floor(x); y = Math.floor(y);
        if (x < 0 || y < 0 || x >= this.nw || y >= this.nh) return 0;
        return this.grid[y * this.nw + x];
    }
    clearPx(x, y) {
        x = Math.floor(x); y = Math.floor(y);
        if (x < 0 || y < 0 || x >= this.nw || y >= this.nh) return;
        this.grid[y * this.nw + x] = 0;
    }
    rect(x, y, w, h, hex, a = 255) {
        for (let yy = y; yy < y + h; yy++) {
            for (let xx = x; xx < x + w; xx++) this.px(xx, yy, hex, a);
        }
    }
    ellipse(cx, cy, rx, ry, hex, a = 255) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
            for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
                const dx = (x + 0.5 - cx) / rx;
                const dy = (y + 0.5 - cy) / ry;
                if (dx * dx + dy * dy <= 1.0) this.px(x, y, hex, a);
            }
        }
    }
    /**
     * Shaded 3D-feel pixel-art sphere/blob lit from top-left (-0.6, -0.7).
     */
    shadedEllipse(cx, cy, rx, ry, cHigh, cMid, cDark, cDeep) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
            for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
                const dx = (x + 0.5 - cx) / rx;
                const dy = (y + 0.5 - cy) / ry;
                const d2 = dx * dx + dy * dy;
                if (d2 <= 1.0) {
                    const light = -dx * 0.55 - dy * 0.65 + (1 - Math.sqrt(d2)) * 0.25;
                    const dither = (hash2d(x, y) - 0.5) * 0.12;
                    const v = light + dither;
                    const col = v > 0.36 ? cHigh : v > -0.05 ? cMid : v > -0.45 ? cDark : cDeep;
                    this.px(x, y, col);
                }
            }
        }
    }
    /**
     * Adds a crisp 1px dark pixel-art outline around all opaque pixels.
     */
    addOutline(outlineHex = 0x1e1612) {
        const copy = new Uint32Array(this.grid);
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (let y = 0; y < this.nh; y++) {
            for (let x = 0; x < this.nw; x++) {
                if ((copy[y * this.nw + x] >>> 24) > 0) continue;
                let adj = false;
                for (const [dx, dy] of dirs) {
                    const nx = x + dx, ny = y + dy;
                    if (nx >= 0 && ny >= 0 && nx < this.nw && ny < this.nh) {
                        if ((copy[ny * this.nw + nx] >>> 24) > 128) { adj = true; break; }
                    }
                }
                if (adj) this.px(x, y, outlineHex, 255);
            }
        }
    }
    save(relPath) {
        const rgba = Buffer.alloc(this.w * this.h * 4, 0);
        for (let ny = 0; ny < this.nh; ny++) {
            for (let nx = 0; nx < this.nw; nx++) {
                const val = this.grid[ny * this.nw + nx];
                const a = (val >>> 24) & 255;
                if (a === 0) continue;
                const r = (val >>> 16) & 255;
                const g = (val >>> 8) & 255;
                const b = val & 255;
                for (let sy = 0; sy < this.scale; sy++) {
                    const py = ny * this.scale + sy;
                    for (let sx = 0; sx < this.scale; sx++) {
                        const px = nx * this.scale + sx;
                        const idx = (py * this.w + px) * 4;
                        rgba[idx] = r; rgba[idx + 1] = g; rgba[idx + 2] = b; rgba[idx + 3] = a;
                    }
                }
            }
        }
        const dest = path.join(rootDir, relPath);
        const tmp = dest + '.tmp';
        fs.writeFileSync(dest, encodePNG(this.w, this.h, rgba));
        if (fs.existsSync(tmp)) {
            try { fs.unlinkSync(tmp); } catch (e) {}
        }
        console.log(`[Graphics] Upgraded ${relPath} (${this.w}x${this.h})`);
    }
}

// =========================================================================
// 1. ORIGINAL TRANSPARENT FANTASY MONSTERS (NO SQUARE BACKGROUNDS!)
// =========================================================================

/**
 * Ronce-Mousse (slime_charger.png, 64x64 = 32x32 @2x)
 * Original mossy bramble forest beast with leafy crown & glowing amber eyes.
 */
function buildMossBrambleCharger() {
    const p = new PixelArt(32, 32, 2);
    // Stubby bark-colored feet
    p.ellipse(11, 27, 3, 2, 0x4a311e);
    p.ellipse(21, 27, 3, 2, 0x4a311e);
    // Round mossy body (lit top-left)
    p.shadedEllipse(16, 19, 10, 8, 0x6ec942, 0x43962e, 0x296920, 0x194518);
    // Leafy bramble mane & horns
    p.shadedEllipse(10, 11, 4.2, 3.2, 0x8ae655, 0x4fa832, 0x2b6b20, 0x1a4718);
    p.shadedEllipse(16, 9, 4.8, 3.6, 0x99f060, 0x56b536, 0x2d7021, 0x1a4718);
    p.shadedEllipse(22, 11, 4.2, 3.2, 0x7bd44a, 0x44962c, 0x27631e, 0x184016);
    // Little wooden twigs sticking out like wild antlers
    p.rect(8, 6, 2, 4, 0x6d4528); p.px(7, 5, 0x8f5d38);
    p.rect(22, 6, 2, 4, 0x5c3820); p.px(24, 5, 0x7d4e2d);
    // Tiny warm golden berries on crown
    p.px(15, 8, 0xffd54f); p.px(16, 8, 0xffab00);
    p.px(20, 10, 0xff7043);
    // Fierce glowing amber eyes recessed in dark leaf shadow
    p.rect(10, 17, 4, 3, 0x142412);
    p.rect(18, 17, 4, 3, 0x142412);
    p.rect(11, 18, 2, 2, 0xffca28); p.px(11, 18, 0xfff9c4);
    p.rect(19, 18, 2, 2, 0xffca28); p.px(19, 18, 0xfff9c4);
    // Snarling wooden beak/jaw
    p.rect(13, 22, 6, 2, 0x2e1c11);
    p.px(14, 22, 0xffe0b2); p.px(17, 22, 0xffe0b2);
    p.addOutline(0x162112);
    p.save('assets/monsters/slime_charger.png');
}

/**
 * Crache-Sève (goblin_shooter.png, 64x64 = 32x32 @2x)
 * Original thorny woodland spore-spitter with glowing teal crest & leaf cloak.
 */
function buildThornSpitter() {
    const p = new PixelArt(32, 32, 2);
    // Root legs
    p.rect(11, 24, 3, 5, 0x5c3a21); p.rect(18, 24, 3, 5, 0x4a2e1a);
    // Leaf cloak torso
    p.shadedEllipse(16, 20, 7, 6, 0x4db6ac, 0x268c82, 0x17635c, 0x0f403b);
    // Spiky bark head
    p.shadedEllipse(16, 13, 7, 6, 0x8d6e63, 0x6d4c41, 0x4e342e, 0x36211c);
    // Glowing spore blossom crest on top
    p.shadedEllipse(16, 6, 4.5, 3, 0x80f0ff, 0x26c6da, 0x00838f, 0x005662);
    p.px(15, 5, 0xffffff);
    // Leafy shoulder pads
    p.shadedEllipse(9, 19, 3, 2.5, 0x7cb342, 0x4c8c2b, 0x2e611a, 0x1b4010);
    p.shadedEllipse(23, 19, 3, 2.5, 0x689f38, 0x3f7822, 0x254f14, 0x18380e);
    // Glowing cyan eyes
    p.rect(12, 12, 2, 2, 0x00e5ff); p.px(12, 12, 0xe0f7fa);
    p.rect(18, 12, 2, 2, 0x00e5ff); p.px(18, 12, 0xe0f7fa);
    // Round spore-shooting snout
    p.ellipse(16, 16, 2.2, 1.8, 0x211410);
    p.px(16, 16, 0x4dd0e1);
    p.addOutline(0x181414);
    p.save('assets/monsters/goblin_shooter.png');
}

/**
 * Gardien des Ruines (boss_guardian.png, 128x128 = 64x64 @2x)
 * Original imposing ancient stone sentinel golem with moss, cracked granite & rune core.
 */
function buildRuinGuardianBoss() {
    const p = new PixelArt(64, 64, 2);
    // Massive stone legs
    p.rect(18, 44, 11, 14, 0x546e7a);
    p.rect(19, 44, 4, 13, 0x78909c);
    p.rect(35, 44, 11, 14, 0x455a64);
    p.rect(36, 44, 4, 13, 0x607d8b);
    // Heavy stone feet
    p.rect(16, 55, 14, 5, 0x37474f);
    p.rect(34, 55, 14, 5, 0x263238);

    // Broad carved granite torso
    p.shadedEllipse(32, 32, 17, 16, 0x90a4ae, 0x607d8b, 0x455a64, 0x2d3b42);
    // Carved ancient chest plate bevels
    p.rect(20, 22, 24, 20, 0x546e7a);
    p.rect(21, 23, 22, 2, 0xb0bec5);
    p.rect(21, 40, 22, 2, 0x37474f);
    // Cracks in granite
    p.px(24, 27, 0x263238); p.px(25, 28, 0x263238); p.px(25, 29, 0x263238);
    p.px(39, 34, 0x263238); p.px(38, 35, 0x263238); p.px(40, 36, 0x263238);

    // Glowing golden-cyan rune core in chest
    p.ellipse(32, 32, 5.5, 5.5, 0x263238);
    p.ellipse(32, 32, 4.2, 4.2, 0xffa000);
    p.ellipse(32, 32, 2.8, 2.8, 0xffeb3b);
    p.px(31, 31, 0xffffff);

    // Massive boulder shoulder pauldrons & floating gauntlets
    p.shadedEllipse(13, 26, 8, 7, 0x9e9e9e, 0x757575, 0x546e7a, 0x37474f);
    p.shadedEllipse(51, 26, 8, 7, 0x90a4ae, 0x607d8b, 0x455a64, 0x263238);
    p.shadedEllipse(11, 39, 6, 8, 0x78909c, 0x546e7a, 0x37474f, 0x263238);
    p.shadedEllipse(53, 39, 6, 8, 0x78909c, 0x546e7a, 0x37474f, 0x263238);
    // Glowing rune stripes on fists
    p.rect(9, 38, 4, 2, 0x26c6da);
    p.rect(51, 38, 4, 2, 0x26c6da);

    // Sculpted stone monolith head + horned stone crown
    p.rect(24, 9, 16, 14, 0x607d8b);
    p.rect(25, 10, 6, 12, 0x90a4ae);
    p.rect(34, 10, 5, 12, 0x455a64);
    // Crown pillars
    p.rect(22, 5, 4, 7, 0x78909c); p.rect(23, 5, 2, 5, 0xb0bec5);
    p.rect(30, 4, 4, 6, 0x90a4ae); p.rect(31, 4, 2, 4, 0xcfd8dc);
    p.rect(38, 5, 4, 7, 0x546e7a);
    // Glowing visor eye slit
    p.rect(26, 15, 12, 3, 0x1c2529);
    p.rect(28, 16, 3, 2, 0xffd54f); p.px(28, 16, 0xffffff);
    p.rect(33, 16, 3, 2, 0xffd54f); p.px(33, 16, 0xffffff);

    // Ancient moss & creeping vines draping over shoulders & crown
    const mossSpots = [[10, 21, 5, 3], [14, 23, 4, 3], [48, 20, 5, 3], [24, 10, 4, 2], [21, 43, 4, 3], [39, 45, 4, 3]];
    for (const [mx, my, mw, mh] of mossSpots) {
        p.rect(mx, my, mw, mh, 0x33691e);
        p.rect(mx, my, mw - 1, Math.max(1, mh - 1), 0x558b2f);
        p.px(mx, my, 0x8bc34a);
    }

    p.addOutline(0x161c20);
    p.save('assets/monsters/boss_guardian.png');
}

// =========================================================================
// 2. RICH 2.5D PIXEL-ART ENVIRONMENT PROPS (EXACT MANIFEST SIZES)
// =========================================================================

/**
 * Timber-framed Fantasy Cottage (assets/props/house.png, 192x240 = 96x120 @2x)
 */
function buildFantasyCottage() {
    const p = new PixelArt(96, 120, 2);

    // Stone chimney (top right) with brickwork & moss
    p.rect(74, 8, 12, 28, 0x546e7a);
    for (let y = 9; y < 34; y += 3) {
        const off = (y % 6 === 0) ? 0 : 3;
        for (let x = 75; x < 85; x += 5) {
            p.rect(x + (off % 2), y, 4, 2, x < 80 ? 0x78909c : 0x607d8b);
        }
    }
    p.rect(72, 6, 16, 3, 0x37474f);
    p.rect(73, 6, 14, 1, 0x90a4ae);

    // Pitched 3/4 Terracotta Shingled Roof (trapezoidal fantasy silhouette!)
    for (let y = 14; y < 56; y++) {
        const t = (y - 14) / 42;
        const inset = Math.floor((1 - t) * 7);
        const x1 = 4 + inset;
        const x2 = 92 - inset;
        for (let x = x1; x < x2; x++) {
            const row = Math.floor((y - 14) / 5);
            const inRow = (y - 14) % 5;
            const colShift = (row % 2) * 3;
            const tileX = (x + colShift) % 6;
            const leftLight = x < 44;
            let col = leftLight ? 0xc94a32 : 0xb03a26;
            if (inRow === 0) col = leftLight ? 0xe06843 : 0xc75234; // top shingle highlight
            else if (inRow === 4) col = 0x7d2518; // shingle drop shadow
            else if (tileX === 0) col = 0x8f2d1e; // shingle vertical seam
            else if (hash2d(x, y) < 0.08) col = 0xd95f3b;
            p.px(x, y, col);
        }
    }
    // Sunlit ridge beam & wooden gable trim
    p.rect(10, 12, 76, 4, 0x5c3822);
    p.rect(11, 12, 74, 2, 0xd48a3b);
    p.rect(11, 12, 40, 1, 0xf5b95b);

    // Roof moss accents
    p.rect(20, 26, 5, 3, 0x4c8c2b); p.px(21, 26, 0x8bc34a);
    p.rect(68, 40, 6, 3, 0x3f7822); p.px(69, 40, 0x7cb342);

    // Deep timber eaves + cast shadow on cream plaster facade
    p.rect(3, 55, 90, 4, 0x4e301d);
    p.rect(4, 55, 88, 1, 0x8c5c38);
    p.rect(7, 59, 82, 4, 0x261710);

    // Cream stucco plaster facade with subtle warm texture
    for (let y = 62; y < 109; y++) {
        for (let x = 8; x < 88; x++) {
            const h = hash2d(x, y);
            let col = x < 42 ? 0xf7efd8 : 0xebe0c3;
            if (y < 65) col = 0xc9bc9f; // eave shadow gradient
            else if (h < 0.12) col = 0xe3d6b6;
            else if (h > 0.92) col = 0xfffaf0;
            p.px(x, y, col);
        }
    }

    // Oak half-timber beams (vertical, horizontal & diagonal braces)
    const drawTimber = (x, y, w, h) => {
        p.rect(x, y, w, h, 0x4a2e1b);
        p.rect(x + 1, y, Math.max(1, w - 2), h, 0x633f26);
        if (w >= 4) p.rect(x + 1, y, 1, h, 0x7d5334);
    };
    drawTimber(7, 59, 5, 50);
    drawTimber(84, 59, 5, 50);
    drawTimber(27, 59, 4, 26);
    drawTimber(65, 59, 4, 26);
    drawTimber(7, 83, 82, 4);
    // Diagonal timber braces
    for (let i = 0; i < 12; i++) {
        p.rect(12 + i, 82 - i, 2, 2, 0x543520);
        p.rect(82 - i, 82 - i, 2, 2, 0x543520);
    }

    // Glowing golden windows with shutters & flower boxes
    const drawWindow = (wx, wy) => {
        // Shutters
        p.rect(wx - 4, wy, 4, 13, 0x3b6928); p.rect(wx - 3, wy + 1, 2, 11, 0x528f36);
        p.rect(wx + 12, wy, 4, 13, 0x2f5720); p.rect(wx + 13, wy + 1, 2, 11, 0x457d2e);
        // Frame
        p.rect(wx, wy, 12, 13, 0x3e2415);
        // Warm illuminated glass
        p.rect(wx + 1, wy + 1, 10, 11, 0xffca28);
        p.rect(wx + 1, wy + 1, 5, 5, 0xfff59d);
        p.rect(wx + 2, wy + 2, 2, 2, 0xffffff);
        // Mullions
        p.rect(wx + 5, wy + 1, 2, 11, 0x4a2e1b);
        p.rect(wx + 1, wy + 6, 10, 2, 0x4a2e1b);
        // Window sill & blooming flower box
        p.rect(wx - 2, wy + 13, 16, 3, 0x6d4528);
        p.rect(wx - 1, wy + 11, 14, 2, 0x3f7a24);
        p.px(wx + 1, wy + 11, 0xff5252); p.px(wx + 5, wy + 11, 0xffeb3b); p.px(wx + 9, wy + 11, 0xff80ab);
    };
    drawWindow(15, 65);
    drawWindow(69, 65);

    // Arched oak front door with stone threshold & lantern
    p.rect(39, 86, 18, 24, 0x3a2214);
    p.rect(41, 88, 14, 22, 0x784c2e);
    for (let dx = 41; dx < 55; dx += 4) p.rect(dx, 88, 1, 22, 0x4e2f1b);
    p.rect(41, 88, 14, 2, 0x99643f);
    // Iron hinges & brass knob
    p.rect(41, 92, 4, 2, 0x263238);
    p.rect(41, 103, 4, 2, 0x263238);
    p.rect(51, 98, 2, 3, 0xffca28); p.px(51, 98, 0xfff9c4);
    // Warm hanging porch lantern
    p.rect(34, 88, 4, 5, 0x263238);
    p.rect(35, 89, 2, 3, 0xffe082);

    // Ashlar stone foundation blocks with mossy corners
    for (let y = 109; y < 118; y++) {
        for (let x = 6; x < 90; x++) {
            const bx = (x - 6) % 10;
            const by = (y - 109) % 5;
            let col = x < 48 ? 0x78909c : 0x607d8b;
            if (by === 0) col = 0x9eb2bd;
            if (by === 4 || bx === 0) col = 0x37474f;
            p.px(x, y, col);
        }
    }
    // Stone doorstep
    p.rect(37, 110, 22, 8, 0x90a4ae);
    p.rect(38, 110, 20, 2, 0xcfd8dc);
    p.rect(37, 116, 22, 2, 0x455a64);
    // Moss tufts at foundation base
    p.rect(8, 114, 6, 4, 0x438a27); p.px(9, 114, 0x7cb342);
    p.rect(80, 115, 7, 3, 0x3b7822); p.px(81, 115, 0x689f38);

    p.addOutline(0x1f1610);
    p.save('assets/props/house.png');
}

/**
 * Textured 2.5D Cliff Face (assets/props/cliff.png, 64x64 = 32x32 @2x)
 */
function buildCliffTile() {
    const p = new PixelArt(32, 32, 2);
    // Lush sunlit grass overhang at top
    for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 32; x++) {
            const h = hash2d(x, y);
            let col = y < 5 ? (h < 0.35 ? 0x6eb532 : 0x5c9e2b) : 0x427d1c;
            if (y === 8 && (x % 5 === 1 || x % 7 === 3)) col = 0x2e5e12;
            p.px(x, y, col);
        }
    }
    // Overhanging grass fringes casting shadow on rock wall
    for (let x = 0; x < 32; x++) {
        const drop = (x * 7) % 3;
        for (let d = 0; d <= drop; d++) p.px(x, 9 + d, d === drop ? 0x294d12 : 0x427d1c);
        p.px(x, 10 + drop, 0x2c383e); // cast shadow under lip
    }
    // Stratified carved rock wall with cracks & top-left facet highlights
    for (let y = 11; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            if (p.get(x, y) !== 0) continue;
            const h = hash2d(x, y);
            const strata = (y === 17 || y === 25);
            const verticalCrack = (x === 9 && y > 13 && y < 24) || (x === 23 && y > 18 && y < 30);
            let col = 0x677a84;
            if (strata || verticalCrack) col = 0x35444c;
            else if (y === 18 || y === 26) col = 0x9bb0ba; // sunlit ridge below crack
            else if (h < 0.25) col = 0x566872;
            else if (h > 0.78) col = 0x7e949f;
            p.px(x, y, col);
        }
    }
    // Base darkening for ground contact
    for (let x = 0; x < 32; x++) p.px(x, 31, 0x2e3b42);
    p.save('assets/props/cliff.png');
}

/**
 * Ancient Mossy Ruin Column (assets/props/ruin.png, 64x80 = 32x40 @2x)
 */
function buildRuinColumn() {
    const p = new PixelArt(32, 40, 2);
    // Pedestal base
    p.rect(5, 33, 22, 5, 0x60727a);
    p.rect(6, 33, 18, 2, 0x9aaeb8);
    p.rect(5, 37, 22, 1, 0x35434a);
    // Fluted column shaft (lit left -> shadowed right)
    for (let y = 10; y < 33; y++) {
        for (let x = 7; x < 25; x++) {
            const flute = (x - 7) % 4;
            let col = x < 14 ? 0x90a1aa : (x < 20 ? 0x72848d : 0x52636b);
            if (flute === 0) col = x < 16 ? 0x5e7078 : 0x3e4d54;
            else if (flute === 1 && x < 18) col = 0xb5c5ce;
            p.px(x, y, col);
        }
    }
    // Weathered chipped capital at top
    p.rect(4, 5, 24, 5, 0x7e919a);
    p.rect(5, 5, 20, 2, 0xc4d3db);
    p.rect(4, 9, 24, 1, 0x415057);
    // Chipped corner on top-right for ancient authenticity
    p.clearPx(26, 5); p.clearPx(27, 5); p.clearPx(27, 6);
    // Glowing carved rune etched in stone center
    p.rect(14, 17, 4, 6, 0x324047);
    p.px(15, 18, 0x4dd0e1); p.px(16, 19, 0x80f0ff); p.px(15, 20, 0x4dd0e1); p.px(16, 21, 0x4dd0e1);
    // Creeping ivy vines & moss
    const vines = [[6, 12], [7, 13], [8, 14], [7, 15], [8, 24], [9, 25], [10, 26], [20, 28], [21, 29], [22, 27], [6, 32], [7, 32]];
    for (const [vx, vy] of vines) {
        p.rect(vx, vy, 2, 2, 0x2e6b1e);
        p.px(vx, vy, 0x6ec244);
    }
    p.addOutline(0x1f282d);
    p.save('assets/props/ruin.png');
}

/**
 * Ornate Fantasy Treasure Chest (closed & opened, 64x64 = 32x32 @2x)
 */
function buildTreasureChests() {
    // Closed chest
    {
        const p = new PixelArt(32, 32, 2);
        // Rounded lid (top half, warm oak wood)
        for (let y = 10; y < 17; y++) {
            const inset = y === 10 ? 2 : y === 11 ? 1 : 0;
            for (let x = 6 + inset; x < 26 - inset; x++) {
                const col = y <= 11 ? 0xc2864d : y <= 14 ? 0x9c6234 : 0x784824;
                p.px(x, y, col);
            }
        }
        // Chest body
        for (let y = 17; y < 27; y++) {
            for (let x = 6; x < 26; x++) {
                const plank = (y === 21 || y === 24);
                p.px(x, y, plank ? 0x5c3419 : (x < 16 ? 0x8c552b : 0x734420));
            }
        }
        // Golden/bronze metal bands & corner rivets
        for (const bx of [8, 22]) {
            p.rect(bx, 10, 2, 17, 0xd49b2a);
            p.rect(bx, 10, 1, 7, 0xffdf6b);
        }
        p.rect(6, 16, 20, 2, 0xc78e20);
        p.rect(6, 16, 12, 1, 0xffe066);
        // Ornate lock plate
        p.rect(14, 15, 4, 5, 0xffca28);
        p.px(14, 15, 0xfff9c4);
        p.rect(15, 17, 2, 2, 0x1c1410);
        p.addOutline(0x24160e);
        p.save('assets/props/chest_closed.png');
    }
    // Opened chest
    {
        const p = new PixelArt(32, 32, 2);
        // Open raised lid tilted back
        p.rect(6, 6, 20, 8, 0x8c552b);
        p.rect(7, 7, 18, 2, 0xc2864d);
        p.rect(8, 6, 2, 8, 0xd49b2a);
        p.rect(22, 6, 2, 8, 0xd49b2a);
        // Dark hollowed interior with subtle gold glint
        p.rect(6, 14, 20, 5, 0x21140d);
        p.rect(8, 15, 16, 3, 0x332014);
        p.px(13, 16, 0xffd54f); p.px(18, 16, 0xffca28);
        // Front wall of base
        for (let y = 19; y < 27; y++) {
            for (let x = 6; x < 26; x++) {
                p.px(x, y, y === 23 ? 0x5c3419 : (x < 16 ? 0x8c552b : 0x734420));
            }
        }
        p.rect(8, 19, 2, 8, 0xd49b2a);
        p.rect(22, 19, 2, 8, 0xd49b2a);
        p.rect(14, 18, 4, 3, 0xffca28);
        p.addOutline(0x24160e);
        p.save('assets/props/chest_opened.png');
    }
}

/**
 * Rustic Wooden Signpost (assets/props/sign.png, 64x64 = 32x32 @2x)
 */
function buildSignpost() {
    const p = new PixelArt(32, 32, 2);
    // Wooden post with wood grain & grass tuft at base
    p.rect(14, 15, 4, 13, 0x5c3a21);
    p.rect(14, 15, 2, 13, 0x7d5130);
    // Pointed directional sign board
    p.rect(6, 7, 18, 9, 0x8f5e34);
    p.rect(24, 8, 2, 7, 0x8f5e34);
    p.rect(26, 10, 2, 3, 0x8f5e34);
    p.rect(7, 8, 16, 2, 0xba834e); // top-left highlight
    p.rect(7, 14, 17, 2, 0x664021); // bottom shadow
    // Carved direction arrow & iron nail
    p.rect(10, 11, 10, 2, 0x3b2313);
    p.px(18, 9, 0x3b2313); p.px(19, 10, 0x3b2313); p.px(19, 13, 0x3b2313); p.px(18, 14, 0x3b2313);
    p.px(15, 9, 0x90a4ae);
    // Small grass blades at base of post
    p.px(12, 27, 0x4c8c2b); p.px(13, 26, 0x6ec244); p.px(18, 27, 0x3f7822); p.px(19, 26, 0x5aa632);
    p.addOutline(0x24160e);
    p.save('assets/props/sign.png');
}

/**
 * Rustic Wooden Fence (assets/props/fence.png, 64x64 = 32x32 @2x)
 */
function buildFence() {
    const p = new PixelArt(32, 32, 2);
    // Vertical carved fence posts
    for (const px of [5, 23]) {
        p.rect(px, 8, 4, 20, 0x5c3a21);
        p.rect(px, 8, 2, 20, 0x875832);
        p.rect(px, 8, 4, 2, 0xab7546);
    }
    // Two horizontal rustic rails with grain & nails
    for (const ry of [12, 20]) {
        p.rect(2, ry, 28, 4, 0x8f5e34);
        p.rect(2, ry, 28, 1, 0xba834e);
        p.rect(2, ry + 3, 28, 1, 0x5c3a21);
        p.px(6, ry + 1, 0x37474f);
        p.px(24, ry + 1, 0x37474f);
    }
    p.addOutline(0x24160e);
    p.save('assets/props/fence.png');
}

/**
 * Warm Timber Indoor Wall (assets/props/wall.png, 64x64 = 32x32 @2x)
 */
function buildIndoorWall() {
    const p = new PixelArt(32, 32, 2);
    for (let y = 0; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const plank = y % 8;
            let col = 0x5e3c26;
            if (plank === 0) col = 0x7d5336;
            else if (plank === 7) col = 0x3b2314;
            else if (hash2d(x, y) < 0.15) col = 0x4f311d;
            p.px(x, y, col);
        }
    }
    // Stone wainscoting at bottom
    for (let y = 24; y < 32; y++) {
        for (let x = 0; x < 32; x++) {
            const seam = (x % 8 === 0) || (y === 24 || y === 28);
            p.px(x, y, seam ? 0x333c42 : 0x5c6970);
        }
    }
    p.save('assets/props/wall.png');
}

// =========================================================================
// 3. LUSH PIXEL-ART BATTLE ARENA BACKGROUND (800x600 = 200x150 @4x)
// =========================================================================
function buildBattleBackground() {
    const p = new PixelArt(200, 150, 4);

    // 1. Layered luminous fantasy sky gradient
    const skyBands = [0x4ba3e3, 0x62b5eb, 0x7ec8f2, 0x9edbf7, 0xc2ecfc, 0xe3f6fc];
    for (let y = 0; y < 82; y++) {
        const idx = Math.min(skyBands.length - 1, Math.floor((y / 82) * skyBands.length));
        const col = skyBands[idx];
        for (let x = 0; x < 200; x++) p.px(x, y, col);
    }

    // 2. Crisp fluffy pixel-art clouds lit from top-left
    const drawCloud = (cx, cy, r) => {
        p.ellipse(cx, cy + 2, r * 1.4, r * 0.65, 0xb8dff2);
        p.ellipse(cx - r * 0.6, cy, r * 0.8, r * 0.6, 0xeef9ff);
        p.ellipse(cx + r * 0.5, cy + 1, r * 0.9, r * 0.55, 0xe2f4fc);
        p.ellipse(cx, cy - 1, r * 1.1, r * 0.7, 0xffffff);
    };
    drawCloud(36, 20, 11);
    drawCloud(112, 14, 14);
    drawCloud(172, 24, 10);

    // 3. Distant blue-green fantasy mountains
    for (let x = 0; x < 200; x++) {
        const m1 = 56 - Math.floor(Math.abs(Math.sin(x * 0.028 + 0.6)) * 22 + Math.sin(x * 0.08) * 3);
        for (let y = m1; y < 84; y++) {
            p.px(x, y, y < m1 + 3 ? 0x7ea8b8 : (x % 2 === 0 && y < m1 + 7 ? 0x6893a6 : 0x5a8296));
        }
    }

    // 4. Rolling sunlit green hills & treeline silhouette
    for (let x = 0; x < 200; x++) {
        const hillY = 66 - Math.floor(Math.sin(x * 0.035) * 9 + Math.cos(x * 0.07) * 4);
        for (let y = hillY; y < 84; y++) {
            const h = hash2d(x, y);
            const col = y < hillY + 3 ? 0x7ac744 : (h < 0.25 ? 0x4b8f28 : 0x5ca632);
            p.px(x, y, col);
        }
    }

    // 5. Ancient ruin pillars on the horizon (echoing the Guardian's Ruins!)
    const drawHorizonPillar = (px, py, h) => {
        p.rect(px, py - h, 8, h, 0x60737d);
        p.rect(px, py - h, 3, h, 0x90a4ae);
        p.rect(px - 1, py - h, 10, 2, 0xb0bec5);
        p.rect(px + 1, py - Math.floor(h * 0.6), 3, 2, 0x4c8c2b); // moss
    };
    drawHorizonPillar(22, 82, 22);
    drawHorizonPillar(36, 80, 14);
    drawHorizonPillar(164, 81, 24);
    drawHorizonPillar(178, 82, 16);

    // 6. Lush meadow foreground with pixel-art grass tufts & wildflowers
    for (let y = 78; y < 150; y++) {
        const depthT = (y - 78) / 72;
        for (let x = 0; x < 200; x++) {
            const h = hash2d(x, y);
            let col = depthT < 0.35 ? 0x5c9e2b : (depthT < 0.7 ? 0x4f8c24 : 0x41781d);
            if (h < 0.14) col = 0x3b6e19;
            else if (h > 0.90) col = 0x73bd3a;
            p.px(x, y, col);
        }
    }

    // 7. Textured stone-rimmed sandy combat arena ring
    for (let y = 84; y < 142; y++) {
        for (let x = 14; x < 186; x++) {
            const dx = (x - 100) / 82;
            const dy = (y - 112) / 26;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d <= 1.06) {
                const h = hash2d(x, y);
                if (d > 0.96) {
                    // Mossy grass & earthen border
                    p.px(x, y, h < 0.5 ? 0x365e18 : 0x6e4e2c);
                } else if (d > 0.88) {
                    // Cobble stone ring
                    const seg = Math.floor((Math.atan2(dy, dx) + Math.PI) * 10);
                    p.px(x, y, seg % 2 === 0 ? 0x8d9aa0 : 0x738087);
                } else {
                    // Warm sunlit sandy arena floor with carved inner rune circle
                    let col = d < 0.55 ? 0xd8b47c : 0xc49a62;
                    if (Math.abs(d - 0.54) < 0.03) col = 0xa37b4a;
                    else if (h < 0.12) col = 0xb08750;
                    else if (h > 0.92) col = 0xe8ca98;
                    p.px(x, y, col);
                }
            }
        }
    }

    // Foreground wildflower accents near arena edges
    const flowers = [[14, 130, 0xfff59d], [22, 136, 0xffffff], [178, 128, 0xffd54f], [186, 138, 0xff8a65], [96, 143, 0xffffff]];
    for (const [fx, fy, fc] of flowers) {
        p.rect(fx - 1, fy, 3, 2, 0x2e6118);
        p.px(fx, fy - 1, fc);
    }

    p.save('assets/ui/battle_bg.png');
}

// =========================================================================
// 4. DISTINCT 16/32-BIT PIXEL-ART NPCS (GUIDE 48x64 & ELDER 64x64)
// =========================================================================

/**
 * Village Guide / Scout (npc_guide.png, 48x64 = 24x32 @2x)
 * Distinct from Hero: hooded forest-green traveler cloak, golden feather,
 * beige tunic, leather satchel, and wooden lantern staff!
 */
function buildNpcGuide() {
    const p = new PixelArt(24, 32, 2);

    // Boots (feet at y=28..30)
    p.rect(7, 27, 4, 3, 0x4e301b); p.px(8, 27, 0x7d502e);
    p.rect(13, 27, 4, 3, 0x422816); p.px(14, 27, 0x6b4326);

    // Warm cream/beige traveler tunic & dark brown trousers
    p.rect(7, 24, 10, 4, 0x5c4632);
    p.rect(6, 16, 12, 9, 0xdcc498);
    p.rect(7, 17, 5, 7, 0xf0ddb8); // sunlit left side
    p.rect(14, 17, 3, 7, 0xb89c6e); // shadowed right side
    // Leather belt + brass buckle + diagonal satchel strap
    p.rect(6, 22, 12, 2, 0x5c361c);
    p.rect(11, 22, 2, 2, 0xffca28);
    p.px(8, 17, 0x6e4123); p.px(9, 18, 0x6e4123); p.px(10, 19, 0x6e4123); p.px(11, 20, 0x6e4123); p.px(12, 21, 0x6e4123);

    // Forest-green scout mantle/shoulders & scarf
    p.rect(5, 14, 14, 4, 0x2f6e33);
    p.rect(6, 14, 6, 3, 0x499945);
    p.rect(14, 15, 4, 3, 0x225427);
    // Warm amber scarf clasp
    p.rect(10, 15, 4, 2, 0xd9822b); p.px(11, 15, 0xffca28);

    // Arms & gloves (left hand resting, right hand holding wooden staff)
    p.rect(4, 18, 3, 5, 0x3b7d3b); p.rect(4, 22, 3, 2, 0x704224);
    p.rect(17, 18, 3, 5, 0x2a5e2d); p.rect(17, 21, 3, 2, 0x704224);

    // Wooden explorer staff with warm glowing lantern on right (x=20..22)
    p.rect(20, 9, 2, 21, 0x6d4526);
    p.rect(20, 9, 1, 21, 0x99653b);
    // Small hanging brass lantern at top of staff
    p.rect(19, 6, 4, 5, 0x4a3420);
    p.rect(20, 7, 2, 3, 0xffe066);
    p.px(20, 7, 0xffffff);

    // Expressive face (warm skin tone, friendly eyes, silver-blonde bangs)
    p.rect(7, 8, 10, 7, 0xf2ba8a);
    p.rect(7, 8, 5, 6, 0xffcfa3); // sunlit cheek
    p.rect(14, 10, 3, 4, 0xd49668); // right shadow
    // Warm rosy cheeks
    p.px(8, 13, 0xe89578); p.px(15, 13, 0xd98468);
    // Eyes (clear dark pupils with white sparkle)
    p.rect(8, 11, 2, 2, 0x211814); p.px(8, 11, 0xffffff);
    p.rect(14, 11, 2, 2, 0x211814); p.px(14, 11, 0xffffff);
    // Friendly smile
    p.rect(11, 14, 2, 1, 0x99583d);
    // Light sandy-blonde hair fringe
    p.rect(7, 7, 10, 3, 0xd4a459);
    p.rect(8, 7, 5, 2, 0xf0c97a);
    p.px(7, 10, 0xb88642); p.px(16, 10, 0x9c6e32);

    // Pointed Forest Ranger Hat with gold band & bright feather!
    p.rect(4, 6, 16, 2, 0x275e2b); p.rect(5, 6, 8, 1, 0x499945); // brim
    p.rect(6, 4, 12, 3, 0x357a38); p.rect(7, 4, 5, 2, 0x57b051); // crown
    p.rect(8, 2, 7, 2, 0x2f6e33); p.rect(9, 2, 3, 1, 0x57b051);  // peak
    p.rect(6, 5, 12, 1, 0xd49b2a); // golden hatband
    // Crimson/gold plume feather on left of hat
    p.rect(4, 2, 2, 4, 0xe64a19); p.px(4, 2, 0xffab40); p.px(5, 3, 0xff7043);

    p.addOutline(0x1b1512);
    p.save('assets/characters/npc_guide.png');
    p.save('assets/props/npc_guide.png');
}

/**
 * Village Elder / Sage (npc_elder.png, 64x64 = 32x32 @2x)
 * Wise robed elder with long white beard, burgundy-gold cloak, and emerald crystal staff.
 */
function buildNpcElder() {
    const p = new PixelArt(32, 32, 2);

    // Flowing sage robe (deep burgundy & cream trim)
    p.rect(9, 14, 14, 15, 0x6b2838);
    p.rect(10, 14, 6, 14, 0x8f384c); // sunlit left fold
    p.rect(18, 14, 4, 14, 0x4d1b27); // shadowed right fold
    // Cream & gold central stole
    p.rect(13, 15, 6, 14, 0xe8d9b5);
    p.rect(14, 15, 4, 14, 0xf7ebd0);
    p.rect(13, 15, 1, 14, 0xd49b2a);
    p.rect(18, 15, 1, 14, 0xb8821d);
    p.rect(9, 27, 14, 2, 0xd49b2a); // gold hem

    // Sleeves & hands
    p.rect(6, 16, 4, 7, 0x7d3042); p.rect(7, 22, 2, 2, 0xf2ba8a);
    p.rect(22, 16, 4, 7, 0x57202e); p.rect(23, 21, 2, 2, 0xe0a475);

    // Ancient gnarled staff with glowing emerald crystal orb (x=25..27)
    p.rect(25, 9, 2, 20, 0x5e3a20); p.rect(25, 9, 1, 20, 0x855532);
    p.ellipse(26, 7, 2.5, 2.5, 0x26a69a);
    p.px(25, 6, 0x80f0ff); p.px(26, 7, 0x4dd0e1);

    // Warm elder face & long sculpted white beard
    p.rect(11, 7, 10, 7, 0xf2ba8a);
    p.rect(11, 7, 5, 6, 0xffcfa3);
    // White eyebrows & kind dark eyes
    p.rect(12, 9, 3, 1, 0xf5f5f5); p.rect(17, 9, 3, 1, 0xe0e0e0);
    p.px(13, 10, 0x211814); p.px(18, 10, 0x211814);
    // Long flowing silver-white beard
    p.rect(11, 12, 10, 6, 0xe8eef2);
    p.rect(12, 12, 5, 5, 0xffffff);
    p.rect(13, 18, 6, 3, 0xd5dfe6);
    p.rect(14, 20, 4, 2, 0xc3d0d9);

    // Ceremonial sage hood/cap with golden trim
    p.rect(9, 4, 14, 4, 0x6b2838);
    p.rect(10, 4, 7, 3, 0x8f384c);
    p.rect(11, 2, 10, 3, 0x7d3042);
    p.rect(9, 7, 14, 1, 0xffca28);

    p.addOutline(0x1c1414);
    p.save('assets/characters/npc_elder.png');
    p.save('assets/props/npc_elder.png');
}

buildMossBrambleCharger();
buildThornSpitter();
buildRuinGuardianBoss();
buildFantasyCottage();
buildCliffTile();
buildRuinColumn();
buildTreasureChests();
buildSignpost();
buildFence();
buildIndoorWall();
buildBattleBackground();
buildNpcGuide();
buildNpcElder();
console.log('All 16 graphics assets (including distinct Guide & Elder NPCs) upgraded successfully!');
