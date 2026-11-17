// Optional real-Phaser checks; Playwright is supplied by the validation environment.
const fs = require('node:fs');
const path = require('node:path');
const artifactDir = process.env.TOYA_ARTIFACT_DIR || path.resolve(__dirname, '../../work/browser-checks');
fs.mkdirSync(artifactDir, { recursive: true });
const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const ignoreHTTPSErrors = process.env.TOYA_IGNORE_HTTPS_ERRORS === '1';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1100,height:1000},ignoreHTTPSErrors});
 const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TOYA_BASE_URL || 'http://localhost:3000');await page.waitForFunction(()=>{try{return !!game.scene.getScene('WorldScene').player}catch{return false}});
 await page.locator('#btn-accept-save').click();
 const state=()=>page.evaluate(()=>{const w=game.scene.getScene('WorldScene');return {x:w.player.x,y:w.player.y,hp:gameState.player.hp,flags:{...gameState.world.tutorial},enemies:w.enemies.getChildren().map(e=>({x:e.x,y:e.y,hp:e.hp,state:e.state})),hint:w.interactionHint,map:w.targetMapName,lock:w.controlsLocked,dialogue:game.scene.getScene('HUDScene').isDialogueActive}});
 const hold=async(key,ms)=>{await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);await page.waitForTimeout(100)};
 const tap=async(key)=>{await page.keyboard.press(key,{delay:70});await page.waitForTimeout(110)};
 const go=async(x,y,run=true)=>{if(run)await page.keyboard.down('Shift');for(let i=0;i<30;i++){const s=await state(),dx=x-s.x,dy=y-s.y;if(Math.hypot(dx,dy)<8)break;const axis=Math.abs(dx)>Math.abs(dy)?'x':'y';const delta=axis==='x'?dx:dy;const key=axis==='x'?(delta>0?'ArrowRight':'ArrowLeft'):(delta>0?'ArrowDown':'ArrowUp');await hold(key,Math.min(500,Math.max(20,Math.abs(delta)/(run?230:150)*1000-20)));}if(run)await page.keyboard.up('Shift');};
 const dialogue=async()=>{await tap('KeyE');};
 // Actual keyboard travel from spawn to Guide.
 await hold('ArrowRight',420);await hold('ArrowUp',80);await tap('e');
 assert.equal((await state()).dialogue,true,'Guide opens a dialogue');
 await page.waitForTimeout(160);await tap('Space');await tap('Space');assert.equal((await state()).lock,false);
 assert.equal((await state()).flags.talked,true);
 // Dialogue reopening must be opaque and must not attack on closing.
 await tap('e');assert.equal((await state()).dialogue,true);
 assert.equal(await page.evaluate(()=>game.scene.getScene('HUDScene').dialogueBox.alpha),1);
 await tap('Space');await tap('Space');assert.equal(await page.evaluate(()=>game.scene.getScene('WorldScene').player.isAttacking),false);
 // Walk along the designed path to the only river approach.
 await go(672,608);await go(1760,608);await go(1760,864);
 let s=await state(); console.log('AT GATE',s);assert.ok(s.y<864,'bush blocks north approach');
 assert.equal(s.flags.bushCleared,false);
 await hold('ArrowDown',25);await tap('Space');await page.waitForTimeout(340);assert.equal((await state()).flags.bushCleared,true,'real sword overlap clears gate');
 await go(1760,1090);s=await state();assert.equal(s.flags.crossedBridge,true);assert.equal(s.flags.ran,true);console.log('CROSSED',s);
 await page.screenshot({path:path.join(artifactDir, 'bridge-play.png')});
 // Stand in front of the enemy and let one announced attack land.
 await page.waitForTimeout(1700);s=await state();console.log('COMBAT START',s);
 // Defeat using a sequence of approaches and attacks; no direct HP edits.
 for(let i=0;i<15;i++){
  s=await state();if(!s.enemies.length)break;
  const e=s.enemies[0]; const dx=e.x-s.x,dy=e.y-s.y;
  if(Math.hypot(dx,dy)>37) await go(e.x,e.y-25,false);
  const n=await state();if(!n.enemies.length)break;
  const ee=n.enemies[0],ddx=ee.x-n.x,ddy=ee.y-n.y;
  const face=Math.abs(ddx)>Math.abs(ddy)?(ddx>0?'ArrowRight':'ArrowLeft'):(ddy>0?'ArrowDown':'ArrowUp');
  await hold(face,20);await tap('Space');await page.waitForTimeout(260);
 }
 s=await state();console.log('DEFEATED',s);assert.equal(s.flags.enemyDefeated,true);
 await go(1824,1280);await hold('ArrowDown',20);await tap('e');s=await state();console.log('CHEST',s);assert.equal(s.flags.chestOpened,true);
 await page.screenshot({path:path.join(artifactDir, 'chest-play.png')});
 // Return over bridge and follow the same path to Guide.
 await go(1760,1120);await go(1760,608);await go(672,608);await go(672,540);await hold('ArrowUp',20);await tap('e');
 s=await state();assert.equal(s.flags.completed,true);await tap('Space');await tap('Space');
 const inventory=await page.evaluate(()=>gameState.inventory);assert.ok(inventory.some(i=>i.id==='sword_upgrade'));
 // Equipment / inventory preserve pause and return control.
 await tap('i');assert.equal((await state()).lock,true);await tap('2');await tap('i');assert.equal((await state()).lock,false);
 assert.equal(await page.evaluate(()=>gameState.player.damage),30); // level 2 +25, upgrade +5
 await page.screenshot({path:path.join(artifactDir, 'level-complete.png')});
 // Consent save survives a page reload; no duplicate chest/resource/enemy.
 await page.reload();await page.waitForFunction(()=>{try{return !!game.scene.getScene('WorldScene').player}catch{return false}});
 s=await state();assert.equal(s.flags.completed,true);assert.equal(s.enemies.length,0);
 assert.equal(await page.evaluate(()=>game.scene.getScene('WorldScene').resourceGroup.getChildren().some(z=>z.resourceId==='Village:27:13')),false);
 assert.equal(errors.length,0,errors.join('\n'));console.log('PLAYTHROUGH PASSED',await state(),inventory);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
