"""Parcours facultatif dans Chromium avec Playwright et un serveur de jeu déjà lancé."""
import os
import sys

from playwright.sync_api import sync_playwright


class VillageSession:
    def __init__(self, page):
        self.page = page
        self.attach()

    def attach(self):
        self.page.wait_for_function("typeof game !== 'undefined' && game.scene.isActive('HUDScene')")
        self.page.evaluate("""() => {
            game.loop.sleep();
            window.world = game.scene.keys.WorldScene;
            window.hud = game.scene.keys.HUDScene;
            let time = game.loop.now || performance.now();
            window.tick = count => {
                for (let i = 0; i < count; i++) {
                    time += 1000 / 60;
                    game.headlessStep(time, 1000 / 60);
                }
            };
        }""")
        self.advance(3)

    def advance(self, count):
        self.page.evaluate("count => tick(count)", count)

    def hold(self, key, frames):
        self.page.keyboard.down(key)
        self.advance(frames)
        self.page.keyboard.up(key)
        self.advance(1)

    def tap(self, key):
        self.hold(key, 2)

    def check(self, expression):
        assert self.page.evaluate(expression), expression

    def until(self, condition, limit):
        for _ in range(limit):
            if self.page.evaluate(condition):
                return
            self.advance(1)
        raise AssertionError(f"Condition hors délai : {condition}")

    def walk(self, key, axis, target, direction, run=False):
        if run:
            self.page.keyboard.down("Shift")
        self.page.keyboard.down(key)
        reached = self.page.evaluate("""([axis, target, direction]) => {
            for (let n = 0; n < 600; n++) {
                if ((world.player[axis] - target) * direction >= 0) return true;
                tick(1);
            }
            return false;
        }""", [axis, target, direction])
        self.page.keyboard.up(key)
        if run:
            self.page.keyboard.up("Shift")
        self.advance(10)
        assert reached, f"Passage bloqué vers {axis}={target}"

    def through_door(self, key, map_name):
        self.page.keyboard.down(key)
        self.until(f"world.targetMapName === '{map_name}'", 450)
        self.page.keyboard.up(key)
        self.advance(20)
        self.check("world.events.listenerCount('StartDialogue') === 1")

    def reload(self):
        self.page.reload(wait_until="domcontentloaded")
        self.attach()


def play_village(page):
    t = VillageSession(page)
    t.tap('Space')
    t.advance(24)
    t.check("gameState.passage === 'meet'")
    t.walk('ArrowRight', 'x', 1647, 1)
    t.tap('e')
    t.advance(3)
    t.check("hud.isDialogueActive && gameState.passage === 'cut'")
    t.tap('Space')
    t.advance(4)
    t.walk('ArrowDown', 'y', 786, 1)
    t.walk('ArrowRight', 'x', 1756, 1)
    t.hold('ArrowDown', 100)
    t.check("world.player.y > 840 && world.player.y < 880")
    t.tap('Space')
    t.advance(24)
    t.check("gameState.passage === 'cross' && gameState.inventory.some(i => i.id === 'wood')")
    t.walk('ArrowDown', 'y', 1110, 1, run=True)
    t.check("gameState.passage === 'fight'")
    t.hold('ArrowDown', 12)
    t.advance(5)
    t.until("world.enemies.getChildren()[0]?.phase === 'warn'", 180)
    t.advance(40)
    for _ in range(18):
        if page.evaluate("world.enemies.countActive() === 0"):
            break
        dx, dy = page.evaluate("""() => {
            const enemy = world.enemies.getChildren()[0];
            return [enemy.x - world.player.x, enemy.y - world.player.y];
        }""")
        axis_key = ('ArrowRight' if dx > 0 else 'ArrowLeft') if abs(dx) > abs(dy) else ('ArrowDown' if dy > 0 else 'ArrowUp')
        t.hold(axis_key, 3)
        t.tap('Space')
        t.advance(22)
    t.check("gameState.passage === 'open'")
    t.walk('ArrowDown', 'y', 1339, 1)
    t.walk('ArrowRight', 'x', 1881, 1)
    t.walk('ArrowUp', 'y', 1244, -1)
    t.walk('ArrowRight', 'x', 1915, 1)
    t.tap('e')
    t.advance(3)
    t.check("gameState.passage === 'return'")
    t.reload()
    t.check("gameState.openChests.includes('chest1') && world.enemies.countActive() === 0")
    t.walk('ArrowUp', 'y', 775, -1, run=True)
    t.walk('ArrowLeft', 'x', 1726, -1)
    t.tap('e')
    t.advance(3)
    t.check("gameState.passage === 'done' && !gameState.inventory.some(i => i.id === 'navette')")
    t.tap('Space')
    t.advance(5)

    t.walk('ArrowRight', 'x', 2329, 1, run=True)
    t.through_door('ArrowUp', 'House1')
    t.walk('ArrowUp', 'y', 266, -1)
    t.tap('e')
    t.advance(3)
    t.tap('i')
    t.advance(2)
    t.check("hud.menu === 'Inventaire' && game.scene.isPaused('WorldScene')")
    t.tap('2')
    t.advance(2)
    t.check("gameState.sharpened")
    t.tap('Escape')
    t.advance(3)
    t.through_door('ArrowDown', 'Village')
    t.tap('j')
    t.advance(3)
    t.check("hud.menu === 'Quêtes' && hud.menuContent.text.includes('navette')")
    t.tap('c')
    t.advance(3)
    t.check("hud.menu === 'Atelier'")
    t.tap('Escape')
    t.advance(3)

    # Options audio et progression visibles dans le HUD.
    t.tap('m')
    t.advance(3)
    t.check("audioManager.muted === true && localStorage.getItem('rpg_audio_muted') === 'true'")
    t.check("hud.soundText.text === 'MUET'")
    t.tap('m')
    t.advance(3)
    t.check("audioManager.muted === false && hud.soundText.text === 'SON'")
    t.check("hud.xpText.text.indexOf('Niv.') === 0")


if __name__ == '__main__':
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH'))
        page = browser.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000')
        page.locator('#btn-accept-save').click()
        play_village(page)
        assert not errors, errors
        print('Parcours village, sauvegarde, maison et équipement validés dans Chromium.')
        browser.close()
