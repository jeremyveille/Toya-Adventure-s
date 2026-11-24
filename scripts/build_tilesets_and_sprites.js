/**
 * scripts/build_tilesets_and_sprites.js
 * Construit les tilesets 64x64 parfaitement raccordables (ZERO couture / ZERO bruit granuleux) :
 * - meadow_dirt_64.png (512x64, 8 frames) : 4 variantes d'herbe paisible sans couture,
 *   2 variantes d'herbe sauvage, 1 terre battue lisse, 1 tablier de pont en chêne
 * - grass_dirt_dualgrid_64.png (1024x64) : Dual-Grid 15-piece lisse et pictural (style RPG 16/32-bit)
 * - water_bank_dualgrid_64.png (1024x64) : Dual-Grid 15-piece eau claire et berges 2.5D
 * - shadow.png (64x32 RGBA) : ombre de contact douce et translucide en pixel-art
 * - herb_patch.png, herb.png, hatchet.png
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const rootDir = path.resolve(__dirname, '..');

// --- CRC32 & PNG CODEC (32-bit RGBA) ---
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
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
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

function decodePNG(filePath) {
    const buf = fs.readFileSync(filePath);
    const w = buf.readUInt32BE(16);
    const h = buf.readUInt32BE(20);
    let pos = 8;
    const idats = [];
    while (pos < buf.length) {
        const len = buf.readUInt32BE(pos);
        const type = buf.subarray(pos + 4, pos + 8).toString('ascii');
        if (type === 'IDAT') idats.push(buf.subarray(pos + 8, pos + 8 + len));
        pos += 12 + len;
    }
    const raw = zlib.inflateSync(Buffer.concat(idats));
    const bpp = 4;
    const stride = 1 + w * bpp;
    const out = Buffer.alloc(w * h * bpp);
    for (let y = 0; y < h; y++) {
        const f = raw[y * stride];
        const rowStart = y * stride + 1;
        const dstStart = y * w * bpp;
        for (let i = 0; i < w * bpp; i++) {
            const x = raw[rowStart + i];
            const a = i >= bpp ? out[dstStart + i - bpp] : 0;
            const b = y > 0 ? out[(y - 1) * w * bpp + i] : 0;
            const c = (y > 0 && i >= bpp) ? out[(y - 1) * w * bpp + i - bpp] : 0;
            let v = x;
            if (f === 1) v = (x + a) & 0xff;
            else if (f === 2) v = (x + b) & 0xff;
            else if (f === 3) v = (x + ((a + b) >> 1)) & 0xff;
            else if (f === 4) {
                const p = a + b - c;
                const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                const pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
                v = (x + pr) & 0xff;
            }
            out[dstStart + i] = v;
        }
    }
    return { w, h, data: out };
}

class Canvas {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.buf = Buffer.alloc(w * h * 4, 0);
    }
    setPx(x, y, r, g, b, a = 255) {
        x = Math.floor(x); y = Math.floor(y);
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
        const i = (y * this.w + x) * 4;
        this.buf[i] = r; this.buf[i + 1] = g; this.buf[i + 2] = b; this.buf[i + 3] = a;
    }
    setHex(x, y, hex, a = 255) {
        this.setPx(x, y, (hex >> 16) & 255, (hex >> 8) & 255, hex & 255, a);
    }
    rect(x, y, w, h, hex, a = 255) {
        const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
        for (let yy = y; yy < y + h; yy++) {
            for (let xx = x; xx < x + w; xx++) this.setPx(xx, yy, r, g, b, a);
        }
    }
    blitNearest(src, sx, sy, sw, sh, dx, dy, dw, dh, keyWhite = false) {
        for (let y = 0; y < dh; y++) {
            const ry = sy + Math.floor((y * sh) / dh);
            for (let x = 0; x < dw; x++) {
                const rx = sx + Math.floor((x * sw) / dw);
                const si = (ry * src.w + rx) * 4;
                const r = src.data[si], g = src.data[si + 1], b = src.data[si + 2], a = src.data[si + 3];
                if (a < 40) continue;
                if (keyWhite && r > 235 && g > 235 && b > 235) continue;
                this.setPx(dx + x, dy + y, r, g, b, a);
            }
        }
    }
    save(relPath) {
        const dest = path.join(rootDir, relPath);
        fs.writeFileSync(dest, encodePNG(this.w, this.h, this.buf));
        console.log(`[Asset] Built ${relPath} (${this.w}x${this.h})`);
    }
}

function findNonWhiteBBox(img, x1, y1, x2, y2) {
    let minX = x2, minY = y2, maxX = x1, maxY = y1;
    for (let y = y1; y < y2; y++) {
        for (let x = x1; x < x2; x++) {
            const i = (y * img.w + x) * 4;
            const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2], a = img.data[i + 3];
            const isBg = a < 40 || (r > 240 && g > 240 && b > 240);
            if (!isBg) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
    }
    return { x: minX, y: minY, w: Math.max(1, maxX - minX + 1), h: Math.max(1, maxY - minY + 1) };
}

/**
 * Smooth periodic wave noise in [0, 1] over 64x64 domain -> 100% seamless tile edges!
 */
function smoothPeriodic(x, y, seed = 0) {
    const u = (x / 64) * Math.PI * 2;
    const v = (y / 64) * Math.PI * 2;
    const w1 = Math.sin(u + seed) * Math.cos(v + seed * 0.7);
    const w2 = Math.sin(u * 2 - v + seed * 1.3) * 0.5;
    const w3 = Math.cos(u + v * 2 + seed * 2.1) * 0.35;
    return (w1 + w2 + w3) / 3.7 + 0.5; // ~ [0, 1]
}

function drawSeamlessGrassTile(canvas, ox, isWild, variant) {
    // Palette Zelda/Ghibli chaleureuse, propre et lisible (aucune ligne de couture)
    const cBase  = isWild ? 0x4e8c30 : 0x62ab37;
    const cLight = isWild ? 0x5c9e38 : 0x71bd40;
    const cSoft  = isWild ? 0x447d28 : 0x569c2f;
    const cBlade = isWild ? 0x35691e : 0x468523;
    const cTip   = isWild ? 0x72b546 : 0x89d44e;

    // 1. Uniform smooth meadow base with identical periodic phase across variants -> 100% invisible tile seams!
    for (let py = 0; py < 64; py += 2) {
        for (let px = 0; px < 64; px += 2) {
            const n = smoothPeriodic(px, py, isWild ? 5 : 0);
            const col = n > 0.68 ? cLight : n < 0.32 ? cSoft : cBase;
            canvas.rect(ox + px, py, 2, 2, col);
        }
    }

    // 2. Clean, crisp hand-placed pixel-art grass tufts (strictly interior -> zero edge clipping!)
    const drawTuft = (tx, ty) => {
        canvas.rect(ox + tx, ty + 4, 8, 2, cBlade);
        canvas.rect(ox + tx + 2, ty + 2, 4, 2, cBlade);
        canvas.rect(ox + tx, ty + 2, 2, 2, cTip);
        canvas.rect(ox + tx + 6, ty + 2, 2, 2, cTip);
        canvas.rect(ox + tx + 4, ty, 2, 2, cTip);
    };

    const tuftLayouts = [
        [[12, 16], [42, 40]],
        [[28, 12], [10, 44], [46, 26]],
        [[18, 28], [44, 14]],
        [[14, 14], [38, 44]]
    ];
    const tufts = tuftLayouts[variant % tuftLayouts.length];
    for (const [tx, ty] of tufts) drawTuft(tx, ty);

    // 3. Variant 2 & 3 subtle wildflowers / clover dots
    if (variant === 2) {
        // Tiny golden buttercup
        canvas.rect(ox + 34, 34, 4, 4, cBlade);
        canvas.rect(ox + 34, 32, 4, 2, 0xffe066);
        canvas.rect(ox + 36, 32, 2, 2, 0xfff9db);
    } else if (variant === 3) {
        // Tiny white meadow daisies
        const daisies = [[26, 20], [48, 30]];
        for (const [fx, fy] of daisies) {
            canvas.rect(ox + fx, fy + 2, 4, 2, cBlade);
            canvas.rect(ox + fx, fy, 4, 2, isWild ? 0xd8b4fe : 0xffffff);
            canvas.rect(ox + fx + 2, fy, 2, 2, 0xffd54f);
        }
    }
}

/**
 * Clean, painterly 16-bit sunlit dirt surface (NO sandpaper TV noise!).
 */
function getCleanDirtColor(px, py) {
    const n = smoothPeriodic(px, py, 2.4);
    if (n > 0.72) return 0xd8b377; // sunlit patch
    if (n < 0.28) return 0xc09559; // soft warm earth patch
    return 0xcda366;               // smooth base sand/ochre
}

function drawCleanPebbles(canvas, ox, oy, mask) {
    // Only draw 1 or 2 crisp small pebbles strictly inside solid dirt interiors
    const drawPebble = (x, y) => {
        canvas.rect(ox + x, oy + y + 2, 6, 2, 0x997141); // shadow
        canvas.rect(ox + x, oy + y, 6, 2, 0xb88d56);     // body
        canvas.rect(ox + x, oy + y, 4, 2, 0xe3c38f);     // top-left highlight
    };
    if (mask === 15) {
        drawPebble(14, 18);
        drawPebble(42, 44);
    } else if (mask === 12 || mask === 3) {
        drawPebble(28, mask === 12 ? 46 : 12);
    } else if (mask === 5 || mask === 10) {
        drawPebble(mask === 5 ? 12 : 44, 28);
    }
}

function dualGridField(mask, u, v) {
    const tl = (mask & 1) ? 1 : 0;
    const tr = (mask & 2) ? 1 : 0;
    const bl = (mask & 4) ? 1 : 0;
    const br = (mask & 8) ? 1 : 0;
    return (tl * (1 - u) + tr * u) * (1 - v) + (bl * (1 - u) + br * u) * v;
}

function buildAllAssets() {
    const collection = decodePNG(path.join(rootDir, 'assets', 'collection.png'));
    const flowerClusterBox = findNonWhiteBBox(collection, 1170, 120, 1400, 260);

    // ------------------------------------------------------------------
    // 1. Seamless 8-frame Terrain Sheet (assets/tilesets/meadow_dirt_64.png, 512x64)
    //    Frames 0..3 : 4 seamless Meadow Grass variations (ZERO grid lines!)
    //    Frames 4..5 : 2 seamless Wild Grass variations (south of bridge)
    //    Frame 6     : Smooth Warm Dirt Path (fallback)
    //    Frame 7     : Elevated Oak Plank Bridge Deck
    // ------------------------------------------------------------------
    {
        const c = new Canvas(512, 64);
        for (let v = 0; v < 4; v++) drawSeamlessGrassTile(c, v * 64, false, v);
        drawSeamlessGrassTile(c, 4 * 64, true, 0);
        drawSeamlessGrassTile(c, 5 * 64, true, 2);

        // Frame 6: Smooth Dirt
        for (let py = 0; py < 64; py += 2) {
            for (let px = 0; px < 64; px += 2) {
                c.rect(6 * 64 + px, py, 2, 2, getCleanDirtColor(px, py));
            }
        }
        drawCleanPebbles(c, 6 * 64, 0, 15);

        // Frame 7: Detailed Warm Oak Bridge Deck
        const bx = 7 * 64;
        c.rect(bx, 0, 64, 64, 0x6b4724);
        for (let py = 0; py < 64; py += 16) {
            c.rect(bx, py, 64, 2, 0xb5844c);
            c.rect(bx, py + 2, 64, 11, 0x946838);
            c.rect(bx, py + 13, 64, 3, 0x452b18);
            // Subtle warm wood plank shading
            c.rect(bx + 12, py + 5, 18, 2, 0x855c30);
            c.rect(bx + 36, py + 8, 14, 2, 0xa37440);
            // Iron rivets
            for (const nx of [6, 54]) {
                c.rect(bx + nx, py + 5, 4, 4, 0x2e211b);
                c.rect(bx + nx, py + 5, 2, 2, 0x90a4ae);
            }
        }
        c.save('assets/tilesets/meadow_dirt_64.png');
    }

    // ------------------------------------------------------------------
    // 2. Smooth Painterly 15-Piece Dual-Grid: Grass / Dirt (1024x64)
    // ------------------------------------------------------------------
    {
        const c = new Canvas(1024, 64);
        for (let mask = 1; mask < 16; mask++) {
            const ox = mask * 64;
            for (let py = 0; py < 64; py += 2) {
                const v = (py + 1) / 64;
                for (let px = 0; px < 64; px += 2) {
                    const u = (px + 1) / 64;
                    const f = dualGridField(mask, u, v);
                    if (f >= 0.48) {
                        let col;
                        if (f < 0.54) {
                            // Crisp dark-olive grass edge shadow hugging the path
                            col = ((px + py) % 4 === 0) ? 0x457d22 : 0x3b6e1d;
                        } else if (f < 0.62) {
                            // Warm recessed earthen rim
                            col = 0xb0844c;
                        } else {
                            // Silky sunlit dirt interior
                            col = getCleanDirtColor(px, py);
                        }
                        c.rect(ox + px, py, 2, 2, col);
                    }
                }
            }
            drawCleanPebbles(c, ox, 0, mask);
        }
        c.save('assets/tilesets/grass_dirt_dualgrid_64.png');
    }

    // ------------------------------------------------------------------
    // 3. Crisp 15-Piece Dual-Grid: Water / Riverbank (1024x64)
    // ------------------------------------------------------------------
    {
        const c = new Canvas(1024, 64);
        for (let mask = 1; mask < 16; mask++) {
            const ox = mask * 64;
            const hasTopWater = (mask & 1) || (mask & 2);
            const hasBotWater = (mask & 4) || (mask & 8);
            for (let py = 0; py < 64; py += 2) {
                const v = (py + 1) / 64;
                for (let px = 0; px < 64; px += 2) {
                    const u = (px + 1) / 64;
                    const f = dualGridField(mask, u, v);
                    if (f >= 0.46) {
                        const isNorthLip = (!hasTopWater && hasBotWater) || (v < 0.5 && f < 0.62);
                        let col;
                        if (f < 0.53) {
                            col = isNorthLip ? 0x543c24 : 0x7d5d38;
                        } else if (f < 0.61) {
                            col = isNorthLip ? 0x1a4b66 : 0x8de0cc;
                        } else {
                            const gx = Math.floor(px / 2), gy = Math.floor(py / 2);
                            const wave = (gy % 8 === 2) && ((gx + Math.floor(gy / 8) * 5) % 10 < 4);
                            const glint = (gy % 12 === 4) && ((gx + 2) % 14 === 0);
                            col = glint ? 0xe8fbff : wave ? 0x6ec3d9 : 0x2b7599;
                        }
                        c.rect(ox + px, py, 2, 2, col);
                    }
                }
            }
        }
        c.save('assets/tilesets/water_bank_dualgrid_64.png');
    }

    // ------------------------------------------------------------------
    // 4. Clean Translucent Contact Shadow (assets/props/shadow.png, 64x32 RGBA)
    //    Replaces the huge opaque gray-green mud puddle with a subtle crisp ellipse!
    // ------------------------------------------------------------------
    {
        const c = new Canvas(64, 32);
        for (let py = 0; py < 32; py += 2) {
            for (let px = 0; px < 64; px += 2) {
                const dx = (px + 1 - 32) / 24;
                const dy = (py + 1 - 16) / 11;
                const d = dx * dx + dy * dy;
                if (d <= 1.0) {
                    const alpha = d <= 0.62 ? 78 : 38; // Soft grounded translucent pixel shadow
                    c.rect(px, py, 2, 2, 0x0f2010, alpha);
                }
            }
        }
        c.save('assets/props/shadow.png');
    }

    // ------------------------------------------------------------------
    // 5. World Prop: Medicinal Herb Patch (assets/props/herb_patch.png, 64x64 RGBA)
    // ------------------------------------------------------------------
    {
        const c = new Canvas(64, 64);
        const aspect = flowerClusterBox.w / flowerClusterBox.h;
        const dstW = 54;
        const dstH = Math.min(48, Math.max(30, Math.round(dstW / aspect)));
        const dx = Math.floor((64 - dstW) / 2);
        const dy = Math.floor(56 - dstH);
        c.blitNearest(
            collection,
            flowerClusterBox.x, flowerClusterBox.y, flowerClusterBox.w, flowerClusterBox.h,
            dx, dy, dstW, dstH, true
        );
        c.save('assets/props/herb_patch.png');
    }

    console.log('Seamless grass, painterly dual-grid dirt/water, and clean contact shadow built!');
}

buildAllAssets();
