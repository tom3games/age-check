// 遊び方ごとの結果の分布。node sim.mjs [夜の数]（音は出さない）
import { chromium } from 'playwright'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
import { spawn } from 'node:child_process'
const N = +(process.argv[2] || 12)
const srv = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname, env: { ...process.env, PORT: '5550' } }); await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(MUTE_LAUNCH), ctx = await b.newContext({ locale: 'ja-JP' }); await muteContext(ctx)
const p = await ctx.newPage(); await p.goto('http://localhost:5550/'); await p.waitForFunction(() => window.__acReady)
const BOTS = {
  smart: `const P={c_a:[],c_k:[],c_h:['id'],y_kappa:['id'],y_rokuro:['id'],c_i:['id'],y_zashiki:['ask:birth'],n_tourist:['id']}[c.k]||['id','ask:name','ask:eto']; G.cur.step=G.cur.step||0; const a=P[G.cur.step++]; if(!a){act(st.minor?'refuse':'sell');return} const [x,y]=a.split(':'); act(x,y)`,
  etoOnly: `if(!G.cur.asked.birth){act('ask','birth');return} if(!G.cur.asked.eto){act('ask','eto');return} const [y,e]=st.claim; act(etoOf(y)===e||e==='?'?'sell':'refuse')`,
  idCheck: `if(!G.cur.idAsked){act('id');return} if(G.cur.v.none){act('refuse');return} act(G.cur.v.fake||st.minor?'refuse':'sell')`,
  refuse: `act('refuse')`, sell: `act('sell')`,
}
const out = {}
for (const [name, pol] of Object.entries(BOTS)) {
  const res = []
  for (let seed = 1; seed <= N; seed++) {
    res.push(await p.evaluate(([pol, seed]) => {
      const ETO = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'], etoOf = y => ETO[((y - 4) % 12 + 12) % 12]
      const { G, act } = ac; ac.dbg.pause(true); ac.start(seed, { skipBoss: true }); const f = new Function('c', 'G', 'act', 'st', 'etoOf', 'ac', pol)
      let g = 0
      while (!ac.state().ended && g++ < 30000) { ac.dbg.step(6); const s = ac.state(); if (!document.querySelector('#mId').hidden) document.querySelector('#bIdClose').click(); if (s.mode !== 'play' || s.phase !== 'turn' || s.busy) continue; f(ac.D.C.find(x => x.k === s.k), G, act, s, etoOf, ac) }
      ac.dbg.step(300); ac.showEnd(); return ac.result().stamp.replace('\n', '') + ':' + ac.total().net
    }, [pol, seed]))
  }
  const tally = {}; for (const r of res) { const k = r.split(':')[0]; tally[k] = (tally[k] || 0) + 1 }
  out[name] = { tally, avgNet: Math.round(res.reduce((a, r) => a + +r.split(':')[1], 0) / N) }
  console.log(name, JSON.stringify(out[name]))
}
await b.close(); srv.kill()
