// 行列ができている場面の確認。node shot3.mjs
import './mute-auto.mjs'  // テスト中は絶対に音を出さない（playwright を無音に差し替え）
import { chromium } from 'playwright'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
import { spawn } from 'node:child_process'
const srv = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '5548' } }); await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(MUTE_LAUNCH)
for (const [w, h, n] of [[390, 844, 'phone'], [1440, 900, 'pc']]) {
  const ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: w, height: h } }); await muteContext(ctx)
  const p = await ctx.newPage(); await p.goto('http://localhost:5548/'); await p.waitForFunction(() => window.__acReady)
  const r = await p.evaluate(() => { ac.dbg.pause(true); ac.start(1, { skipBoss: true }); let g = 0; while (ac.state().queue.length < 3 && g++ < 3000) { ac.dbg.step(6); const s = ac.state(); if (s.phase === 'turn' && !s.busy && ac.G.t - ac.G.cur.lastAct > 3) { const c = ac.D.C.find(x => x.k === s.k); ac.act(c.minor ? 'refuse' : 'sell') } } ac.dbg.step(60 * 36); return ac.state() })
  await p.waitForTimeout(200); await p.screenshot({ path: `shots/q-${n}.png` }); console.log(n, r.queue, r.k)
  await ctx.close()
}
await b.close(); srv.kill()
