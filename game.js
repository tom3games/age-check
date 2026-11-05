// 年齢確認 v2 — 本体。売上ノルマ・行列・止まらない時間・偽物の身分証。描画は Canvas 2D、時間は固定60Hz（performance.now で数える）
import { drawPayslip, totals } from './payslip.js?v=3'
import { drawCard } from './card.js?v=4'
const D = window.AC
const $ = s => document.querySelector(s)
const store = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch (e) {} } }
let lang = store.get('ac_lang') || ((navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en')
const L = () => D.UI[lang]
const tx = o => (o ? (o[lang] ?? o.ja) : '')
const isTouch = () => matchMedia('(pointer:coarse)').matches
const QS = ['birth', 'eto', 'name', 'trend', 'job']

// ---------- 画像
const V = '?v=4'
const IMG = {}
const NAMES = ['bg', 'c_m', 'c_m_x', ...D.C.map(c => c.k), ...D.C.filter(c => c.angry).map(c => c.angry), ...Object.values(D.ITEMS).map(i => i.img)]
function loadAll() {
  return Promise.all([...new Set(NAMES)].map(n => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[n] = im; res() }; im.onerror = () => { console.error('img ' + n); res() }; im.src = 'img/' + n + '.webp' + V
  })))
}
const TINT = {}, DARK = {}
function tinted(n) {
  if (TINT[n]) return TINT[n]
  const im = IMG[n]; if (!im) return null
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height
  const x = c.getContext('2d'); x.drawImage(im, 0, 0)
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(18,40,32,0.2)'; x.fillRect(0, 0, c.width, c.height)
  return (TINT[n] = c)
}
// 行列の客: 奥にいるので暗く小さく
function darkened(n) {
  if (DARK[n]) return DARK[n]
  const im = IMG[n]; if (!im) return null
  const c = document.createElement('canvas'); c.width = im.width / 3; c.height = im.height / 3
  const x = c.getContext('2d'); x.drawImage(im, 0, 0, c.width, c.height)
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(6,12,10,0.7)'; x.fillRect(0, 0, c.width, c.height)
  // 腰から下は闇に溶かす
  x.globalCompositeOperation = 'destination-out'; const g = x.createLinearGradient(0, c.height * 0.42, 0, c.height * 0.72); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height)
  return (DARK[n] = c)
}
let BGBLUR = null
function bgBlur() {
  if (BGBLUR || !IMG.bg) return BGBLUR
  const c = document.createElement('canvas'); c.width = 96; c.height = 64
  const x = c.getContext('2d'); x.drawImage(IMG.bg, 0, 0, 96, 64); x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 0, 96, 64)
  return (BGBLUR = c)
}

// ---------- 場面の座標（背景 1536x1024）
const SW = 1536, SH = 1024, CY = 752, CS = 0.70, IW = 896, IH = 1344, CTOP = 752 - 1110 * CS, K = IW / 1024
const CX0 = 768 - IW * CS / 2
const FACEFIX = { c_h: [506, 420], c_i: [540, 380], y_kappa: [511, 400], y_rokuro: [522, 400], y_kappakid: [506, 480], n_eighteen: [504, 470], c_l: [537, 440], n_santa: [500, 470], n_future: [516, 540], n_trip: [512, 430], y_tanuki: [468, 400] }
const faceOf = k => FACEFIX[k] || (D.C.find(c => c.k === k).hs[0] || [512, 420])
// 時間: 0:00〜5:00 を SHIFT 秒で
const SHIFT = 330, PATIENCE = 60, IDLE = 22

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// ---------- 状態
const G = { mode: 'title', t: 0, el: 0, tasks: [], night: [], queue: [], cur: null, complaints: 0, sales: 0, quota: 0, ended: null, light: 1, flash: 0, mag: null, snap: null, bossI: 0, seed: 1, ghostDark: 0, log: [] }
const later = (d, fn) => G.tasks.push({ at: G.t + d, fn })
const modalOpen = () => !$('#mId').hidden || !$('#mSheet').hidden || !$('#mHow').hidden
const minuteNow = () => Math.min(300, G.el / SHIFT * 300)
function clockText(min) { const h = Math.floor(min / 60), m = Math.floor(min % 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') }
const priceOf = c => D.ITEMS[c.item].p * c.n
// その夜の役（くじ）で上書きされる値。i は {c, v}（行列の客）でも cur でもよい
const rv = (i, f) => (i.v && i.v[f] !== undefined ? i.v[f] : i.c[f])
const isMinor = i => !!rv(i, 'minor')

// 1晩の客と身分証の出方と来る時刻を決める（同じ種なら同じ夜）
function buildNight(seed, all) {
  const r = rng(seed), pick = a => a[(r() * a.length) | 0]
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]] } return a }
  const A = D.C.find(c => c.k === 'c_a'), ghost = D.C.find(c => c.k === 'c_i')
  const yokai = D.C.filter(c => ['y_kappa', 'y_rokuro', 'y_zashiki'].includes(c.k))
  const humans = shuffle(D.C.filter(c => !c.yokai && !['c_a', 'c_i'].includes(c.k)))
  const chosen = shuffle(all ? [...yokai, ...humans] : [...yokai, ...humans.slice(0, 12)])
  const insts = chosen.map(c => ({ c, v: pick(c.ids) }))
  // 必ず入れる難しさ: 大人の日付の偽物・借り物を持った未成年が2人以上、身分証の無い大人が（じいさん以外に）1人以上
  const fakeOK = i => i.c.ids.some(v => v.fake && v.y && v.y <= 2006 && (v.minor ?? i.c.minor))
  let fakes = insts.filter(i => i.v.fake && i.v.y <= 2006 && isMinor(i))
  for (const i of insts) { if (fakes.length >= 2) break; if (fakeOK(i) && !fakes.includes(i)) { i.v = i.c.ids.find(v => v.fake && v.y <= 2006 && (v.minor ?? i.c.minor)); fakes.push(i) } }
  let noid = insts.filter(i => !isMinor(i) && i.v.none && !i.c.yokai)
  for (const i of insts) { if (noid.length >= 1) break; if (!i.c.yokai && i.c.ids.some(v => v.none && !(v.minor ?? i.c.minor))) { i.v = i.c.ids.find(v => v.none && !(v.minor ?? i.c.minor)); noid.push(i) } }
  const list = [{ c: A, v: A.ids[0] }, ...insts]
  // 来る時刻: 終電後（0:50ごろ）と2時半ごろに行列ができる
  // 4人の波を2回（終電後・2時半ごろ）。波の中は1.5〜3秒おき、残りの時間を他の間隔に配る
  const n = list.length, span = SHIFT - 45, WAVE = new Set([4, 5, 6, 11, 12, 13])
  const gaps = [], w = []
  for (let i = 1; i < n; i++) { if (WAVE.has(i)) gaps.push(1.5 + r() * 1.5); else { gaps.push(null); w.push(0.6 + r()) } }
  const small = gaps.filter(g => g != null).reduce((a, g) => a + g, 0), ws = w.reduce((a, b) => a + b, 0)
  let wi = 0; const times = [3]
  for (let i = 1; i < n; i++) times.push(Math.round((times[i - 1] + (gaps[i - 1] ?? w[wi++] / ws * (span - small))) * 10) / 10)
  // 幽霊は丑三つ時（2:00〜2:30）にひとりで来る
  const gt = SHIFT * (2.15 / 5)
  const out = list.map((x, i) => ({ ...x, at: times[i] }))
  out.push({ c: ghost, v: ghost.ids[0], at: gt })
  out.sort((a, b) => a.at - b.at)
  for (const o of out) { o.state = 'out'; o.waited = 0; o.result = null }
  return out
}

// ---------- 画面切替
function show(v) { for (const id of ['vTitle', 'vPlay', 'vEnd']) $('#' + id).hidden = id !== v; $('#bSheet').hidden = v !== 'vPlay'; layoutDom() }

function startShift(seed, opts = {}) {
  Snd.init()
  G.seed = seed ?? ((Math.random() * 1e9) | 0)
  G.night = buildNight(G.seed, opts.all); G.queue = []; G.complaints = 0; G.sales = 0; G.ended = null; G.tasks = []; G.snap = null; G.mag = null; G.log = []; G.el = 0; G.running = false; G.tut = 0
  G.quota = Math.round(G.night.filter(i => !isMinor(i)).reduce((a, i) => a + priceOf(i.c), 0) * 0.7 / 100) * 100
  closeCard(); $('#mCheck').hidden = true; $('#event').hidden = true
  updateHud(); show('vPlay'); hideBubble(); hideNote(); setPos(null)
  G.mode = 'boss'; G.cur = { boss: true, img: 'c_m', enterAt: G.t, leaveAt: null, anger: 0, asked: {}, c: { k: 'c_m', pat: 9 } }
  Snd.setTrack('night'); Snd.sfx('chime')
  setButtons(false)
  if (opts.skipBoss) { endBoss(true); return }
  G.bossI = 0; later(0.6, () => { if (G.mode !== 'boss') return; $('#boss').hidden = false; bossLine() })
}
function bossLine() { $('#bossNm').textContent = L().boss; $('#bossLine').textContent = tx(D.BOSS[G.bossI]) + (G.bossI === 0 ? `  ¥${G.quota.toLocaleString()}` : ''); Snd.sfx('boss') }
function bossNext() { G.bossI++; if (G.bossI >= D.BOSS.length) endBoss(); else bossLine() }
function endBoss(instant) {
  $('#boss').hidden = true
  if (G.cur && G.cur.boss) G.cur.leaveAt = G.t
  G.mode = 'play'
  later(instant ? 0 : 0.9, () => { G.cur = null; G.running = true; if (store.get('ac_tut2') !== '1') G.tut = 1 })
}

// 行列の先頭をレジへ
function callNext() {
  const inst = G.queue.shift(); if (!inst) return
  inst.state = 'counter'
  const c = inst.c, v = inst.v
  G.cur = { inst, c, v, img: c.k, enterAt: G.t, leaveAt: null, anger: 0, asked: {}, idAsked: false, phase: 'enter', angry: false, neck: 0, lastAct: G.t, put: null, busyUntil: 0 }
  hideBubble(); hideNote(); setPos(null); setButtons(false); showQs(false)
  Snd.sfx('chime')
  if (c.ghost) { Snd.sfx('whisper') }
  const cur = G.cur
  later(0.7, () => { if (G.cur !== cur) return; cur.put = G.t; Snd.sfx('put'); later(0.25, () => Snd.sfx('beep')); setPos(c) })
  later(1.2, () => {
    if (G.cur !== cur) return
    $('#posTag').textContent = L().posYes; Snd.sfx('yes')
    say(tx(rv(cur, 'hello')), c.ghost ? 'ghost' : '')
    cur.phase = 'turn'; cur.lastAct = G.t; setButtons(true)
    if (G.tut === 1) { if (G.night.filter(i => i.result).length >= 2) G.tut = 0; else note(L().tut.look(isTouch()), 'tut') }
  })
}
const ans = (cur, q) => (cur.v.a && cur.v.a[q]) || cur.c.a[q]

// ---------- 行動
function act(a, arg) {
  const cur = G.cur; if (G.mode !== 'play' || !cur || cur.boss || cur.phase !== 'turn' || G.t < cur.busyUntil) return false
  cur.lastAct = G.t
  const c = cur.c
  if (a === 'ask') {
    if (cur.asked[arg]) return false
    cur.asked[arg] = 1; Snd.sfx('ask'); markQs(); G.log.push(c.k + ':ask:' + arg)
    cur.busyUntil = G.t + 1.1; setButtons(false); later(1.15, () => { if (G.cur === cur && cur.phase === 'turn') setButtons(true) })
    if (addAnger(1)) return true
    say(tx(ans(cur, arg)), c.ghost ? 'ghost' : ''); tutStep(2)
    return true
  }
  if (a === 'id') {
    if (cur.idAsked) { if (!cur.v.none && G.t >= cur.busyUntil) openCard(cur); return true }
    cur.idAsked = true; G.log.push(c.k + ':id'); tutStep(2)
    if (addAnger(c.idCost)) return true
    // 財布から出すのに時間がかかる
    cur.busyUntil = G.t + 2.4; setButtons(false); Snd.sfx('fumble'); note(L().fumble)
    later(2.4, () => {
      if (G.cur !== cur || cur.phase !== 'turn') return
      setButtons(true)
      if (!cur.v.none) { say(tx(rv(cur, 'idLine')), c.ghost ? 'ghost' : ''); openCard(cur) }
      else { say(tx(rv(cur, 'noId')), c.ghost ? 'ghost' : ''); note(L().noIdNote) }
    })
    return true
  }
  if (a === 'sell' || a === 'refuse') { finish(a); return true }
  return false
}
function tutStep(n) {
  if (!G.tut) return
  if (n === 2 && G.tut < 3) { G.tut = 3; later(1.2, () => note(L().tut.decide, 'tut')); store.set('ac_tut2', '1') }
}
function addAnger(n) {
  const cur = G.cur; cur.anger += n; drawAnger()
  if (cur.c.neck) Snd.sfx('creak')
  if (cur.anger > cur.c.pat) { rage(); return true }
  return false
}
function record(cur, res) {
  const m = isMinor(cur), ok = res === 'sell' ? !m : m
  cur.inst.result = res; cur.inst.ok = ok; cur.inst.state = 'done'
}
function rage() {
  const cur = G.cur, c = cur.c
  cur.phase = 'leave'; cur.angry = true; cur.shake = G.t; G.flash = 1; setButtons(false); showQs(false); closeCard()
  Snd.sfx('slam'); Snd.sfx('shout')
  say(tx(c.rage), 'rage'); record(cur, 'rage'); G.log.push(c.k + ':rage')
  later(0.15, () => snapshot())
  if (!isMinor(cur)) complaint()
  later(2.2, leave)
}
function finish(a) {
  const cur = G.cur, c = cur.c
  cur.phase = 'leave'; setButtons(false); showQs(false); closeCard(); record(cur, a); G.log.push(c.k + ':' + a)
  if (a === 'sell') {
    Snd.sfx('cash'); say(tx(c.sell), c.ghost ? 'ghost' : '')
    G.sales += priceOf(c); updateHud()
    if (isMinor(cur) && rv(cur, 'detect')) { snapshot(); const dt = rv(cur, 'detect'); later(1.6, () => { G.pendingDetect = { k: c.k, detect: dt } }); later(1.6, leave); return }
    later(1.6, leave)
  } else {
    Snd.sfx('refuse'); say(tx(rv(cur, 'refuse')), c.ghost ? 'ghost' : (isMinor(cur) ? '' : 'rage'))
    if (!isMinor(cur)) {
      complaint(); cur.shake = G.t
      if (c.ghost) { G.ghostDark = G.t; Snd.sfx('whisper'); Snd.sfx('flick') }
      if (c.k === 'y_kappa') Snd.sfx('splash')
      if (c.neck) { cur.neckBoost = 1; Snd.sfx('creak') }
      if (c.angry) cur.angry = true
      snapshot()
    }
    later(1.8, leave)
  }
}
function complaint() { G.complaints++; updateHud(); Snd.sfx('complaint') }
function leave() {
  const cur = G.cur; if (!cur || cur.leaveAt) return
  cur.leaveAt = G.t; Snd.sfx('door')
  later(0.35, hideBubble)
  if (cur.c && cur.c.ghost) later(0.4, () => note(tx(D.EV.camEmpty)))
  later(0.9, () => {
    if (G.cur === cur) { G.cur = null; setPos(null) }
    if (G.pendingDetect) { const c = G.pendingDetect; G.pendingDetect = null; return detected(c) }
    if (G.complaints >= 3) return fired()
  })
}

// ---------- 終わり方
function eventShow(text, stamp, sfx) {
  G.mode = 'event'; G.running = false; setButtons(false); hideBubble(); hideNote(); closeCard()
  $('#evText').textContent = text; const st = $('#evStamp'); st.textContent = stamp || ''; st.hidden = !stamp; st.classList.remove('in')
  $('#bEvNext').hidden = true; $('#bEvCheck').hidden = true
  $('#event').hidden = false
  if (sfx) Snd.sfx(sfx)
  later(1.4, () => { if (stamp) { st.classList.add('in'); Snd.sfx('stamp') } })
  later(2.0, () => { $('#bEvNext').hidden = false; $('#bEvCheck').hidden = false })
}
const bossAngry = () => { G.cur = { boss: true, img: 'c_m_x', enterAt: G.t, leaveAt: null, anger: 0, asked: {}, c: { k: 'c_m' }, angry: true } }
function detected(c) { G.ended = 'stop'; Snd.setTrack('bad'); bossAngry(); eventShow(tx(c.detect), L().endStop, c.k === 'c_f' ? 'phone' : 'siren') }
function fired() { G.ended = 'fired'; Snd.setTrack('bad'); bossAngry(); eventShow(tx(D.EV.fired), L().endFired, 'phone') }
function dawn() {
  for (const i of G.queue) { i.state = 'done'; i.result = 'left'; i.ok = isMinor(i) }
  G.queue = []
  $('#clk').textContent = '05:00'
  if (G.sales >= G.quota) { G.ended = 'dawn'; Snd.setTrack('dawn'); G.cur = null; eventShow(tx(D.EV.dawnOk), '', null) }
  else { G.ended = 'quota'; Snd.setTrack('bad'); bossAngry(); eventShow(tx(D.EV.quota) + `  ¥${G.sales.toLocaleString()} / ¥${G.quota.toLocaleString()}`, L().endQuota, 'phone') }
}
function result() {
  const ja = lang === 'ja', hours = G.ended === 'dawn' || G.ended === 'quota' ? 5 : Math.max(0.5, Math.round(minuteNow() / 30) / 2)
  const seen = G.night.filter(i => i.result), right = seen.filter(i => i.ok).length
  const minorsRefused = seen.filter(i => isMinor(i) && i.result !== 'sell').length
  const pay = [], ded = []
  pay.push({ label: ja ? '売上歩合' : 'Sales commission', note: `¥${G.sales.toLocaleString()} × 5%`, yen: Math.round(G.sales * 0.05) })
  if (minorsRefused) pay.push({ label: ja ? '見抜き手当' : 'Sharp-eye bonus', note: ja ? `未成年 ${minorsRefused}人` : `${minorsRefused} minors`, yen: 300 * minorsRefused })
  if (G.complaints) ded.push({ label: ja ? 'クレーム' : 'Complaints', note: ja ? `${G.complaints}件` : `${G.complaints}`, yen: 1500 * G.complaints })
  if (G.ended === 'stop') ded.push({ label: ja ? '罰金' : 'Fine', note: ja ? '50万円以下' : 'up to ¥500,000', yen: 500000 })
  const sneaky = seen.some(i => isMinor(i) && i.result === 'sell')
  let stamp, comment
  if (G.ended === 'stop') { stamp = ja ? '営業\n停止' : 'SHUT\nDOWN'; comment = tx(D.BOSSC.stop) }
  else if (G.ended === 'fired') { stamp = ja ? 'クビ' : 'FIRED'; comment = tx(D.BOSSC.fired) }
  else if (G.ended === 'quota') { stamp = ja ? '未達' : 'SHORT'; comment = tx(D.BOSSC.quota) }
  else if (sneaky) { stamp = ja ? '要注意' : 'WATCH'; comment = tx(D.BOSSC.sneaky) }
  else if (right === seen.length && G.complaints === 0) { stamp = ja ? '本採用' : 'HIRED'; comment = tx(D.BOSSC.perfect) }
  else { stamp = ja ? '合格' : 'PASS'; comment = tx(D.BOSSC.ok) }
  return { lang, no: seen.length, job: L().job, date: '2026.11.01', wage: 1375, hours, pay, ded, boss: L().boss, comment, stamp, photo: G.snap, footer: 'tom3games.github.io/age-check', series: L().series, name: L().name, right, total: seen.length }
}
function showEnd() {
  $('#event').hidden = true; $('#mCheck').hidden = true; G.mode = 'end'; G.running = false
  const d = result(); G.result = d; G.total = totals(d)
  drawPayslip($('#slip'), d, { main: '#1d6b4a', dark: '#0b2a1e', accent: '#e8423a', bg: '#0b1112' })
  show('vEnd')
}
// 答え合わせ: 来た客を全員並べる。押すと決め手が出る
// 背景画像の一点 u(0〜1) を丸の真ん中に置く background-position の %（画像 W px・枠 c px）
const bp = (u, W, c) => Math.max(0, Math.min(100, (u * W - c / 2) / (W - c) * 100)).toFixed(1)
function showCheck() {
  const u = L(), seen = G.night.filter(i => i.result)
  $('#ckTitle').textContent = lang === 'ja' ? `答え合わせ　${seen.filter(i => i.ok).length} / ${seen.length}` : `Answers  ${seen.filter(i => i.ok).length} / ${seen.length}`
  const g = $('#ckGrid'); g.innerHTML = ''
  for (const i of seen) {
    const f = faceOf(i.c.k), b = document.createElement('button'); b.className = 'ck ' + (i.ok ? 'ok' : 'ng')
    b.innerHTML = `<i style="background-image:url(img/${i.c.k}.webp${V});background-size:340%;background-position:${bp(f[0] / 1024, 136, 40)}% ${bp((f[1] - 70) / 1536, 204, 40)}%"></i><b>${rv(i, 'age')}</b><span>${u.you[i.result]}</span><em>${i.ok ? '○' : '×'}</em>`
    b.addEventListener('click', () => { $('#ckWhy').textContent = `${u.real(rv(i, 'age'))}：${tx(i.v.why)}`; g.querySelectorAll('.ck').forEach(e => e.classList.remove('sel')); b.classList.add('sel') })
    g.appendChild(b)
  }
  $('#ckWhy').textContent = lang === 'ja' ? '顔を押すと、見抜く決め手が出る' : 'Tap a face to see the giveaway'
  $('#mCheck').hidden = false
}

// ---------- 吹き出し・メモ・POS・ボタン
function say(s, cls = '') { const b = $('#bubble'); b.textContent = s; b.className = cls; b.hidden = false; layoutDom() }
function hideBubble() { $('#bubble').hidden = true }
function note(s, cls = '') { const n = $('#note'); n.textContent = s; n.className = cls; n.hidden = false; G.noteAt = G.t; layoutDom() }
function hideNote() { $('#note').hidden = true }
function setPos(c) {
  if (!c) { $('#posNm').textContent = '---'; $('#posTag').hidden = true; $('#anger').innerHTML = ''; return }
  const it = D.ITEMS[c.item]
  $('#posNm').textContent = `${tx(it.n)} ×${c.n}  ¥${priceOf(c).toLocaleString()}`
  $('#posTag').hidden = false; $('#posTag').textContent = L().posAsk
  drawAnger()
}
function drawAnger() {
  const cur = G.cur; if (!cur || !cur.c || cur.boss) { $('#anger').innerHTML = ''; return }
  const n = Math.min(cur.c.pat, 6), on = Math.min(cur.anger, n)
  let h = lang === 'ja' ? '怒' : '!'
  for (let i = 0; i < n; i++) h += `<i class="${i < on ? 'on' : ''}"></i>`
  $('#anger').innerHTML = h
}
function setButtons(on) { for (const id of ['aAsk', 'aId', 'aRef', 'aSell']) $('#' + id).disabled = !on; if (!$('#qs').hidden) markQs(on) }
function showQs(on) { $('#qs').hidden = !on; $('#acts').hidden = on; if (on) markQs(); layoutDom() }
function markQs(on = true) { $('#qs').querySelectorAll('[data-q]').forEach(b => { b.disabled = !on || !!(G.cur && G.cur.asked && G.cur.asked[b.dataset.q]) || !(G.cur && G.cur.phase === 'turn') }); $('#qBack').disabled = false }
function updateHud() {
  document.querySelectorAll('.comp i').forEach((e, i) => e.classList.toggle('on', i < G.complaints))
  $('#salesNum').textContent = `¥${G.sales.toLocaleString()} / ¥${G.quota.toLocaleString()}`
  $('#salesBar').style.width = Math.min(100, G.quota ? G.sales / G.quota * 100 : 0) + '%'
  $('#salesBar').classList.toggle('done', G.sales >= G.quota && G.quota > 0)
}

// ---------- 身分証
function openCard(cur) { drawCard($('#idc'), cur.v, { lang, im: IMG[cur.v.photo || cur.c.k], face: faceOf(cur.v.photo || cur.c.k), tx }); $('#mId').hidden = false; Snd.sfx('card') }
function closeCard() { $('#mId').hidden = true }

// ---------- 早見表・遊び方
function buildSheet() {
  const u = L(), names = u.etoNames
  let eto = ''; for (let i = 0; i < 12; i++) eto += `<div><b>${names[i]}</b>${D.ETO_BASE + i}</div>`
  const tr = u.sheetBody.trends.map(([a, b]) => `<div><b>${a}</b>${b}</div>`).join('')
  $('#sheet').innerHTML = `<h3>${lang === 'ja' ? '年齢確認 早見表' : 'Age check cheat sheet'}</h3><div class="big">${u.sheetBody.line}</div><div class="era">${u.sheetBody.era}</div><div class="sub">${u.sheetBody.eto}</div><div class="eto">${eto}</div><div class="sub">${u.sheetBody.trend}</div><div class="trend">${tr}</div>`
}
function buildHow() { const u = L(); $('#howp').innerHTML = `<h2>${u.howto}</h2>` + u.howtoBody.map((s, i) => `<p data-n="${i + 1}">${s}</p>`).join('') }

function applyLang() {
  const u = L(); document.documentElement.lang = lang
  $('#tTitle').innerHTML = lang === 'ja' ? '年齢<span>確認</span>' : 'AGE <span>CHECK</span>'
  $('#tSub').textContent = u.sub; $('#bStart').textContent = u.start; $('#bHow').textContent = u.howto
  $('#bLang').textContent = lang === 'ja' ? 'EN' : 'JA'
  $('#tSheet').textContent = u.sheet; $('#tComp').textContent = u.complaints; $('#date').textContent = u.date; $('#tSales').textContent = u.sales
  $('#aAsk span').textContent = u.ask; $('#aId span').textContent = u.id; $('#aRef span').textContent = u.refuse; $('#aSell span').textContent = u.sell
  $('#qs').querySelectorAll('[data-q]').forEach(b => { b.textContent = u.q[b.dataset.q] }); $('#qBack').textContent = u.back
  for (const id of ['#bIdClose', '#bSheetClose', '#bHowClose', '#bCkClose']) $(id).textContent = u.close
  $('#bBossSkip').textContent = u.skip; $('#bBossNext').textContent = u.next; $('#bossNm').textContent = u.boss
  $('#bSave span').textContent = u.save; $('#bPost span').textContent = u.post; $('#bAgain').textContent = u.again; $('#bTitle').textContent = u.toTitle
  $('#bCheck span').textContent = u.check; $('#bEvCheck').textContent = u.check; $('#bEvNext').textContent = u.toSlip
  buildSheet(); buildHow(); updateHud()
  if (G.mode === 'boss' && !$('#boss').hidden) bossLine()
  if (G.cur && G.cur.c && !G.cur.boss && G.cur.put) setPos(G.cur.c)
  if (G.mode === 'end') showEnd()
}

// ---------- 描画
const cv = $('#cv'), cx = cv.getContext('2d')
let VW = 0, VH = 0, DPR = 1, AREA = { x: 0, y: 0, w: 1, h: 1 }, VIEW = { s: 1, ox: 0, oy: 0 }
function resize() { DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight; cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR); layoutDom() }
function computeView() {
  let a = { x: 0, y: 0, w: VW, h: VH }
  if (!$('#vPlay').hidden) { const p = $('#panel').getBoundingClientRect(); a = VW >= VH ? { x: 0, y: 0, w: p.left, h: VH } : { x: 0, y: 0, w: VW, h: p.top } }
  AREA = a
  let s = Math.min(a.w / 740, a.h / 860)
  if ($('#vPlay').hidden) s = Math.max(VW / SW, VH / SH)
  let ox = a.x + a.w / 2 - 768 * s, oy = a.y + a.h / 2 - 450 * s
  if (SW * s >= a.w) ox = Math.min(a.x, Math.max(a.x + a.w - SW * s, ox))
  if (SH * s >= a.h) oy = Math.min(a.y, Math.max(a.y + a.h - SH * s, oy))
  if ($('#vPlay').hidden && VW < VH) ox = (VW - SW * s) / 2
  VIEW = { s, ox, oy }
}
function layoutDom() {
  if (!VW) return
  computeView()
  const { s, ox, oy } = VIEW, b = $('#bubble'), n = $('#note')
  const mon = $('#mon'); mon.style.visibility = 'visible'
  if (VW >= VH && !$('#vPlay').hidden) { const top = $('#panel .pos').getBoundingClientRect().top; if (mon.getBoundingClientRect().bottom > top - 6) mon.style.visibility = 'hidden' }
  const side = AREA.w / s > 1150
  let noteTop = AREA.y + AREA.h
  if (!n.hidden) { n.style.left = (AREA.x + AREA.w / 2) + 'px'; n.style.top = 'auto'; n.style.bottom = (VH - (AREA.y + AREA.h) + 8) + 'px'; noteTop = AREA.y + AREA.h - 8 - n.offsetHeight }
  if (!b.hidden) {
    b.classList.toggle('side', side); b.classList.toggle('up', !side)
    const bw = b.offsetWidth, bh = b.offsetHeight
    if (side) { b.style.left = Math.min(AREA.x + AREA.w - bw / 2 - 10, ox + 1110 * s + bw / 2) + 'px'; b.style.top = Math.max(AREA.y + 8, oy + 170 * s) + 'px' }
    else { b.style.left = (AREA.x + AREA.w / 2) + 'px'; b.style.top = Math.max(AREA.y + 8, Math.min(oy + (CY + 18) * s, noteTop - bh - 8)) + 'px' }
  }
}
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t)
function custState(cur) {
  if (!cur) return null
  const tin = ease((G.t - cur.enterAt) / 0.7), tout = cur.leaveAt != null ? ease((G.t - cur.leaveAt) / 0.6) : 0
  const a = tin * (1 - tout); if (a <= 0.001) return null
  let dx = 0, dy = (1 - tin) * 30 + tout * 20 + Math.sin(G.t * 1.7) * 2.5
  if (cur.shake != null && G.t - cur.shake < 0.7) { const k = 1 - (G.t - cur.shake) / 0.7; dx += Math.sin(G.t * 90) * 14 * k; dy += Math.cos(G.t * 77) * 6 * k }
  const img = cur.angry && cur.c && cur.c.angry ? cur.c.angry : (cur.img || cur.c.k)
  return { a, dx, dy, img }
}
// 行列の立ち位置（奥のドアの前）
const QPOS = [[540, 250], [990, 262], [770, 232], [1150, 250], [380, 245]]
function drawScene(x, s, ox, oy, o = {}) {
  const bg = IMG.bg
  x.save(); x.translate(ox, oy); x.scale(s, s)
  if (bg) x.drawImage(bg, 0, 0)
  // 行列
  const qs = 0.27
  G.queue.slice(0, 5).forEach((inst, i) => {
    if (o.monitor && inst.c.ghost) return
    const im = darkened(inst.c.k); if (!im) return
    const [qx, qy] = QPOS[i], w = IW * qs * (1 - i * 0.04), h = IH * qs * (1 - i * 0.04), sway = Math.sin(G.t * 1.3 + i) * 2
    const fade = Math.min(1, (G.t - (inst.joinT || 0)) / 0.8)
    x.globalAlpha = fade * 0.95; x.drawImage(im, qx - w / 2, qy + sway, w, h); x.globalAlpha = 1
    // 待ちくたびれ: 頭の上に赤い「!」の印（文字ではなく図形）
    if (inst.waited > PATIENCE * 0.6) {
      const k = (inst.waited - PATIENCE * 0.6) / (PATIENCE * 0.4), bx = qx, by = qy + 6 + sway
      x.fillStyle = `rgba(232,66,58,${0.5 + 0.5 * Math.abs(Math.sin(G.t * (4 + k * 8)))})`
      x.beginPath(); x.arc(bx, by, 18, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(bx - 3, by - 11, 6, 13); x.fillRect(bx - 3, by + 5, 6, 6)
    }
  })
  const cur = G.cur, st = custState(cur)
  if (st && !(o.monitor && cur.c && cur.c.ghost)) {
    const im = o.monitor ? IMG[st.img] : tinted(st.img)
    if (im) {
      x.globalAlpha = st.a
      const ghostFlick = cur.c && cur.c.ghost && Math.sin(G.t * 31) > 0.93
      if (!ghostFlick) {
        const X = CX0 + st.dx, Y = CTOP + st.dy
        if (cur.c && cur.c.neck) {
          const e = (cur.neck || 0) / CS, h1 = 430, h2 = 640
          x.drawImage(im, 0, h2, IW, IH - h2, X, Y + h2 * CS, IW * CS, (IH - h2) * CS)
          x.drawImage(im, 0, h1, IW, h2 - h1, X, Y + (h1 - e) * CS, IW * CS, (h2 - h1 + e) * CS)
          x.drawImage(im, 0, 0, IW, h1, X, Y - e * CS, IW * CS, h1 * CS)
        } else x.drawImage(im, X, Y, IW * CS, IH * CS)
      }
      x.globalAlpha = 1
    }
  }
  if (bg) x.drawImage(bg, 0, CY, SW, SH - CY, 0, CY, SW, SH - CY)
  if (cur && cur.put != null && cur.c && D.ITEMS[cur.c.item] && !cur.leaveAt) {
    const it = D.ITEMS[cur.c.item], im = IMG[it.img]
    if (im) {
      const hh = { cup: 130, strong: 175, beer: 150, tabako: 120, sake: 290, highball: 150 }[cur.c.item], ww = im.width * hh / im.height
      const drop = (1 - ease((G.t - cur.put) / 0.25)) * 40
      for (let i = 0; i < Math.min(cur.c.n, 3); i++) {
        const X = 1010 + i * (ww + 10), Y = 868 - hh - drop + i * 4
        x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(X + ww / 2, 868 + i * 4, ww * 0.55, 10, 0, 0, 7); x.fill()
        x.drawImage(im, X, Y, ww, hh)
      }
    }
  }
  const dark = 1 - G.light
  if (dark > 0.01) { x.fillStyle = `rgba(0,0,0,${dark})`; x.fillRect(-10, -10, SW + 20, SH + 20) }
  x.restore()
}
function render() {
  computeView()
  const x = cx, { s, ox, oy } = VIEW
  x.setTransform(DPR, 0, 0, DPR, 0, 0)
  x.fillStyle = '#050707'; x.fillRect(0, 0, VW, VH)
  const bb = bgBlur(); if (bb) { const cs = Math.max(VW / SW, VH / SH) * 1.05; x.drawImage(bb, (VW - SW * cs) / 2, (VH - SH * cs) / 2, SW * cs, SH * cs) }
  drawScene(x, s, ox, oy)
  const m = G.mag
  if (m && G.t - m.t < 2.8) {
    const k = Math.min(1, (G.t - m.t) / 0.12) * Math.min(1, (2.8 - (G.t - m.t)) / 0.3)
    const R = Math.min(AREA.w, AREA.h) * 0.2, Z = 2.4
    let px = ox + m.sx * s, py = oy + m.sy * s - R * 0.4
    px = Math.max(AREA.x + R + 6, Math.min(AREA.x + AREA.w - R - 6, px)); py = Math.max(AREA.y + R + 6, Math.min(AREA.y + AREA.h - R - 6, py))
    x.save(); x.globalAlpha = k; x.beginPath(); x.arc(px, py, R, 0, 7); x.clip(); drawScene(x, s * Z, px - m.sx * s * Z, py - m.sy * s * Z); x.restore()
    x.save(); x.globalAlpha = k; x.strokeStyle = m.hit ? '#f2c94c' : 'rgba(220,240,232,.7)'; x.lineWidth = 3; x.beginPath(); x.arc(px, py, R, 0, 7); x.stroke(); x.restore()
  }
  if (G.flash > 0.01) { x.fillStyle = `rgba(200,20,10,${G.flash * 0.35})`; x.fillRect(0, 0, VW, VH) }
  drawMonitor()
}
const mon = $('#mon'), mx = mon.getContext('2d')
let monFrame = 0
function drawMonitor() {
  if ($('#vPlay').hidden) return
  if (monFrame++ % 3) return
  const W = mon.width, H = mon.height, s = W / 1100
  mx.fillStyle = '#000'; mx.fillRect(0, 0, W, H)
  drawScene(mx, s, W / 2 - 768 * s, H - 900 * s, { monitor: true })
  mx.globalCompositeOperation = 'saturation'; mx.fillStyle = '#888'; mx.fillRect(0, 0, W, H); mx.globalCompositeOperation = 'source-over'
  mx.fillStyle = 'rgba(40,255,140,.06)'; mx.fillRect(0, 0, W, H)
  for (let y = 0; y < H; y += 3) { mx.fillStyle = 'rgba(0,0,0,.25)'; mx.fillRect(0, y, W, 1) }
  mx.fillStyle = 'rgba(255,255,255,.06)'; mx.fillRect(0, (G.t * 60) % H, W, 10)
  mx.fillStyle = '#e8f0ec'; mx.font = '700 20px DotGothic16, monospace'; mx.fillText('CAM1', 10, 26)
  mx.fillText(clockText(minuteNow()) + ':' + String(Math.floor(G.t % 60)).padStart(2, '0'), W - 120, H - 12)
  if (Math.floor(G.t * 2) % 2) { mx.fillStyle = '#e8423a'; mx.beginPath(); mx.arc(W - 20, 20, 7, 0, 7); mx.fill() }
}

// ---------- 見る
function inspect(sx, sy) {
  const cur = G.cur; if (G.mode !== 'play' || !cur || cur.boss || cur.phase !== 'turn') return null
  if (sy > CY + 10) return null
  const ix = (sx - CX0) / CS / K, iy = (sy - CTOP) / CS / K
  if (ix < 0 || ix > 1024 || iy < 0 || iy > 1536) return null
  cur.lastAct = G.t
  let best = null, bd = 1e9
  for (const h of cur.c.hs) { const d = Math.hypot(ix - h[0], iy - h[1]) / h[2]; if (d < 1.15 && d < bd) { bd = d; best = h } }
  G.mag = { sx, sy, t: G.t, hit: !!best }
  Snd.sfx('look'); note(best ? tx(best[3]) : L().nothing)
  if (G.tut === 1) { G.tut = 2; later(1.6, () => { if (G.tut === 2 && G.cur === cur && cur.phase === 'turn') note(L().tut.ask, 'tut') }) }
  return best ? best[3].ja : null
}
cv.addEventListener('pointerdown', e => { if (G.mode !== 'play') return; const { s, ox, oy } = VIEW; inspect((e.clientX - ox) / s, (e.clientY - oy) / s) })

function snapshot() {
  const c = document.createElement('canvas'); c.width = 640; c.height = 640
  const x = c.getContext('2d'), s = 640 / 760
  drawScene(x, s, 320 - 768 * s, 640 - 900 * s); G.snap = c
}

// ---------- ループ（固定60Hz）
let acc = 0, last = performance.now(), paused = false
function step(dt) {
  G.t += dt
  const due = G.tasks.filter(t => t.at <= G.t); G.tasks = G.tasks.filter(t => t.at > G.t); for (const t of due) t.fn()
  if (G.mode === 'play' && G.running) {
    G.el += dt
    // 来店
    if (G.el < SHIFT) for (const i of G.night) if (i.state === 'out' && i.at <= G.el) { i.state = 'wait'; i.joinT = G.t; G.queue.push(i); if (G.cur) Snd.sfx('chime') }
    // 行列の待ち時間（幽霊と妖怪は待てる）
    for (const i of [...G.queue]) {
      i.waited += dt
      if (i.waited > PATIENCE * (i.c.yokai || i.c.ghost ? 2 : 1)) { G.queue.splice(G.queue.indexOf(i), 1); i.state = 'done'; i.result = 'left'; i.ok = isMinor(i); Snd.sfx('leave'); note(tx(D.EV.leftQueue), 'warn') }
    }
    if (!G.cur && G.queue.length) callNext()
    if (G.el >= SHIFT && !G.cur && !G.pendingDetect) { G.running = false; dawn() }
    const m = Math.floor(minuteNow()); if (m !== G.lastMin) { G.lastMin = m; $('#clk').textContent = clockText(m) }
    // 待たせすぎ（レジの客）
    const cur = G.cur
    if (cur && !cur.boss && cur.phase === 'turn' && !modalOpen() && G.t - cur.lastAct > IDLE && G.t >= cur.busyUntil) {
      cur.lastAct = G.t - IDLE + 10
      if (!addAnger(1)) say(tx(D.EV.idle), cur.c.ghost ? 'ghost' : '')
    }
  }
  // 蛍光灯
  const ghost = G.cur && G.cur.c && G.cur.c.ghost && !G.cur.leaveAt
  let target = 1
  if (ghost && Math.sin(G.t * 13.1) * Math.sin(G.t * 3.7) > 0.55) target = 0.45
  if (!ghost && Math.sin(G.t * 0.9) * Math.sin(G.t * 7.3) > 0.97) target = 0.6
  if (G.ghostDark && G.t - G.ghostDark < 1.3) target = 0.06
  G.light += (target - G.light) * 0.35
  G.flash *= 0.92
  const cn = G.cur
  if (cn && cn.c && cn.c.neck) { const want = Math.min(cn.anger, 3) * 40 + (cn.neckBoost ? 170 : 0) + (cn.angry ? 170 : 0); cn.neck = (cn.neck || 0) + (want - (cn.neck || 0)) * 0.08 }
}
function frame() {
  const n = performance.now(); let dt = Math.min(0.25, (n - last) / 1000); last = n
  if (!paused) { acc += dt; while (acc >= 1 / 60) { step(1 / 60); acc -= 1 / 60 } }
  Snd.tick(); render(); requestAnimationFrame(frame)
}

// ---------- 入力
function bind() {
  const on = (id, fn) => $(id).addEventListener('click', e => { Snd.init(); fn(e) })
  on('#bStart', () => { Snd.sfx('tap'); startShift() })
  on('#bHow', () => { $('#mHow').hidden = false })
  on('#bHowClose', () => { $('#mHow').hidden = true })
  on('#bSheet', () => { buildSheet(); $('#mSheet').hidden = false; Snd.sfx('card') })
  on('#bSheetClose', () => { $('#mSheet').hidden = true })
  on('#bIdClose', () => { closeCard(); if (G.cur) G.cur.lastAct = G.t })
  on('#bLang', () => { lang = lang === 'ja' ? 'en' : 'ja'; store.set('ac_lang', lang); applyLang() })
  on('#bMute', () => { Snd.setMute(!Snd.muted); muteIcon() })
  on('#bBossNext', () => bossNext())
  on('#bBossSkip', () => endBoss())
  on('#aAsk', () => { if (G.cur && G.cur.phase === 'turn') showQs(true) })
  on('#qBack', () => showQs(false))
  $('#qs').querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { act('ask', b.dataset.q); if (G.cur && G.cur.phase === 'turn') showQs(false) }))
  on('#aId', () => act('id'))
  on('#aSell', () => act('sell'))
  on('#aRef', () => act('refuse'))
  on('#bEvNext', () => showEnd())
  on('#bEvCheck', () => showCheck())
  on('#bCheck', () => showCheck())
  on('#bCkClose', () => { $('#mCheck').hidden = true })
  on('#bAgain', () => startShift())
  on('#bTitle', () => { G.mode = 'title'; G.cur = null; G.queue = []; show('vTitle'); Snd.setTrack('title') })
  on('#bSave', () => { $('#slip').toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'age-check.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000) }) })
  on('#bPost', () => {
    const r = G.result, st = r ? r.stamp.replace('\n', '') : '', net = G.total ? G.total.net.toLocaleString() : '0'
    const text = lang === 'ja' ? `深夜コンビニの年齢確認バイト、結果は「${st}」。${r.right}/${r.total}人を見抜いて手取り${net}円 ${L().hash}` : `Night-shift age check: "${st}". ${r.right}/${r.total} right, take-home ¥${net} ${L().hash}`
    open('https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent('https://tom3games.github.io/age-check/'), '_blank')
  })
  window.addEventListener('keydown', e => {
    if (G.mode !== 'play' || e.ctrlKey || e.metaKey) return
    const k = e.key.toLowerCase()
    if (k === 'escape') { closeCard(); $('#mSheet').hidden = true; showQs(false) }
    if (modalOpen()) return
    if (k === 's') act('sell'); else if (k === 'r') act('refuse'); else if (k === 'i') act('id'); else if (k === 'q') showQs($('#qs').hidden)
    else if ('12345'.includes(k) && !$('#qs').hidden) { act('ask', QS[+k - 1]); showQs(false) }
  })
  window.addEventListener('resize', resize)
}
function muteIcon() { $('#icoSnd').style.opacity = Snd.muted ? 0.35 : 1; $('#bMute').setAttribute('aria-pressed', Snd.muted ? 'true' : 'false') }

// ---------- 検証用の窓口
window.ac = {
  G, D, Snd, SHIFT, PATIENCE,
  start: (seed, opts) => startShift(seed, opts),
  act, inspect, showEnd, showCheck, isMinor, rv, result: () => G.result, total: () => G.total, buildNight,
  state: () => ({ mode: G.mode, el: G.el, k: G.cur && G.cur.c ? G.cur.c.k : null, minor: G.cur && G.cur.v ? isMinor(G.cur) : null, claim: G.cur && G.cur.v ? rv(G.cur, 'claim') : null, v: G.cur && G.cur.v ? G.cur.v : null, phase: G.cur ? G.cur.phase : null, busy: G.cur ? G.t < G.cur.busyUntil : false, anger: G.cur ? G.cur.anger : 0, complaints: G.complaints, sales: G.sales, quota: G.quota, ended: G.ended, queue: G.queue.map(i => i.c.k), night: G.night.map(i => i.c.k), done: G.night.filter(i => i.result).map(i => ({ k: i.c.k, r: i.result, ok: i.ok })), bubble: $('#bubble').hidden ? null : $('#bubble').textContent, note: $('#note').hidden ? null : $('#note').textContent, card: !$('#mId').hidden, event: !$('#event').hidden }),
  view: () => ({ ...VIEW, area: AREA }),
  drawScene, IMG,
  hs: k => D.C.find(c => c.k === k).hs.map(h => ({ sx: CX0 + h[0] * K * CS, sy: CTOP + h[1] * K * CS, ja: h[3].ja })),
  setCur: (k, extra = {}) => { const c = D.C.find(x => x.k === k); G.tasks = []; G.mode = 'play'; const inst = { c, v: extra.v || c.ids[0], state: 'counter' }; G.cur = { inst, c, v: inst.v, img: c.k, enterAt: G.t - 5, leaveAt: null, anger: 0, asked: {}, phase: 'turn', lastAct: G.t, put: G.t - 5, neck: 0, busyUntil: 0, ...extra }; setPos(c); setButtons(true); return G.cur },
  say, note,
  dbg: { pause: p => { paused = p }, step: n => { for (let i = 0; i < n; i++) step(1 / 60); render() } },
  setLang: l => { lang = l; applyLang() },
}

resize(); applyLang(); muteIcon(); bind()
loadAll().then(() => { requestAnimationFrame(frame); Snd.setTrack('title'); window.__acReady = true })
