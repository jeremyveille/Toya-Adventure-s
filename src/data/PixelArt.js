/**
 * Original, deliberately stepped pixel-art textures. No external artwork is used.
 * Objects have transparent margins; shadows belong to the world's ground layer.
 * Coordinates use a 2/4 px grid and a common light source from the upper left.
 */
const PixelArt = {
    generate(scene, ts = 64) {
        const p = {
            ink: 0x293b32, shade: 0x30513a, deep: 0x3f6540,
            green: 0x5b8548, leaf: 0x7ca652, sun: 0xa9bd69,
            woodDark: 0x49392d, wood: 0x765538, woodLight: 0xa17b4d,
            stoneDark: 0x525d58, stone: 0x7c8372, stoneLight: 0xaeb29a,
            cream: 0xe2d3aa, roofDark: 0x754b39, roof: 0xa16849,
            roofLight: 0xc88c5a, gold: 0xd3ae62, water: 0x427e88
        };
        const texture = (key, w, h, draw) => {
            if (scene.textures.exists(key)) return;
            const g = scene.make.graphics({ x: 0, y: 0, add: false });
            const r = (color, x, y, rw, rh, alpha = 1) => {
                g.fillStyle(color, alpha);
                g.fillRect(x, y, rw, rh);
            };
            // A stepped oval made entirely of rectangles, with no filtered edge.
            const oval = (color, x, y, w, h, step = 4, alpha = 1) => {
                for (let row = 0; row < h; row += step) {
                    const yy = ((row + step / 2) / h - 0.5) * 2;
                    const half = Math.floor(Math.sqrt(Math.max(0, 1 - yy * yy)) * w / 2 / step) * step;
                    if (half) r(color, x + w / 2 - half, y + row, half * 2, Math.min(step, h - row), alpha);
                }
            };
            draw(r, oval);
            g.generateTexture(key, w, h);
            g.destroy();
        };
        texture('tex_shadow', 32, 20, (r, o) => o(0x283929, 2, 6, 28, 10, 2, 0.32));

        const tree = (key, w, h, small) => texture(key, w, h, (r, o) => {
            const s = small ? 0.5 : 1;
            const box = (color, x, y, rw, rh) => r(color, x * s, y * s, rw * s, rh * s);
            const crown = (color, x, y, rw, rh) => o(color, x * s, y * s, rw * s, rh * s, small ? 2 : 4);
            // Longer trunk for the small tree keeps a clear foot anchor.
            const root = small ? 180 : 152;
            box(p.woodDark, 50, 72, 28, root - 72);
            box(p.wood, 52, 76, 18, root - 78);
            box(p.woodLight, 54, 98, 6, root - 104);
            box(p.woodDark, 38, root - 8, 18, 8);
            box(p.woodDark, 72, root - 8, 18, 8);
            box(p.wood, 42, root - 8, 12, 4);
            box(p.deep, 58, root - 4, 8, 4);
            box(p.woodDark, 68, 102, 6, 22);
            // Interlocking foliage clusters make the tree read as a volume.
            crown(p.ink, 4, 36, 120, 80);
            crown(p.shade, 8, 24, 112, 80);
            crown(p.deep, 20, 8, 92, 88);
            crown(p.green, 12, 28, 72, 56);
            crown(p.green, 56, 32, 64, 56);
            crown(p.leaf, 20, 12, 80, 56);
            crown(p.sun, 28, 12, 48, 24);
            box(p.leaf, 16, 54, 12, 8);
            box(p.sun, 28, 28, 12, 4);
            box(p.deep, 72, 80, 16, 8);
            box(p.shade, 92, 64, 12, 8);
            box(p.leaf, 52, 64, 12, 4);
            box(p.sun, 60, 20, 12, 4);
        });
        tree('tex_tree', 128, 160, false);
        tree('tex_tree_small', 64, 96, true);

        texture('tex_bush', ts, ts, (r, o) => {
            o(p.ink, 8, 20, 48, 36);
            o(p.deep, 8, 16, 48, 32);
            o(p.green, 12, 12, 40, 28);
            o(p.leaf, 16, 12, 24, 16);
            r(p.sun, 20, 16, 8, 4);
            r(0x995445, 24, 28, 4, 4); r(0x995445, 40, 24, 4, 4);
            r(0xc77b57, 24, 28, 2, 2); r(0xc77b57, 40, 24, 2, 2);
            r(p.shade, 28, 42, 12, 4); r(p.leaf, 12, 32, 8, 4);
        });
        texture('tex_cliff_top', ts, ts, r => {
            r(p.green, 0, 0, ts, ts);
            r(p.leaf, 4, 8, 12, 4); r(p.deep, 36, 36, 12, 4);
            r(p.leaf, 28, 52, 8, 4);
        });
        texture('tex_cliff', ts, ts, r => {
            r(p.stoneDark, 0, 16, ts, ts - 16);
            r(p.stone, 0, 20, ts - 4, 40);
            r(p.stoneLight, 0, 20, ts - 4, 4);
            r(p.green, 0, 0, ts, 16); r(p.leaf, 0, 12, ts, 4);
            [[4,16,8,8],[24,16,12,4],[48,16,8,8]].forEach(a => r(p.deep,...a));
            [[0,36,20,4],[28,32,36,4],[16,36,4,16],[42,48,22,4],[0,56,34,4]].forEach(a => r(p.stoneDark,...a));
            r(p.stoneLight, 4, 28, 12, 4); r(p.stoneLight, 24, 44, 14, 4);
        });
        texture('tex_house', 192, 240, r => {
            // Stone chimney behind a sloping, stepped tiled roof.
            r(p.stoneDark, 140, 10, 24, 76); r(p.stone, 140, 10, 18, 76);
            for (let y = 22; y < 70; y += 16) r(p.stoneDark, 140, y, 24, 4);
            r(p.stoneLight, 136, 8, 32, 6);
            r(p.woodDark, 12, 110, 168, 114);
            r(p.cream, 18, 114, 156, 102);
            r(0xb6aa86, 154, 116, 20, 100);
            // Roof silhouette is wider at the eaves, with consistent pixel steps.
            for (let y = 30; y < 108; y += 12) {
                const inset = Math.max(4, 24 - Math.floor((y - 30) / 12) * 4);
                r(p.roofDark, inset, y, 192 - inset * 2, 12);
                r(y < 66 ? p.roofLight : p.roof, inset + 2, y, 188 - inset * 2, 8);
                for (let x = inset + 10 + ((y / 12) % 2) * 8; x < 184 - inset; x += 24) r(p.roofDark, x, y, 2, 8);
            }
            r(p.gold, 22, 26, 148, 4); r(p.woodDark, 4, 108, 184, 8);
            r(p.wood, 12, 116, 8, 104); r(p.wood, 172, 116, 8, 104);
            r(p.wood, 18, 158, 156, 8);
            r(p.wood, 88, 116, 8, 44);
            for (const wx of [32, 132]) {
                r(p.woodDark, wx - 4, 126, 28, 28);
                r(p.gold, wx, 128, 20, 22); r(0xf2dfa2, wx, 128, 8, 8);
                r(p.wood, wx + 8, 128, 4, 22); r(p.wood, wx, 138, 20, 4);
                r(p.woodLight, wx - 8, 126, 4, 26); r(p.woodDark, wx + 24, 126, 4, 26);
            }
            r(p.woodDark, 76, 168, 40, 56); r(p.wood, 80, 172, 32, 48);
            r(p.woodLight, 82, 172, 4, 46);
            r(p.woodDark, 92, 172, 2, 48); r(p.woodDark, 104, 172, 2, 48);
            r(p.gold, 104, 194, 4, 4);
            r(p.stoneDark, 10, 220, 172, 16); r(p.stone, 10, 220, 172, 8);
            r(p.stoneLight, 10, 220, 172, 2);
            for (let x = 38; x < 180; x += 38) r(p.stoneDark, x, 222, 2, 14);
            r(p.stoneLight, 72, 230, 48, 6);
        });
        texture('tex_ruin', ts, 80, r => {
            r(p.stoneDark, 12, 16, 40, 60); r(p.stone, 16, 16, 30, 60);
            r(p.stoneLight, 16, 18, 6, 52);
            r(p.stoneLight, 10, 12, 44, 8); r(p.stoneDark, 10, 20, 44, 4);
            r(p.stoneDark, 28, 30, 12, 4); r(p.stoneDark, 36, 34, 4, 12);
            r(p.deep, 12, 48, 8, 16); r(p.green, 16, 46, 8, 6);
            r(p.leaf, 16, 46, 4, 4); r(p.deep, 40, 62, 8, 12);
        });
        texture('tex_ruin_small', ts, 48, (r, o) => {
            o(p.stoneDark, 12, 12, 40, 32); o(p.stone, 12, 10, 36, 26);
            r(p.stoneLight, 20, 12, 16, 6); r(p.stoneDark, 38, 22, 4, 12);
            r(p.deep, 20, 32, 16, 6); r(p.green, 20, 30, 12, 4);
        });
        texture('tex_sign', ts, ts, r => {
            r(p.woodDark, 28, 24, 8, 36); r(p.wood, 28, 24, 4, 34);
            r(p.woodDark, 12, 12, 40, 22); r(p.woodLight, 14, 12, 36, 16);
            r(p.wood, 14, 12, 36, 4);
            r(p.woodDark, 22, 20, 16, 4); r(p.woodDark, 36, 16, 4, 12);
        });
        texture('tex_fence', ts, ts, r => {
            r(p.woodDark, 8, 16, 8, 44); r(p.woodDark, 48, 16, 8, 44);
            r(p.wood, 8, 16, 4, 44); r(p.wood, 48, 16, 4, 44);
            for (const y of [24, 40]) { r(p.woodDark, 4, y + 4, 56, 4); r(p.woodLight, 4, y, 56, 4); }
            r(p.gold, 8, 24, 2, 2); r(p.gold, 48, 24, 2, 2);
        });
        const chest = (key, open) => texture(key, ts, ts, r => {
            r(p.woodDark, 12, 24, 40, 28); r(p.wood, 16, 26, 32, 22);
            r(p.woodLight, 16, 26, 32, 6); r(p.gold, 18, 26, 4, 24); r(p.gold, 42, 26, 4, 24);
            r(p.woodDark, 14, open ? 14 : 20, 36, 14);
            r(p.woodLight, 14, open ? 12 : 18, 36, 10);
            r(p.gold, 14, open ? 20 : 28, 36, 4);
            if (open) r(p.ink, 18, 28, 28, 8);
            else { r(p.gold, 28, 28, 8, 10); r(p.woodDark, 32, 30, 2, 4); }
        });
        chest('tex_chest_closed', false); chest('tex_chest_opened', true);
        texture('tex_npc', ts, ts, r => {
            // A village keeper in a warm robe, standing on their own feet.
            r(p.woodDark, 20, 52, 10, 6); r(p.woodDark, 34, 52, 10, 6);
            r(p.ink, 20, 28, 24, 26); r(0x8c7553, 22, 28, 20, 24);
            r(p.cream, 24, 30, 6, 20); r(p.wood, 40, 30, 4, 22);
            r(0xb99d76, 22, 10, 22, 20); r(0xe0bd8c, 24, 12, 18, 18);
            r(p.cream, 22, 10, 20, 6); r(p.cream, 20, 16, 4, 12);
            r(p.ink, 28, 20, 2, 2); r(p.ink, 38, 20, 2, 2);
            r(p.cream, 28, 26, 12, 8); r(p.wood, 46, 28, 4, 30);
            r(p.woodLight, 46, 26, 4, 6);
        });
        texture('tex_leaf', 6, 6, r => { r(p.leaf, 0, 2, 4, 4); r(p.sun, 2, 0, 4, 2); });
        texture('tex_wall', ts, ts, r => {
            r(p.woodDark, 0, 0, ts, ts); r(p.wood, 0, 0, ts, ts - 12);
            r(p.woodLight, 0, 0, ts, 4);
            for (const y of [18, 36]) { r(p.woodDark, 0, y, ts, 4); r(p.woodLight, 0, y + 4, ts, 2); }
            r(p.ink, 0, ts - 8, ts, 8);
        });
        texture('tex_slime', ts, ts, (r, o) => {
            // Original moss creature: the transparent foot margin has no ground.
            o(p.ink, 8, 20, 48, 40); o(p.deep, 8, 16, 48, 40);
            o(p.green, 12, 12, 40, 36); o(p.leaf, 16, 12, 28, 24);
            r(p.sun, 20, 16, 12, 4); r(p.leaf, 36, 26, 8, 4);
            r(p.ink, 20, 32, 6, 8); r(p.ink, 38, 32, 6, 8);
            r(p.cream, 20, 32, 2, 2); r(p.cream, 38, 32, 2, 2);
            r(p.ink, 28, 44, 8, 2); r(p.shade, 16, 50, 8, 4);
            r(p.deep, 36, 50, 12, 4);
        });
        for (let frame = 0; frame < 3; frame++) {
            texture('tex_water_' + frame, ts, ts, r => {
                r(p.water, 0, 0, ts, ts);
                r(0x39717d, 0, 0, ts, 6);
                const shift = frame * 4;
                for (const [x, y, w] of [[8,16,16],[36,40,20],[4,56,12]]) {
                    r(0x639c9b, (x + shift) % 48, y, w, 2);
                    r(0x8bb8ac, (x + shift + 4) % 48, y, 6, 2);
                }
            });
        }
    }
};

if (typeof module !== 'undefined' && module.exports) module.exports = PixelArt;
