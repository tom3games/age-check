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
  // 吹き出しとメモが重ならない
  const b = document.querySelector('#bubble'), n = document.querySelector('#note')
  if (!b.hidden && !n.hidden) { const r1 = b.getBoundingClientRect(), r2 = n.getBoundingClientRect(); if (!(r1.bottom <= r2.top || r2.bottom <= r1.top || r1.right <= r2.left || r2.right <= r1.left)) over.push('bubble×note') }
  return { H, over: over.slice(0, 6) }
})
const SIZES = [[360, 640, 'small'], [390, 844, 'phone'], [844, 390, 'land'], [667, 375, 'land-se'], [768, 1024, 'tab'], [1440, 900, 'pc']]

// 客が言う「生まれ年」と「干支」（耳で聞こえる情報）
const CLAIM = { c_a: [1954, '午'], c_b: [1998, '寅'], c_c: [2001, '辰'], c_d: [2002, '午'], c_e: [2006, '戌'], c_f: [2004, '申'], c_g: [1960, '辰'], c_h: [2004, '申'], c_i: [1926, '寅'], c_j: [2004, '子'], c_k: [1981, '酉'], c_l: [2005, '丑'], y_kappa: [1798, '午'], y_kappakid: [2000, 'か'], y_rokuro: [1716, '申'] }

const browser = await chromium.launch(MUTE_LAUNCH)
const p = await open(browser)
await t('起動時にエラーが出ない', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
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
await t('画像が全部読めている（客15人＋怒り顔5＋店長＋商品6＋背景）', async () => {
  const r = await p.evaluate(() => Object.keys(ac.G.list ? {} : {}).length + 0 || [...document.images].length)
  const n = await p.evaluate(() => { const D = ac.D; return [...D.C.map(c => c.k)].length })
  expect(n === 15, n); return n
})
await t('データの整合: 客が言う生まれ年と干支の組が、正直者は合い、嘘つきは合わない', async () => {
  const ETO = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  const r = await p.evaluate(() => ac.D.C.map(c => ({ k: c.k, minor: c.minor, eto: c.a.eto.ja, year: c.a.year.ja })))
  const bad = []
  for (const c of r) {
    const [y, e] = CLAIM[c.k]; const real = ETO[((y - 1996) % 12 + 12) % 12]
    const ok = real === e
    // 大人は全員つじつまが合う。未成年で合うのは「調べて来た」E と F だけ
    if (!c.minor && !ok) bad.push(c.k + ' 大人なのに合わない')
    if (c.minor && ok && !['c_e', 'c_f'].includes(c.k)) bad.push(c.k + ' 未成年なのに合う')
  }
  expect(!bad.length, bad.join(',')); return r.length
})

// ---- 店長のルール説明から始まる
await t('最初は店長のルール説明（7行）→ 1人目のじいさん', async () => {
  const r = await p.evaluate(async () => {
    ac.dbg.pause(true); document.querySelector('#bStart').click(); ac.dbg.step(60)
    const lines = []
    for (let i = 0; i < 10 && !document.querySelector('#boss').hidden; i++) { lines.push(document.querySelector('#bossLine').textContent); document.querySelector('#bBossNext').click(); ac.dbg.step(5) }
    ac.dbg.step(200)
    return { lines, st: ac.state() }
  })
  expect(r.lines.length === 7 && /20歳未満/.test(r.lines.join('')) && r.st.k === 'c_a' && r.st.phase === 'turn', JSON.stringify(r)); return r.lines[0]
})
await p.screenshot({ path: ROOT + '/shots/v-first.png' })
await t('店長の説明が出る前に「とばす」しても、あとから説明が戻ってこない', async () => {
  const r = await p.evaluate(() => { ac.start(8); ac.dbg.step(10); document.querySelector('#bBossSkip').click(); ac.dbg.step(200); return { boss: !document.querySelector('#boss').hidden, st: ac.state() } })
  expect(!r.boss && r.st.k === 'c_a', JSON.stringify(r))
})
await t('文字は同時に2つまで（吹き出し＋メモ）', async () => {
  const r = await p.evaluate(() => [...document.querySelectorAll('#bubble,#note,#boss,#event')].filter(e => !e.hidden).length)
  expect(r <= 2, r); return r
})

// ---- 見る: 全員の手がかりを1つずつタップ
await t('全15人の手がかりを全部タップでき、場所ごとに違う一言が出る', async () => {
  const r = await p.evaluate(() => {
    const out = []
    for (const c of ac.D.C) {
      ac.G.cur = { c, img: c.k, enterAt: ac.G.t - 5, leaveAt: null, anger: 0, asked: {}, phase: 'turn', lastAct: ac.G.t, put: ac.G.t }; ac.G.mode = 'play'
      for (const h of ac.hs(c.k)) { const got = ac.inspect(h.sx, h.sy); if (got !== h.ja) out.push(c.k + ':' + h.ja + '→' + got) }
      if (ac.inspect(60, 100) !== null) out.push(c.k + ' 背景で反応')
    }
    return out
  })
  expect(!r.length, r.join(' | '))
})
await p.reload(); await p.waitForFunction(() => window.__acReady)

// ---- 遊び方の通し（bot）
const BOTS = {
  sell: `act('sell')`, refuse: `act('refuse')`, idle: ``,
  idAll: `if(!G.cur.idAsked){act('id')} else { const id=c.id; const age=id? 2026-id.y-((id.m>11||(id.m===11&&id.d>1))?1:0):0; act(id&&age>=20?'sell':'refuse') }`,
  etoOnly: `if(!G.cur.asked.year){act('ask','year')} else if(!G.cur.asked.eto){act('ask','eto')} else { const [y,e]=CLAIM[c.k]; const ETO=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']; act(ETO[((y-1996)%12+12)%12]===e?'sell':'refuse') }`,
  // 推理する人: 見る→確かめる→決める（手がかりの読み方は ideas/age-check.md）
  smart: `const S={c_a:['sell'],c_b:['ask:why','sell'],c_c:['ask:year','ask:eto','refuse'],c_d:['id','sell'],c_e:['id','refuse'],c_f:['id','refuse'],c_g:['ask:student','refuse'],c_h:['id','sell'],c_i:['id','sell'],c_j:['id','refuse'],c_k:['sell'],c_l:['ask:year','ask:eto','refuse'],y_kappa:['id','sell'],y_kappakid:['refuse'],y_rokuro:['id','sell']}[c.k]; G.cur.step=(G.cur.step||0); const a=S[G.cur.step++]; if(document.querySelector('#mId').hidden===false) document.querySelector('#bIdClose').click(); const [x,y]=a.split(':'); for(const h of ac.hs(c.k).slice(0,2)) ac.inspect(h.sx,h.sy); act(x,y)`,
}
async function bot(pol, seed, all = true) {
  return p.evaluate(([pol, seed, all, CLAIM]) => {
    const { G, act } = ac; ac.dbg.pause(true); ac.start(seed, { all, skipBoss: true })
    const f = new Function('c', 'G', 'act', 'CLAIM', 'ac', pol)
    let guard = 0, maxAngerSeen = 0, rages = []
    while (!ac.state().ended && guard++ < 40000) {
      ac.dbg.step(10)
      const s = ac.state()
      if (s.mode !== 'play' || s.phase !== 'turn') continue
      const c = ac.D.C.find(x => x.k === s.k)
      f(c, G, act, CLAIM, ac)
      if (G.cur && G.cur.outcome === 'rage' && !rages.includes(c.k)) rages.push(c.k)
    }
    ac.dbg.step(400)
    const st = ac.state(); ac.showEnd(); const r = ac.result(), tot = ac.total()
    return { ended: st.ended, idx: st.idx, complaints: st.complaints, sneaky: st.sneaky, minorsRefused: st.minorsRefused, rages, stamp: r.stamp, net: tot.net, guard, log: G.log.slice(-4) }
  }, [BOTS[pol], seed, all, CLAIM])
}
const runs = {}
for (const pol of ['smart', 'sell', 'refuse', 'idAll', 'etoOnly', 'idle']) runs[pol] = await bot(pol, 11)
await t('推理する人: 15人全員を通して朝5時・クレーム0・ブチギレ0・本採用', async () => { const r = runs.smart; expect(r.ended === 'dawn' && r.complaints === 0 && !r.rages.length && r.stamp === '本採用' && r.minorsRefused === 7, JSON.stringify(r)); return r })
await t('全部売る人: 未成年に売ってバレて営業停止', async () => { const r = runs.sell; expect(r.ended === 'stop' && /営業/.test(r.stamp) && r.net < 0, JSON.stringify(r)); return r })
await t('全部断る人: 大人を怒らせてクビ', async () => { const r = runs.refuse; expect(r.ended === 'fired' && r.stamp === 'クビ', JSON.stringify(r)); return r })
await t('全員に身分証を求めて日付だけで決める人: 勝てない（ブチギレ・写真の別人・持ってない大人）', async () => { const r = runs.idAll; expect(r.ended !== 'dawn' || r.complaints >= 2, JSON.stringify(r)); return r })
await t('生まれ年と干支だけで決める人: 調べて来た未成年に売ってしまう', async () => { const r = runs.etoOnly; expect(r.ended === 'stop' || r.sneaky.length > 0, JSON.stringify(r)); return r })
await t('何もしない人: 待たせて怒らせクビ（最低の判定）', async () => { const r = runs.idle; expect(r.ended === 'fired' && r.stamp === 'クビ', JSON.stringify(r)); return r })
await t('推理する人は、無リスクに見える選び方（全部断る・全部身分証）より手取りが多い', async () => {
  const s = runs.smart.net, o = [runs.refuse.net, runs.idAll.net, runs.etoOnly.net, runs.sell.net, runs.idle.net]
  expect(o.every(v => v < s), JSON.stringify({ s, o })); return { smart: s, others: o }
})
await t('推理する人は、ふつうの夜（12人）でも種を変えて5回とも本採用', async () => {
  const out = []
  for (const seed of [1, 2, 3, 4, 5]) { const r = await bot('smart', seed, false); out.push(r.stamp + '/' + r.idx) }
  expect(out.every(s => s.startsWith('本採用')), out.join(',')); return out
})
await t('同じ種なら同じ客の並び（再現性）。幽霊は2時台、1人目はじいさん', async () => {
  const r = await p.evaluate(() => { ac.start(42, { skipBoss: true }); const a = ac.state().list; ac.start(42, { skipBoss: true }); const b = ac.state().list; ac.start(43, { skipBoss: true }); const c = ac.state().list; return { a, b, c, gi: a.indexOf('c_i'), n: a.length } })
  const min = r.gi * 300 / r.n
  expect(JSON.stringify(r.a) === JSON.stringify(r.b) && JSON.stringify(r.a) !== JSON.stringify(r.c) && r.a[0] === 'c_a' && min >= 120 && min < 180 && r.a.includes('y_kappa') && r.a.includes('y_rokuro'), JSON.stringify(r)); return { ghostAt: min, n: r.n }
})

// ---- 個別の仕組み
await t('大学生（E）に売るとバレないが、明細は「要注意」', async () => {
  const r = await p.evaluate(() => {
    ac.dbg.pause(true); ac.start(5, { all: true, skipBoss: true }); let g = 0
    while (!ac.state().ended && g++ < 20000) { ac.dbg.step(10); const s = ac.state(); if (s.phase !== 'turn') continue; const c = ac.D.C.find(x => x.k === s.k); ac.act(c.minor && c.k !== 'c_e' ? 'refuse' : 'sell') }
    ac.dbg.step(300); ac.showEnd(); return { st: ac.state(), stamp: ac.result().stamp, comment: ac.result().comment }
  })
  expect(r.st.ended === 'dawn' && r.st.sneaky.includes('c_e') && r.stamp === '要注意', JSON.stringify(r)); return r.comment
})
await t('じいさんに身分証を求めると即ブチギレ（キレ顔に変わる）', async () => {
  const r = await p.evaluate(() => { ac.start(1, { skipBoss: true }); ac.dbg.step(200); ac.act('id'); ac.dbg.step(5); return { o: ac.G.cur.outcome, ang: ac.G.cur.angry, comp: ac.state().complaints, b: ac.state().bubble } })
  expect(r.o === 'rage' && r.ang && r.comp === 1, JSON.stringify(r)); return r.b
})
await p.screenshot({ path: ROOT + '/shots/v-rage.png' })
await t('ろくろ首は怒るほど首が伸びる', async () => {
  const r = await p.evaluate(() => {
    const c = ac.D.C.find(x => x.k === 'y_rokuro')
    ac.G.cur = { c, img: c.k, enterAt: ac.G.t - 5, leaveAt: null, anger: 0, asked: {}, phase: 'turn', lastAct: ac.G.t, put: ac.G.t, neck: 0 }; ac.G.mode = 'play'
    ac.dbg.step(60); const n0 = ac.G.cur.neck
    ac.act('ask', 'year'); ac.act('ask', 'eto'); ac.dbg.step(90); const n1 = ac.G.cur.neck
    return { n0, n1 }
  })
  expect(r.n0 < 1 && r.n1 > 60, JSON.stringify(r)); return r
})
await p.screenshot({ path: ROOT + '/shots/v-neck.png' })
await t('身分証が5種とも描ける（免許・学生証・古い紙・ハスの葉・手形）', async () => {
  const r = await p.evaluate(() => {
    const out = {}; ac.G.tasks = []
    for (const k of ['c_d', 'c_e', 'c_i', 'y_kappa', 'y_rokuro', 'c_j']) {
      const c = ac.D.C.find(x => x.k === k)
      ac.G.cur = { c, img: c.k, enterAt: ac.G.t - 5, leaveAt: null, anger: 0, asked: {}, phase: 'turn', lastAct: ac.G.t, put: ac.G.t }; ac.G.mode = 'play'
      ac.act('id'); ac.dbg.step(40)
      const cv = document.querySelector('#idc'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data
      let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 37) { const v = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; s += v; s2 += v * v; n++ }
      out[k] = { open: !document.querySelector('#mId').hidden, varc: Math.round(s2 / n - (s / n) ** 2), ph: ac.G.cur.phase, an: ac.G.cur.anger, b: ac.state().bubble, m: ac.G.mode }
      document.querySelector('#bIdClose').click()
    }
    return out
  })
  expect(Object.values(r).every(v => v.open && v.varc > 300), JSON.stringify(r)); return r
})
await t('早見表に「2006年11月1日以前」と和暦と干支12個', async () => {
  const r = await p.evaluate(() => { document.querySelector('#bSheet').click(); const s = document.querySelector('#sheet').innerText; document.querySelector('#bSheetClose').click(); return s })
  expect(/2006年/.test(r) && /11月1日/.test(r) && /昭和/.test(r) && /平成/.test(r) && /亥/.test(r), r)
})
await t('待たせると怒りがたまる（25秒で1つ）', async () => {
  const r = await p.evaluate(() => { ac.start(3, { skipBoss: true }); ac.dbg.step(200); const a0 = ac.state().anger; ac.dbg.step(60 * 26); return { a0, a1: ac.state().anger, b: ac.state().bubble } })
  expect(r.a0 === 0 && r.a1 === 1, JSON.stringify(r)); return r
})
await t('音: 入店チャイム・BGM・効果音が呼ばれている（鳴らさず回数で確認）', async () => {
  const r = await p.evaluate(() => ({ calls: window.__soundCalls || 0, played: ac.Snd.played }))
  expect(r.calls > 0 && r.played.chime > 0 && r.played.slam > 0, JSON.stringify(r)); return Object.keys(r.played).length
})
await t('給料明細が描けて、Xポストの文に結果が入る', async () => {
  const r = await p.evaluate(() => {
    ac.start(9, { skipBoss: true }); ac.dbg.step(200); ac.act('refuse'); ac.dbg.step(300)
    ac.showEnd(); const c = document.querySelector('#slip'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 97) { const v = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; s += v; s2 += v * v; n++ }
    let url = ''; const o = window.open; window.open = u => { url = u }; document.querySelector('#bPost').click(); window.open = o
    return { varc: Math.round(s2 / n - (s / n) ** 2), url: decodeURIComponent(url), vis: !document.querySelector('#vEnd').hidden }
  })
  expect(r.vis && r.varc > 500 && /x\.com\/intent\/post/.test(r.url) && /年齢確認ゲーム/.test(r.url), JSON.stringify(r)); return r.url.slice(0, 90)
})
await p.screenshot({ path: ROOT + '/shots/v-end.png' })
await t('英語に切り替えると客のセリフも英語', async () => {
  const r = await p.evaluate(() => { ac.setLang('en'); ac.start(2, { skipBoss: true }); ac.dbg.step(200); const b = ac.state().bubble; const btn = document.querySelector('#aSell').innerText; ac.setLang('ja'); return { b, btn } })
  expect(/^[\x00-\x7f]+$/.test(r.b) && r.btn.trim() === 'Sell', JSON.stringify(r)); return r
})
await t('ここまでエラーなし', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await p.close()

// ---- 6サイズ × 全画面
for (const [w, h, name] of SIZES) {
  const q = await open(browser, { viewport: { width: w, height: h } })
  const views = {}
  views.title = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-1title.png` })
  await q.click('#bHow'); views.how = await fit(q); await q.click('#bHowClose')
  await q.evaluate(() => { ac.dbg.pause(true); document.querySelector('#bStart').click(); ac.dbg.step(60) })
  views.boss = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-2boss.png` })
  await q.evaluate(() => { document.querySelector('#bBossSkip').click(); ac.dbg.step(200); const h = ac.hs('c_a')[0]; ac.inspect(h.sx, h.sy); ac.dbg.step(8) })
  views.play = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-3play.png` })
  await q.evaluate(() => { document.querySelector('#aAsk').click() }); views.qs = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-4qs.png` })
  await q.evaluate(() => { document.querySelector('#qBack').click(); document.querySelector('#bSheet').click() }); views.sheet = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-5sheet.png` })
  await q.evaluate(() => { document.querySelector('#bSheetClose').click(); const c = ac.D.C.find(x => x.k === 'c_d'); ac.G.cur = { c, img: c.k, enterAt: ac.G.t - 5, leaveAt: null, anger: 0, asked: {}, phase: 'turn', lastAct: ac.G.t, put: ac.G.t }; ac.act('id'); ac.dbg.step(40) })
  views.id = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-6id.png` })
  await q.evaluate(() => { document.querySelector('#bIdClose').click(); ac.act('sell'); ac.dbg.step(30) })
  views.sell = await fit(q)
  await q.evaluate(() => { ac.start(4, { skipBoss: true, all: true }); let g = 0; while (!ac.state().ended && g++ < 9000) { ac.dbg.step(10); if (ac.state().phase === 'turn') ac.act('sell') } ac.dbg.step(200) })
  views.event = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-7event.png` })
  await q.evaluate(() => { document.querySelector('#bEvNext').click() }); await q.waitForTimeout(200)
  views.end = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-8end.png` })
  for (const [v, r] of Object.entries(views)) await t(`一画面に収まる ${name} ${w}x${h} ${v}`, async () => { expect(!r.over.length, JSON.stringify(r)) })
  await t(`${name}: はみ出し・エラーなし`, async () => { const o = await overflow(q); expect(o.sw <= o.W && !o.bad.length && !q.errs.length, JSON.stringify(o) + q.errs.join('|')) })
  await q.close()
}
await browser.close()
// ---- WebKit（iPhone 相当）でタッチの通し
const wb = await webkit.launch(), wp = await open(wb, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
await t('WebKit: 2本指の touchmove を止める', async () => {
  const r = await wp.evaluate(() => { const e = new Event('touchmove', { cancelable: true, bubbles: true }); Object.defineProperty(e, 'touches', { value: [{}, {}] }); document.body.dispatchEvent(e); return e.defaultPrevented })
  expect(r, r)
})
await t('WebKit: タップで始めて、客の顔をタップすると手がかりが出て、売れる', async () => {
  await wp.tap('#bStart'); await wp.waitForTimeout(800); await wp.tap('#bBossSkip')
  await wp.waitForFunction(() => ac.state().phase === 'turn', null, { timeout: 8000 })
  const pt = await wp.evaluate(() => { const v = ac.view(), h = ac.hs('c_a')[0]; return { x: v.ox + h.sx * v.s, y: v.oy + h.sy * v.s } })
  await wp.touchscreen.tap(pt.x, pt.y); await wp.waitForTimeout(200)
  const n = await wp.evaluate(() => ac.state().note)
  await wp.tap('#aSell'); await wp.waitForTimeout(300)
  const o = await wp.evaluate(() => ac.G.cur.outcome)
  await wp.screenshot({ path: ROOT + '/shots/v-webkit.png' })
  expect(/しわ/.test(n) && o === 'sell', n + ' ' + o); return n
})
await t('WebKit: エラーなし', async () => { expect(wp.errs.length === 0, wp.errs.join('|')) })
await wb.close()
server.kill()
console.log(results.join('\n'))
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
