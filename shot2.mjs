// 妖怪・身分証の見た目確認。node shot2.mjs
import { chromium } from 'playwright'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
import { spawn } from 'node:child_process'
const srv = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '5546' } }); await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(MUTE_LAUNCH), ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 } }); await muteContext(ctx)
const p = await ctx.newPage(); await p.goto('http://localhost:5546/'); await p.waitForFunction(() => window.__acReady)
await p.evaluate(() => { ac.dbg.pause(true); document.querySelector('#bStart').click(); ac.dbg.step(30); document.querySelector('#bBossSkip').click(); for (let i = 0; i < 100 && ac.state().phase !== 'turn'; i++) ac.dbg.step(10) })
for (const [k, vi] of [['c_g', 1], ['n_tourist', 0], ['n_oldboy', 1], ['c_c', 1], ['c_e', 1], ['y_zashiki', 0]]) {
  await p.evaluate(([k, vi]) => { const c = ac.D.C.find(x => x.k === k); ac.setCur(k, { v: c.ids[vi] }); ac.dbg.step(30); ac.act('id'); ac.dbg.step(170) }, [k, vi])
  await p.waitForTimeout(150); await p.screenshot({ path: `shots/k-${k}-id.png` })
  await p.evaluate(() => { document.querySelector('#bIdClose').click(); if (ac.G.cur.c.neck) { ac.act('ask', 'year'); ac.act('ask', 'eto'); ac.act('ask', 'why') } const h = ac.hs(ac.G.cur.c.k)[0]; ac.inspect(h.sx, h.sy); ac.dbg.step(60) })
  await p.waitForTimeout(150); await p.screenshot({ path: `shots/k-${k}-look.png` })
}
await b.close(); srv.kill()
