// 手元の確認用スクショ。node shot.mjs
import { chromium } from 'playwright'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
mkdirSync('shots', { recursive: true })
const srv = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '5541' } }); await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(MUTE_LAUNCH)
for (const [w, h, n] of [[390, 844, 'phone'], [1440, 900, 'pc'], [844, 390, 'land']]) {
  const ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: w, height: h } }); await muteContext(ctx)
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()))
  await p.goto('http://localhost:5541/'); await p.waitForFunction(() => window.__acReady)
  await p.waitForTimeout(600); await p.screenshot({ path: `shots/s-${n}-title.png` })
  await p.evaluate(() => { ac.dbg.pause(true); ac.start(7); ac.dbg.step(60) })
  await p.waitForTimeout(300); await p.screenshot({ path: `shots/s-${n}-boss.png` })
  await p.evaluate(() => { document.querySelector('#bBossSkip').click(); for (let i = 0; i < 200 && ac.state().phase !== 'turn'; i++) ac.dbg.step(10) })
  const hs = await p.evaluate(() => ac.hs(ac.state().k))
  await p.evaluate(h => { ac.inspect(h.sx, h.sy); ac.dbg.step(10) }, hs[0])
  await p.waitForTimeout(300); await p.screenshot({ path: `shots/s-${n}-cust.png` })
  console.log(n, JSON.stringify(await p.evaluate(() => ac.state())), errs)
  await ctx.close()
}
await b.close(); srv.kill()
