import { MUTE_LAUNCH, muteContext } from './mute.mjs'
// 年齢確認の検証。node verify.mjs（音は出さない）
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const ROOT = import.meta.dirname
mkdirSync(ROOT + '/shots', { recursive: true })
const PORT = 5542
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const URL0 = `http://localhost:${PORT}/`
let pass = 0, fail = 0
const results = []
async function t(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error('false'); pass++; results.push(`ok   ${name}${r && r !== true ? '  ' + JSON.stringify(r) : ''}`) }
  catch (e) { fail++; results.push(`FAIL ${name}  ${e.message.split('\n')[0]}`) }
}
const expect = (c, msg) => { if (!c) throw new Error(msg) }
async function open(browser, opts = {}) {
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, ...opts })
  await muteContext(ctx)
  await ctx.addInitScript(() => { try { localStorage.clear() } catch (e) {} })
  const p = await ctx.newPage(); p.errs = []
  p.on('pageerror', e => p.errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error') p.errs.push('console ' + m.text()) })
  p.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) p.errs.push('reqfail ' + r.url()) })
  await p.goto(URL0); await p.waitForFunction(() => window.__acReady, null, { timeout: 15000 })
  return p
}
const overflow = p => p.evaluate(() => {
  const W = document.documentElement.clientWidth, bad = []
  for (const el of document.querySelectorAll('main:not([hidden]) *, .modal:not([hidden]) *')) {
    if (el.closest('[hidden]') || (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true }))) continue
    const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) bad.push((el.id || el.className || el.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right))
  }
  return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) }
})
const fit = q => q.evaluate(() => {
  const H = innerHeight, de = document.documentElement, over = []
  if (de.scrollHeight > H + 1) over.push('page:' + de.scrollHeight)
  for (const el of document.querySelectorAll('main:not([hidden]) button, .modal:not([hidden]) button, .modal:not([hidden]) canvas, .modal:not([hidden]) .sheet, .modal:not([hidden]) .howp, #slip, #bubble:not([hidden]), #note:not([hidden])')) { if (el.closest('[hidden]') || !el.getClientRects().length) continue; const r = el.getBoundingClientRect(); if (r.bottom > H + 1 || r.top < -1) over.push((el.id || el.className) + ':' + Math.round(r.top) + '-' + Math.round(r.bottom)) }
  const gr = document.querySelector('#ckGrid'); if (gr && !document.querySelector('#mCheck').hidden) { const gb = gr.getBoundingClientRect(); for (const c of gr.children) { const r = c.getBoundingClientRect(); if (r.bottom > gb.bottom + 1) { over.push('ck切れ'); break } } }
  // 吹き出しとメモが重ならない
  const b = document.querySelector('#bubble'), n = document.querySelector('#note')
  if (!b.hidden && !n.hidden) { const r1 = b.getBoundingClientRect(), r2 = n.getBoundingClientRect(); if (!(r1.bottom <= r2.top || r2.bottom <= r1.top || r1.right <= r2.left || r2.right <= r1.left)) over.push('bubble×note') }
  return { H, over: over.slice(0, 6) }
})
const SIZES = [[360, 640, 'small'], [390, 844, 'phone'], [844, 390, 'land'], [667, 375, 'land-se'], [768, 1024, 'tab'], [1440, 900, 'pc']]

// 客が言う「生まれ年」と「干支」（耳で聞こえる情報）。干支の字がちがう＝嘘
const CLAIM = { c_a: [1954, '午'], c_b: [1998, '寅'], c_c: [2001, '辰'], c_d: [2002, '午'], c_e: [2006, '戌'], c_f: [2004, '申'], c_g: [1960, '辰'], c_h: [2004, '申'], c_i: [1926, '寅'], c_j: [2004, '子'], c_k: [1981, '酉'], c_l: [2005, '丑'], y_kappa: [1798, '午'], y_kappakid: [2000, '?'], y_rokuro: [1716, '申'], n_oldboy: [1990, '卯'], n_babyface: [1985, '丑'], n_eighteen: [2008, '子'], y_zashiki: [1624, '子'] }
const ETO = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'], etoOf = y => ETO[((y - 4) % 12 + 12) % 12]

const browser = await chromium.launch(MUTE_LAUNCH)
const p = await open(browser)
await t('起動時にエラーが出ない（画像の読み込み失敗なし）', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await t('ブラウザの拡大が起きない（viewport・ピンチ・Ctrl+ホイール・Ctrl+プラス）', async () => {
  const r = await p.evaluate(() => {
    const vp = document.querySelector('meta[name=viewport]').content
    const g = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(g)
    const w = new WheelEvent('wheel', { ctrlKey: true, deltaY: -10, bubbles: true, cancelable: true }); window.dispatchEvent(w)
    const k = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true, cancelable: true }); window.dispatchEvent(k)
    return { vp, gesture: g.defaultPrevented, wheel: w.defaultPrevented, key: k.defaultPrevented, ta: getComputedStyle(document.documentElement).touchAction, us: getComputedStyle(document.body).userSelect }
  })
  expect(/user-scalable=no/.test(r.vp) && r.gesture && r.wheel && r.key && r.ta === 'manipulation' && r.us === 'none', JSON.stringify(r))
})
await t('OGP 一式がある', async () => {
  const r = await p.evaluate(() => ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].map(k => !!document.querySelector(`meta[property="${k}"]`)).concat(!!document.querySelector('meta[name="twitter:card"]')))
  expect(r.every(Boolean), JSON.stringify(r))
})
await t('データ: 大人は生まれ年と干支が合い、合うのは「調べて来た未成年」だけ。どの出方にも決め手がある', async () => {
  const r = await p.evaluate(() => ac.D.C.map(c => ({ k: c.k, minor: c.minor, ids: c.ids.map(v => ({ why: !!(v.why && v.why.ja && v.why.en), none: !!v.none, kind: v.kind || null })) })))
  const bad = []
  for (const c of r) {
    const [y, e] = CLAIM[c.k] || [0, '']; const ok = etoOf(y) === e
    if (!c.minor && !ok && c.k !== 'n_tourist') bad.push(c.k + ' 大人なのに合わない')
    if (c.minor && ok && !['c_e', 'c_f', 'n_eighteen'].includes(c.k)) bad.push(c.k + ' 未成年なのに合う')
    for (const v of c.ids) if (!v.why || (!v.none && !v.kind)) bad.push(c.k + ' 出方の不備')
  }
  expect(r.length === 20 && !bad.length, bad.join(',')); return r.length
})
await t('夜の組み立て: 種ごとに再現・17〜18人・偽物を持つ未成年2人以上・身分証なしの大人あり・幽霊は2時台', async () => {
  const r = await p.evaluate(() => {
    const out = []
    for (let s = 1; s <= 60; s++) {
      const n = ac.buildNight(s), n2 = ac.buildNight(s)
      const same = JSON.stringify(n.map(i => [i.c.k, i.v.kind, i.at])) === JSON.stringify(n2.map(i => [i.c.k, i.v.kind, i.at]))
      const fakes = n.filter(i => i.c.minor && i.v.fake && i.v.y <= 2006).length
      const noid = n.filter(i => !i.c.minor && i.v.none && !i.c.yokai && i.c.k !== 'c_a').length
      const g = n.find(i => i.c.k === 'c_i').at / ac.SHIFT * 300
      const waves = n.filter((i, j) => j && i.at - n[j - 1].at < 5).length
      out.push({ s, same, n: n.length, fakes, noid, g, waves, first: n[0].c.k, last: n[n.length - 1].at })
    }
    return out
  })
  const bad = r.filter(x => !x.same || x.n < 17 || x.fakes < 2 || x.noid < 1 || x.g < 120 || x.g >= 150 || x.waves < 6 || x.first !== 'c_a' || x.last > 300)
  expect(!bad.length, JSON.stringify(bad.slice(0, 3))); return { nights: r.length, waves: r[0].waves, n: r[0].n }
})

await t('最初は店長のルール説明（売上目標の金額つき）→ 1人目はじいさん', async () => {
  const r = await p.evaluate(async () => {
    ac.dbg.pause(true); document.querySelector('#bStart').click(); ac.dbg.step(60)
    const lines = []
    for (let i = 0; i < 10 && !document.querySelector('#boss').hidden; i++) { lines.push(document.querySelector('#bossLine').textContent); document.querySelector('#bBossNext').click(); ac.dbg.step(5) }
    for (let i = 0; i < 100 && ac.state().phase !== 'turn'; i++) ac.dbg.step(10)
    return { lines, st: ac.state() }
  })
  expect(r.lines.length === 6 && /¥[\d,]+/.test(r.lines[0]) && /偽物/.test(r.lines.join('')) && r.st.k === 'c_a' && r.st.phase === 'turn', JSON.stringify(r)); return r.lines[0]
})
await p.screenshot({ path: ROOT + '/shots/v-first.png' })
await t('店長の説明が出る前に「とばす」しても、あとから説明が戻ってこない', async () => {
  const r = await p.evaluate(() => { ac.start(8); ac.dbg.step(10); document.querySelector('#bBossSkip').click(); for (let i = 0; i < 100 && ac.state().phase !== 'turn'; i++) ac.dbg.step(10); return { boss: !document.querySelector('#boss').hidden, st: ac.state() } })
  expect(!r.boss && r.st.k === 'c_a', JSON.stringify(r))
})
await t('文字は同時に2つまで（吹き出し＋メモ）', async () => {
  const r = await p.evaluate(() => [...document.querySelectorAll('#bubble,#note,#boss,#event')].filter(e => !e.hidden).length)
  expect(r <= 2, r); return r
})
await t('全20人の手がかりを全部タップでき、場所ごとに違う一言が出る', async () => {
  const r = await p.evaluate(() => {
    const out = []
    for (const c of ac.D.C) {
      ac.setCur(c.k)
      for (const h of ac.hs(c.k)) { const got = ac.inspect(h.sx, h.sy); if (got !== h.ja) out.push(c.k + ':' + h.ja + '→' + got) }
      if (ac.inspect(60, 100) !== null) out.push(c.k + ' 背景で反応')
    }
    return out
  })
  expect(!r.length, r.join(' | '))
})

// ---- 遊び方の通し（bot）。時間は止まらない
const BOTS = {
  sell: `act('sell')`, refuse: `act('refuse')`, idle: ``,
  // 全員に身分証。日付だけ見る（名前・写真は見ない）
  idAll: `if(!G.cur.idAsked){act('id');return} if(G.cur.v.none){act('refuse');return} const v=G.cur.v; const age=2026-v.y-((v.m>11||(v.m===11&&v.d>1))?1:0); act(age>=20?'sell':'refuse')`,
  // 身分証＋質問で偽物は見抜くが、見た目は見ない（身分証が無ければ断る）
  idCheck: `if(!G.cur.idAsked){act('id');return} if(G.cur.v.none){act('refuse');return} act(G.cur.v.fake||c.minor?'refuse':'sell')`,
  // 生まれ年と干支だけで決める
  etoOnly: `if(!G.cur.asked.birth){act('ask','birth');return} if(!G.cur.asked.eto){act('ask','eto');return} const [y,e]=CLAIM[c.k]; act(etoOf(y)===e?'sell':'refuse')`,
  // 推理する人: 見て、必要な分だけ確かめて、決める（どう見抜けるかは data.js の why）
  slowAll: `const P=['id','ask:name','ask:eto','ask:birth']; G.cur.step=G.cur.step||0; const a=P[G.cur.step++]; if(!a||c.k==='c_a'){act(c.minor?'refuse':'sell');return} const [x,y]=a.split(':'); act(x,y)`,
  smart: `const P={c_a:[],c_k:[],c_h:['id'],y_kappa:['id'],y_rokuro:['id'],c_i:['id'],y_zashiki:['ask:birth'],n_tourist:['id']}[c.k]||['id','ask:name','ask:eto']; G.cur.step=G.cur.step||0; for(const h of ac.hs(c.k).slice(0,2)) ac.inspect(h.sx,h.sy); const a=P[G.cur.step++]; if(!a){act(c.minor?'refuse':'sell');return} const [x,y]=a.split(':'); act(x,y)`,
}
async function bot(pol, seed, all = false, think = 0) {
  return p.evaluate(([pol, seed, all, CLAIM, ETO, think]) => {
    const etoOf = y => ETO[((y - 4) % 12 + 12) % 12]
    const { G, act } = ac; ac.dbg.pause(true); ac.start(seed, { all, skipBoss: true })
    const f = new Function('c', 'G', 'act', 'CLAIM', 'etoOf', 'ac', pol)
    let guard = 0, maxQ = 0
    while (!ac.state().ended && guard++ < 30000) {
      ac.dbg.step(6)
      const s = ac.state(); maxQ = Math.max(maxQ, s.queue.length)
      if (!document.querySelector('#mId').hidden) document.querySelector('#bIdClose').click()
      if (s.mode !== 'play' || s.phase !== 'turn' || s.busy) continue
      if (think && ac.G.t - ac.G.cur.lastAct < think) continue
      f(ac.D.C.find(x => x.k === s.k), G, act, CLAIM, etoOf, ac)
    }
    ac.dbg.step(300)
    const st = ac.state(); ac.showEnd(); const r = ac.result(), tot = ac.total()
    const d = st.done
    return { ended: st.ended, sales: st.sales, quota: st.quota, complaints: st.complaints, right: r.right, total: r.total, left: d.filter(x => x.r === 'left').length, rages: d.filter(x => x.r === 'rage').map(x => x.k), wrong: d.filter(x => !x.ok).map(x => x.k + ':' + x.r), stamp: r.stamp, net: tot.net, maxQ, el: Math.round(st.el) }
  }, [BOTS[pol], seed, all, CLAIM, ETO, think])
}
const runs = {}
for (const pol of ['smart', 'sell', 'refuse', 'idAll', 'idCheck', 'etoOnly', 'idle']) runs[pol] = await bot(pol, 11)
await t('推理する人: 朝5時まで・ノルマ達成・クレーム0・全員正解で本採用', async () => { const r = runs.smart; expect(r.ended === 'dawn' && r.sales >= r.quota && r.complaints === 0 && !r.rages.length && r.right === r.total && r.stamp === '本採用', JSON.stringify(r)); return r })
await t('全部売る人: 未成年に売ってバレて営業停止', async () => { const r = runs.sell; expect(r.ended === 'stop', JSON.stringify(r)); return r })
await t('全部断る人: クレーム3回でクビ（もう無傷のクリアにならない）', async () => { const r = runs.refuse; expect(r.ended === 'fired', JSON.stringify(r)); return r })
await t('全員に身分証を出させて日付だけ見る人: 借り物・偽物の身分証で営業停止', async () => { const r = runs.idAll; expect(r.ended === 'stop', JSON.stringify(r)); return r })
await t('身分証と質問で偽物は見抜くが、見た目を見ない人: 身分証の無い大人を断ってクビ', async () => { const r = runs.idCheck; expect(r.ended === 'fired' || r.ended === 'quota', JSON.stringify(r)); return r })
await t('生まれ年と干支だけで決める人: 本採用にはならない', async () => { const r = runs.etoOnly; expect(r.stamp !== '本採用', JSON.stringify(r)); return r })
await t('何もしない人: 待たせて怒らせ・行列が帰り、最低の判定', async () => { const r = runs.idle; expect(['fired', 'quota'].includes(r.ended) && r.sales === 0, JSON.stringify(r)); return r })
await t('推理する人だけが手取りで勝つ', async () => {
  const s = runs.smart.net, o = ['sell', 'refuse', 'idAll', 'idCheck', 'etoOnly', 'idle'].map(k => runs[k].net)
  expect(o.every(v => v < s), JSON.stringify({ s, o })); return { smart: s, others: o }
})
await t('推理する人は、種を変えても（6夜）本採用。行列は毎晩できる', async () => {
  const out = []
  for (const seed of [1, 2, 3, 4, 5, 6]) { const r = await bot('smart', seed); out.push(r.stamp + '/q' + r.maxQ + '/left' + r.left) }
  expect(out.every(s => s.startsWith('本採用') && /q[2-9]\//.test(s)), out.join(',')); return out
})
await t('人間の速さ（1手ごとに5秒考える）で推理しても、ノルマに届いて営業停止にならない（6夜）', async () => {
  const out = []
  for (const seed of [1, 2, 3, 4, 5, 6]) { const r = await bot('smart', seed, false, 5); out.push(`${r.ended}/${r.stamp.replace('\n', '')}/left${r.left}/¥${r.sales}of${r.quota}`) }
  expect(out.every(s => s.startsWith('dawn')), out.join(' , ')); return out
})
await t('人間の速さで全員に身分証まで確かめると（1手5秒）、行列が帰ってノルマが危うい', async () => {
  const out = []
  for (const seed of [1, 2, 3]) { const r = await bot('slowAll', seed, false, 5); out.push(`${r.ended}/left${r.left}/¥${r.sales}of${r.quota}`) }
  return out
})
await t('もたもたすると行列の客が帰る（売上が消える）', async () => {
  const r = await p.evaluate(() => {
    ac.dbg.pause(true); ac.start(3, { skipBoss: true }); let g = 0
    while (!ac.state().ended && g++ < 30000) { ac.dbg.step(6); const s = ac.state(); if (!document.querySelector('#mId').hidden) document.querySelector('#bIdClose').click(); if (s.phase !== 'turn' || s.busy) continue; if (ac.G.t - ac.G.cur.lastAct < 18) continue; const c = ac.D.C.find(x => x.k === s.k); ac.act(c.minor ? 'refuse' : 'sell') }
    return ac.state().done.filter(x => x.r === 'left').length
  })
  expect(r > 0, r); return r
})

// ---- 個別の仕組み
await t('じいさんに身分証を求めると即ブチギレ（キレ顔・クレーム）', async () => {
  const r = await p.evaluate(() => { ac.start(1, { skipBoss: true }); for (let i = 0; i < 100 && ac.state().phase !== 'turn'; i++) ac.dbg.step(10); ac.act('id'); ac.dbg.step(5); return { o: ac.G.cur.inst.result, ang: ac.G.cur.angry, comp: ac.state().complaints } })
  expect(r.o === 'rage' && r.ang && r.comp === 1, JSON.stringify(r))
})
await p.screenshot({ path: ROOT + '/shots/v-rage.png' })
await t('身分証は財布から出すのに時間がかかり、その間は操作できない', async () => {
  const r = await p.evaluate(() => { const cur = ac.setCur('c_d', { v: ac.D.C.find(c => c.k === 'c_d').ids[0] }); ac.act('id'); const b1 = ac.state().busy, s1 = document.querySelector('#aSell').disabled; ac.dbg.step(30); const c1 = ac.state().card; ac.dbg.step(140); return { b1, s1, c1, c2: ac.state().card } })
  expect(r.b1 && r.s1 && !r.c1 && r.c2, JSON.stringify(r)); return r
})
await t('ろくろ首は怒るほど首が伸びる', async () => {
  const r = await p.evaluate(() => { document.querySelector('#bIdClose').click(); ac.setCur('y_rokuro'); ac.dbg.step(60); const n0 = ac.G.cur.neck; ac.act('ask', 'birth'); ac.dbg.step(80); ac.act('ask', 'eto'); ac.dbg.step(90); return { n0, n1: ac.G.cur.neck } })
  expect(r.n0 < 1 && r.n1 > 60, JSON.stringify(r)); return r
})
await t('身分証9種が描ける（免許・借り物の免許・学生証・偽の学生証・生徒手帳・社員証・クレヨン・パスポート・古い紙・葉・手形）', async () => {
  const r = await p.evaluate(() => {
    const out = {}
    const cases = [['c_d', 0], ['c_j', 0], ['c_e', 0], ['c_e', 1], ['n_oldboy', 1], ['c_c', 1], ['c_g', 1], ['n_tourist', 0], ['c_i', 0], ['y_kappa', 0], ['y_rokuro', 0], ['c_l', 1]]
    for (const [k, vi] of cases) {
      const c = ac.D.C.find(x => x.k === k); ac.setCur(k, { v: c.ids[vi] }); ac.act('id'); ac.dbg.step(160)
      const cv = document.querySelector('#idc'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data
      let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 37) { const v = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; s += v; s2 += v * v; n++ }
      out[k + vi] = { open: !document.querySelector('#mId').hidden, varc: Math.round(s2 / n - (s / n) ** 2) }
      document.querySelector('#bIdClose').click()
    }
    return out
  })
  expect(Object.values(r).every(v => v.open && v.varc > 300), JSON.stringify(r)); return Object.keys(r).length
})
await t('早見表に「2006年11月1日以前」・和暦・干支12個・流行り4つ', async () => {
  const r = await p.evaluate(() => { document.querySelector('#bSheet').click(); const s = document.querySelector('#sheet').innerText; document.querySelector('#bSheetClose').click(); return s })
  expect(/2006年/.test(r) && /昭和/.test(r) && /亥/.test(r) && /たまごっち/.test(r) && /鬼滅/.test(r), r)
})
await t('待たせると怒りがたまる（22秒で1つ）', async () => {
  const r = await p.evaluate(() => { ac.start(3, { skipBoss: true }); for (let i = 0; i < 100 && ac.state().phase !== 'turn'; i++) ac.dbg.step(10); const a0 = ac.state().anger; ac.dbg.step(60 * 23); return { a0, a1: ac.state().anger } })
  expect(r.a0 === 0 && r.a1 >= 1, JSON.stringify(r)); return r
})
await t('Chromium: 遊んでいる最中も実際には無音', async () => {
  const r = await p.evaluate(() => ({ ok: window.__muteOk(), state: ac.Snd.ctx && ac.Snd.ctx.state }))
  expect(r.ok && r.state !== 'running', JSON.stringify(r)); return r
})
await t('音: 入店チャイム・BGM・効果音が呼ばれている（鳴らさず回数で確認）', async () => {
  const r = await p.evaluate(() => ({ calls: window.__soundCalls || 0, played: ac.Snd.played }))
  expect(r.calls > 0 && r.played.chime > 0 && r.played.slam > 0 && r.played.fumble > 0, JSON.stringify(r)); return Object.keys(r.played).length
})
await t('答え合わせ: 来た客が全員並び、押すと決め手が出る', async () => {
  const r = await p.evaluate(() => {
    ac.dbg.pause(true); ac.start(6, { skipBoss: true }); let g = 0
    while (!ac.state().ended && g++ < 30000) { ac.dbg.step(6); const s = ac.state(); if (s.phase !== 'turn' || s.busy) continue; const c = ac.D.C.find(x => x.k === s.k); ac.act(c.minor ? 'refuse' : 'sell') }
    ac.dbg.step(200); ac.showCheck()
    const n = document.querySelectorAll('#ckGrid .ck').length; document.querySelector('#ckGrid .ck').click()
    return { n, done: ac.state().done.length, why: document.querySelector('#ckWhy').textContent, title: document.querySelector('#ckTitle').textContent }
  })
  expect(r.n === r.done && r.n >= 17 && /実年齢/.test(r.why), JSON.stringify(r)); return r.title + ' / ' + r.why
})
await p.screenshot({ path: ROOT + '/shots/v-check.png' })
await t('給料明細が描けて、Xポストの文に結果と正解数が入る', async () => {
  const r = await p.evaluate(() => {
    document.querySelector('#bCkClose').click(); ac.showEnd(); const c = document.querySelector('#slip'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 97) { const v = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; s += v; s2 += v * v; n++ }
    let url = ''; const o = window.open; window.open = u => { url = u }; document.querySelector('#bPost').click(); window.open = o
    return { varc: Math.round(s2 / n - (s / n) ** 2), url: decodeURIComponent(url), vis: !document.querySelector('#vEnd').hidden }
  })
  expect(r.vis && r.varc > 500 && /x\.com\/intent\/post/.test(r.url) && /年齢確認ゲーム/.test(r.url) && /\d+\/\d+人/.test(r.url), JSON.stringify(r)); return r.url.slice(23, 90)
})
await p.screenshot({ path: ROOT + '/shots/v-end.png' })
await t('英語に切り替えると客のセリフも英語', async () => {
  const r = await p.evaluate(() => { ac.setLang('en'); ac.start(2, { skipBoss: true }); for (let i = 0; i < 100 && ac.state().phase !== 'turn'; i++) ac.dbg.step(10); const b = ac.state().bubble; const btn = document.querySelector('#aSell').innerText; ac.setLang('ja'); return { b, btn } })
  expect(/^[\x00-\x7f]+$/.test(r.b) && r.btn.trim() === 'Sell', JSON.stringify(r)); return r
})
await t('ここまでエラーなし', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await p.close()

// ---- 6サイズ × 全画面
const turn = `for (let i = 0; i < 200 && ac.state().phase !== 'turn'; i++) ac.dbg.step(10)`
for (const [w, h, name] of SIZES) {
  const q = await open(browser, { viewport: { width: w, height: h } })
  const views = {}
  views.title = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-1title.png` })
  await q.click('#bHow'); views.how = await fit(q); await q.click('#bHowClose')
  await q.evaluate(() => { ac.dbg.pause(true); document.querySelector('#bStart').click(); ac.dbg.step(60) })
  views.boss = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-2boss.png` })
  await q.evaluate(turn => { document.querySelector('#bBossSkip').click(); eval(turn); ac.dbg.step(60 * 14); const h = ac.hs(ac.state().k)[0]; ac.inspect(h.sx, h.sy); ac.dbg.step(8) }, turn)
  views.play = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-3play.png` })
  await q.evaluate(() => { document.querySelector('#aAsk').click() }); views.qs = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-4qs.png` })
  await q.evaluate(() => { document.querySelector('#qBack').click(); document.querySelector('#bSheet').click() }); views.sheet = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-5sheet.png` })
  await q.evaluate(() => { document.querySelector('#bSheetClose').click(); const c = ac.D.C.find(x => x.k === 'c_j'); ac.setCur('c_j', { v: c.ids[0] }); ac.act('id'); ac.dbg.step(160) })
  views.id = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-6id.png` })
  await q.evaluate(() => { document.querySelector('#bIdClose').click(); ac.start(4, { skipBoss: true }); let g = 0; while (!ac.state().ended && g++ < 9000) { ac.dbg.step(10); if (ac.state().phase === 'turn' && !ac.state().busy) ac.act('sell') } ac.dbg.step(200) })
  views.event = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-7event.png` })
  await q.evaluate(() => { document.querySelector('#bEvCheck').click() }); await q.waitForTimeout(150)
  views.check = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-8check.png` })
  await q.evaluate(() => { document.querySelector('#bCkClose').click(); ac.start(6, { skipBoss: true }); let g = 0; while (!ac.state().ended && g++ < 30000) { ac.dbg.step(6); const s = ac.state(); if (s.phase !== 'turn' || s.busy) continue; const c = ac.D.C.find(x => x.k === s.k); ac.act(c.minor ? 'refuse' : 'sell') } ac.dbg.step(200); document.querySelector('#bEvCheck').click() }); await q.waitForTimeout(150)
  views.checkFull = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-8check-full.png` })
  await q.evaluate(() => { document.querySelector('#bCkClose').click(); document.querySelector('#bEvNext').click() }); await q.waitForTimeout(200)
  views.end = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-9end.png` })
  for (const [v, r] of Object.entries(views)) await t(`一画面に収まる ${name} ${w}x${h} ${v}`, async () => { expect(!r.over.length, JSON.stringify(r)) })
  await t(`${name}: はみ出し・エラーなし`, async () => { const o = await overflow(q); expect(o.sw <= o.W && !o.bad.length && !q.errs.length, JSON.stringify(o) + q.errs.join('|')) })
  await q.close()
}
await browser.close()
// ---- WebKit（iPhone 相当）
const wb = await webkit.launch(), wp = await open(wb, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
await t('WebKit: 2本指の touchmove を止める', async () => {
  const r = await wp.evaluate(() => { const e = new Event('touchmove', { cancelable: true, bubbles: true }); Object.defineProperty(e, 'touches', { value: [{}, {}] }); document.body.dispatchEvent(e); return e.defaultPrevented })
  expect(r, r)
})
await t('WebKit: タップで始めて、客の顔をタップすると手がかりが出て、売れる', async () => {
  await wp.tap('#bStart'); await wp.waitForTimeout(800); await wp.tap('#bBossSkip')
  await wp.waitForFunction(() => ac.state().phase === 'turn', null, { timeout: 15000 })
  const pt = await wp.evaluate(() => { const v = ac.view(), h = ac.hs('c_a')[0]; return { x: v.ox + h.sx * v.s, y: v.oy + h.sy * v.s } })
  await wp.touchscreen.tap(pt.x, pt.y); await wp.waitForTimeout(200)
  const n = await wp.evaluate(() => ac.state().note)
  await wp.tap('#aSell'); await wp.waitForTimeout(300)
  const o = await wp.evaluate(() => ac.G.night[0].result)
  await wp.screenshot({ path: ROOT + '/shots/v-webkit.png' })
  expect(/しわ/.test(n) && o === 'sell', n + ' ' + o); return n
})
await t('WebKit: 遊んでいる最中も実際には無音（AudioContext が止まり、スピーカーの手前が音量0）', async () => {
  const r = await wp.evaluate(() => ({ ok: window.__muteOk(), state: ac.Snd.ctx && ac.Snd.ctx.state, calls: window.__soundCalls }))
  expect(r.ok && r.state !== 'running' && r.calls > 0, JSON.stringify(r)); return r
})
await t('WebKit: エラーなし', async () => { expect(wp.errs.length === 0, wp.errs.join('|')) })
await wb.close()
server.kill()
console.log(results.join('\n'))
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
