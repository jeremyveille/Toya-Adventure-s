// Optional real-Phaser checks; Playwright is supplied by the validation environment.
const fs = require('node:fs');
const path = require('node:path');
const artifactDir = process.env.TOYA_ARTIFACT_DIR || path.resolve(__dirname, '../../work/browser-checks');
fs.mkdirSync(artifactDir, { recursive: true });
const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const ignoreHTTPSErrors = process.env.TOYA_IGNORE_HTTPS_ERRORS === '1';
const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});const p=await b.newPage({viewport:{width:1100,height:1000},ignoreHTTPSErrors});let errors=[];p.on('pageerror',e=>{errors.push(e.message);console.error('RUNTIME',e.stack)});await p.addInitScript(()=>localStorage.setItem('rpg_save_consent','true'));await p.goto(process.env.TOYA_BASE_URL || 'http://localhost:3000');await p.waitForFunction(()=>{try{return !!game.scene.getScene('WorldScene').player}catch{return false}});
const wait=ms=>p.waitForTimeout(ms),hold=async(key,ms)=>{await p.keyboard.down(key);await wait(ms);await p.keyboard.up(key);await wait(150)};
const place=async(x,y)=>{await p.evaluate(({x,y})=>{const w=game.scene.getScene('WorldScene');w.player.setVelocity(0);w.player.body.reset(x,y);w.player.cancelAttack();},{x,y});await wait(80)};
const s=()=>p.evaluate(()=>{const w=game.scene.getScene('WorldScene');return {map:w.targetMapName,x:w.player.x,y:w.player.y,velocity:{x:w.player.body.velocity.x,y:w.player.body.velocity.y},anim:w.player.anims.isPlaying,events:w.events.listenerCount('StartDialogue'),keys:w.input.keyboard.listenerCount('keydown-E'),cam:{x:w.cameras.main.scrollX,y:w.cameras.main.scrollY},hp:gameState.player.hp}});
// Full-tile water collision and frontal cliff: feet stop at the rendered boundary.
await wait(1000);await place(1312,924);await hold('ArrowDown',1800);let result=await s();assert.ok(result.y<962 && result.y>948,JSON.stringify(result));
await hold('ArrowUp',1600);result=await s();assert.ok(result.y>900 && result.y<912,JSON.stringify(result));assert.equal(result.anim,false,'animation stops when feet are blocked by wall');
// Interior trees are passable behind the crown, and fade only behind it.
await place(544,280);await wait(250);const faded=await p.evaluate(()=>{const w=game.scene.getScene('WorldScene');return w.occlusionManager.occluders.filter(o=>o.isOccluding).map(o=>o.sprite.alpha)});assert.ok(faded.some(a=>a<0.4));
await place(544,340);await wait(250);assert.equal(await p.evaluate(()=>game.scene.getScene('WorldScene').occlusionManager.occluders.some(o=>o.isOccluding)),false);
// Actual steps give access to the raised archaeological terrace.
await place(2080,1515);await hold('ArrowUp',1100);result=await s();assert.ok(result.y<1450 && result.y>1350,JSON.stringify(result));await p.screenshot({path:path.join(artifactDir, 'terrace.png')});
// Door sensors exercised repeatedly: no duplicate key handlers/dialogue subscriptions.
for(let turn=0;turn<3;turn++){
 await place(2336,300);await hold('ArrowUp',300);await p.waitForFunction(()=>{const w=game.scene.getScene('WorldScene');return w.targetMapName==='House1'&&w.cameras.main&&w.player?.active});await wait(250);result=await s();assert.equal(result.map,'House1');assert.equal(result.events,1);assert.equal(result.keys,1);
 if(turn===0){await place(288,286);await hold('ArrowUp',20);await p.keyboard.press('e',{delay:50});await wait(150);assert.equal(await p.evaluate(()=>gameState.world.openedChests.includes('chest_house')),true);}
 await place(288,360);await hold('ArrowDown',300);await p.waitForFunction(()=>{const w=game.scene.getScene('WorldScene');return w.targetMapName==='Village'&&w.cameras.main&&w.player?.active});await wait(250);result=await s();assert.equal(result.map,'Village');assert.equal(result.events,1);assert.equal(result.keys,1);assert.ok(result.cam.x>=0 && result.cam.y>=0);
}
// Restart after defeat recovers and retains permanent facts.
await p.evaluate(()=>{const w=game.scene.getScene('WorldScene');gameState.markWorldObject('clearedResources','Village:27:13');gameState.player.hp=0;});await wait(2200);result=await s();assert.equal(result.hp,100);assert.equal(result.map,'Village');assert.equal(await p.evaluate(()=>gameState.world.clearedResources.includes('Village:27:13')),true);
// Narrow viewport layout preserves the 4:3 canvas and exposes HTML controls.
await p.setViewportSize({width:640,height:850});await wait(300);const box=await p.locator('canvas').boundingBox();assert.ok(box.width<=640 && box.width>500);assert.ok(Math.abs(box.width/box.height-4/3)<0.01);
await p.screenshot({path:path.join(artifactDir, 'final-preview.png')});
assert.deepEqual(errors,[]);console.log('WORLD CHECKS PASSED',result,{canvas:box});await b.close();})().catch(e=>{console.error(e);process.exit(1)});
