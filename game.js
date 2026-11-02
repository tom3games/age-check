// 年齢確認 — 本体。描画は Canvas 2D（写真の客を店内に合成）、時間は固定60Hz（performance.now で数える）
import { drawPayslip, totals } from './payslip.js?v=1'
const D = window.AC
const $ = s => document.querySelector(s)
const store = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch (e) {} } }
let lang = store.get('ac_lang') || ((navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en')
const L = () => D.UI[lang]
const tx = o => (o ? (o[lang] ?? o.ja) : '')
const isTouch = () => matchMedia('(pointer:coarse)').matches

// ---------- 画像
const V = '?v=1'
const IMG = {}
const NAMES = ['bg', 'c_m', 'c_m_x', ...D.C.map(c => c.k), ...D.C.filter(c => c.angry).map(c => c.angry), ...Object.values(D.ITEMS).map(i => i.img)]
function loadAll() {
  return Promise.all([...new Set(NAMES)].map(n => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[n] = im; res() }; im.onerror = () => { console.error('img ' + n); res() }; im.src = 'img/' + n + '.webp' + V
  })))
}
// 客の絵に店の蛍光灯の色をかぶせておく（1回だけ）
const TINT = {}
function tinted(n) {
  if (TINT[n]) return TINT[n]
  const im = IMG[n]; if (!im) return null
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height
  const x = c.getContext('2d'); x.drawImage(im, 0, 0)
  x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(18,40,32,0.2)'; x.fillRect(0, 0, c.width, c.height)
  x.globalCompositeOperation = 'source-over'
  return (TINT[n] = c)
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
const FACE = { c_d: [528, 420], c_e: [525, 400], c_h: [506, 420], c_i: [540, 380] }

// ---------- 乱数
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// ---------- 音（素材なし・WebAudio）
const Snd = {
  ctx: null, muted: store.get('ac_mute') === '1', want: null, track: null, next: 0, step: 0, switchAt: 0, played: {},
  TEMPO: { title: 60, night: 54, dawn: 80, bad: 50 },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return
    try {
      this.ctx = new AC(); const c = this.ctx
      this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.75; this.master.connect(c.destination)
      this.bgm = c.createGain(); this.bgm.gain.value = 0.0001; this.bgm.connect(this.master)
      const len = c.sampleRate; this.nb = c.createBuffer(1, len, len); const d = this.nb.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      // 冷蔵庫のうなり（ずっと鳴っている）
      this.hum = c.createGain(); this.hum.gain.value = 0.03; this.hum.connect(this.master)
      const o = c.createOscillator(), f = c.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = 50; f.type = 'lowpass'; f.frequency.value = 160; o.connect(f); f.connect(this.hum); o.start()
      if (this.want) { const w = this.want; this.want = null; this.setTrack(w) }
    } catch (e) { this.ctx = null }
  },
  setMute(m) { this.muted = m; store.set('ac_mute', m ? '1' : '0'); if (this.master) this.master.gain.value = m ? 0 : 0.75 },
  mark(n) { this.played[n] = (this.played[n] || 0) + 1 },
  mtof: m => 440 * Math.pow(2, (m - 69) / 12),
  tone(f, t0, dur, type = 'sine', vol = 0.2, dest, f2) {
    if (!this.ctx) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain()
    o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur)
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g); g.connect(dest || this.master); o.start(t0); o.stop(t0 + dur + 0.05)
  },
  noise(t0, dur, vol, freq, type = 'highpass', dest, q) {
    if (!this.ctx) return; const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain()
    s.buffer = this.nb; f.type = type; f.frequency.value = freq; if (q) f.Q.value = q
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    s.connect(f); f.connect(g); g.connect(dest || this.master); s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.05)
  },
  setTrack(name) {
    if (this.want === name) return; this.want = name; if (!this.ctx) return
    const now = this.ctx.currentTime, g = this.bgm.gain; g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.0001, g.value), now); g.linearRampToValueAtTime(0.0001, now + 0.4); this.switchAt = now + 0.42
  },
  tick() {
    if (!this.ctx) return; const c = this.ctx
    if (this.switchAt && c.currentTime >= this.switchAt) {
      this.track = this.want; this.step = 0; this.next = c.currentTime + 0.05; this.switchAt = 0
      const g = this.bgm.gain; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(0.0001, c.currentTime); g.linearRampToValueAtTime(0.3, c.currentTime + 1.2)
      if (this.track) this.mark('bgm:' + this.track)
    }
    if (!this.track || this.switchAt) return
    const spb = 60 / this.TEMPO[this.track] / 2
    if (this.next < c.currentTime) this.next = c.currentTime + 0.05
    while (this.next < c.currentTime + 0.3) { this['p_' + this.track](this.step, this.next, spb); this.next += spb; this.step++ }
  },
  pad(ns, t, dur, vol) { for (const n of ns) { this.tone(this.mtof(n), t, dur, 'sine', vol, this.bgm); this.tone(this.mtof(n) * 1.004, t, dur, 'triangle', vol * 0.4, this.bgm) } },
  // タイトル: 低いうなりと、ときどき鳴る不協和なベル
  p_title(i, t, spb) {
    const s = i % 16
    if (s === 0) this.pad([38, 45], t, spb * 16, 0.05)
    if (s === 8 && (i / 16 | 0) % 2) this.tone(this.mtof(74), t, 3, 'sine', 0.03, this.bgm, this.mtof(73))
    if (s % 4 === 2) this.noise(t, 0.05, 0.012, 6000, 'highpass', this.bgm)
  },
  // 夜勤: 時計の音、ずれた和音、遠くの車
  p_night(i, t, spb) {
    const s = i % 32, bar = (i / 32 | 0) % 4
    if (s % 2 === 0) this.noise(t, 0.03, s % 4 ? 0.01 : 0.02, 3500, 'bandpass', this.bgm, 6)
    if (s === 0) this.pad([[36, 43], [35, 42], [36, 41], [34, 41]][bar], t, spb * 32, 0.05)
    if (s === 12 && bar % 2) this.tone(this.mtof([67, 66, 70, 63][bar]), t, 2.5, 'triangle', 0.018, this.bgm)
    if (s === 20 && bar === 3) this.noise(t, 2.8, 0.02, 400, 'lowpass', this.bgm)
  },
  p_dawn(i, t) {
    const s = i % 16, bar = (i / 16 | 0) % 4
    if (s === 0) this.pad([[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]][bar], t, 3.4, 0.04)
    if (s % 4 === 2) { const n = [72, 76, 79, 76][(s / 4 | 0)]; this.tone(this.mtof(n + (bar === 2 ? -3 : 0)), t, 0.6, 'triangle', 0.03, this.bgm) }
  },
  p_bad(i, t, spb) {
    const s = i % 16
    if (s === 0) this.pad([33, 34, 40], t, spb * 16, 0.06)
    if (s === 6) this.tone(this.mtof(81), t, 1.6, 'sine', 0.02, this.bgm, this.mtof(80))
  },
  sfx(name) {
    if (!this.ctx) return; const t = this.ctx.currentTime; this.mark(name)
    switch (name) {
      case 'chime': [[76, 0], [72, 0.28], [74, 0.56], [67, 0.84]].forEach(([n, d]) => this.tone(this.mtof(n), t + d, 0.7, 'sine', 0.12)); break
      case 'put': this.tone(180, t, 0.08, 'sine', 0.3, null, 90); this.noise(t, 0.06, 0.08, 900, 'lowpass'); break
      case 'beep': this.tone(1900, t, 0.09, 'square', 0.05); break
      case 'yes': this.tone(1200, t, 0.06, 'square', 0.04); this.tone(1600, t + 0.07, 0.06, 'square', 0.04); break
      case 'ask': this.tone(520, t, 0.08, 'triangle', 0.08); break
      case 'look': this.tone(900, t, 0.05, 'sine', 0.06, null, 1300); break
      case 'card': this.noise(t, 0.15, 0.08, 2500, 'bandpass', null, 1.5); break
      case 'slam': this.tone(90, t, 0.4, 'sine', 0.9, null, 40); this.noise(t, 0.35, 0.5, 1400, 'lowpass'); break
      case 'shout': for (let k = 0; k < 4; k++) this.tone(170 + k * 23, t + k * 0.02, 0.5, 'sawtooth', 0.05, null, 120); this.noise(t, 0.5, 0.12, 900, 'bandpass', null, 2); break
      case 'refuse': this.tone(330, t, 0.25, 'triangle', 0.12); this.tone(247, t + 0.18, 0.4, 'triangle', 0.12); break
      case 'cash': this.tone(2600, t, 0.12, 'sine', 0.08); this.tone(3300, t + 0.08, 0.3, 'sine', 0.07); this.noise(t + 0.2, 0.25, 0.1, 3000, 'bandpass'); break
      case 'complaint': this.tone(110, t, 0.6, 'square', 0.06, null, 80); break
      case 'siren': for (let k = 0; k < 4; k++) { this.tone(700, t + k * 0.6, 0.3, 'triangle', 0.08, null, 960); this.tone(960, t + k * 0.6 + 0.3, 0.3, 'triangle', 0.08, null, 700) } break
      case 'phone': for (let k = 0; k < 3; k++) for (let j = 0; j < 8; j++) this.tone(j % 2 ? 1300 : 1600, t + k * 0.9 + j * 0.05, 0.05, 'square', 0.04); break
      case 'stamp': this.tone(70, t, 0.3, 'sine', 0.9, null, 35); this.noise(t, 0.2, 0.35, 600, 'lowpass'); break
      case 'flick': for (let k = 0; k < 5; k++) this.noise(t + k * 0.05, 0.03, 0.05, 4000, 'highpass'); break
      case 'whisper': this.noise(t, 1.8, 0.05, 1800, 'bandpass', null, 3); this.tone(this.mtof(58), t, 2, 'sine', 0.03, null, this.mtof(52)); break
      case 'splash': this.noise(t, 0.5, 0.25, 1200, 'bandpass', null, 0.8); this.tone(400, t, 0.2, 'sine', 0.1, null, 120); break
      case 'creak': this.tone(90, t, 0.9, 'sawtooth', 0.05, null, 140); this.noise(t, 0.9, 0.04, 300, 'bandpass', null, 4); break
      case 'door': this.noise(t, 0.6, 0.05, 500, 'lowpass'); break
      case 'tap': this.tone(800, t, 0.04, 'triangle', 0.06); break
      case 'boss': this.tone(150, t, 0.15, 'triangle', 0.08, null, 130); break
    }
  },
}

// ---------- 状態
const G = { mode: 'title', t: 0, tasks: [], list: [], idx: -1, cur: null, complaints: 0, minorsRefused: 0, adultsSold: 0, sneaky: [], ended: null, light: 1, flash: 0, mag: null, snap: null, bossI: 0, seed: 1, ghostDark: 0, log: [] }
const later = (d, fn) => G.tasks.push({ at: G.t + d, fn })
const modalOpen = () => !$('#mId').hidden || !$('#mSheet').hidden || !$('#mHow').hidden

function buildList(seed, all) {
  const r = rng(seed), others = D.C.filter(c => c.k !== 'c_a')
  let pick
  if (all) pick = others.slice()
  else {
    const must = others.filter(c => ['y_kappa', 'y_rokuro', 'c_i'].includes(c.k))
    const rest = others.filter(c => !must.includes(c))
    for (let i = rest.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0;[rest[i], rest[j]] = [rest[j], rest[i]] }
    pick = must.concat(rest.slice(0, 8))
  }
  for (let i = pick.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0;[pick[i], pick[j]] = [pick[j], pick[i]] }
  // 幽霊は丑三つ時（2時台）に来る
  const gi = pick.findIndex(c => c.k === 'c_i'); const g = pick.splice(gi, 1)[0]
  const list = [D.C.find(c => c.k === 'c_a'), ...pick]
  const slot = Math.round(list.length * 2.1 / 5); list.splice(slot, 0, g)
  return list
}
const minutesPer = () => 300 / G.list.length
function clockText(min) { const h = Math.floor(min / 60), m = Math.floor(min % 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') }

// ---------- 画面切替
function show(v) { for (const id of ['vTitle', 'vPlay', 'vEnd']) $('#' + id).hidden = id !== v; $('#bSheet').hidden = v !== 'vPlay'; layoutDom() }

function startShift(seed, opts = {}) {
  Snd.init()
  G.seed = seed ?? ((Math.random() * 1e9) | 0)
  G.list = buildList(G.seed, opts.all); G.idx = -1; G.complaints = 0; G.minorsRefused = 0; G.adultsSold = 0; G.sneaky = []; G.ended = null; G.tasks = []; G.snap = null; G.mag = null
  G.log = []
  updateComp(); show('vPlay'); hideBubble(); hideNote(); setPos(null)
  G.mode = 'boss'; G.cur = { boss: true, img: 'c_m', enterAt: G.t, leaveAt: null, anger: 0, asked: {}, c: { k: 'c_m', pat: 9 } }
  Snd.setTrack('night'); Snd.sfx('chime')
  setButtons(false)
  if (opts.skipBoss) { endBoss(true); return }
  G.bossI = 0; later(0.6, () => { if (G.mode !== 'boss') return; $('#boss').hidden = false; bossLine() })
}
function bossLine() { $('#bossNm').textContent = L().boss; $('#bossLine').textContent = tx(D.BOSS[G.bossI]); Snd.sfx('boss') }
function bossNext() { G.bossI++; if (G.bossI >= D.BOSS.length) endBoss(); else bossLine() }
function endBoss(instant) {
  $('#boss').hidden = true
  if (G.cur && G.cur.boss) G.cur.leaveAt = G.t
  G.mode = 'play'
  later(instant ? 0 : 0.9, nextCustomer)
}

function nextCustomer() {
  G.idx++
  if (G.idx >= G.list.length) return dawn()
  const c = G.list[G.idx]
  G.cur = { c, img: c.k, enterAt: G.t, leaveAt: null, anger: 0, asked: {}, idAsked: false, phase: 'enter', angry: false, neck: 0, neckT: 0, lastAct: 0, put: null }
  $('#clk').textContent = clockText(G.idx * minutesPer())
  hideBubble(); hideNote(); setPos(null); setButtons(false); showQs(false)
  Snd.sfx('chime'); Snd.sfx('door')
  if (c.ghost) { Snd.sfx('whisper'); G.flick = 1 }
  later(0.9, () => { G.cur.put = G.t; Snd.sfx('put'); later(0.25, () => Snd.sfx('beep')); setPos(c) })
  later(1.5, () => {
    if (G.cur.c !== c) return
    $('#posTag').textContent = L().posYes; Snd.sfx('yes')
    say(tx(c.hello), c.ghost ? 'ghost' : '')
    G.cur.phase = 'turn'; G.cur.lastAct = G.t; setButtons(true)
    if (G.idx === 0 && store.get('ac_tut') !== '1') { G.tut = 1; note(L().tut.look(isTouch()), 'tut') } else G.tut = 0
  })
}

// ---------- 行動
function act(a, arg) {
  const cur = G.cur; if (G.mode !== 'play' || !cur || cur.phase !== 'turn') return false
  cur.lastAct = G.t
  const c = cur.c
  if (a === 'ask') {
    if (cur.asked[arg]) return false
    cur.asked[arg] = 1; Snd.sfx('ask'); markQs()
    if (addAnger(1)) return true
    say(tx(c.a[arg]), c.ghost ? 'ghost' : ''); tutStep(2)
    G.log.push(c.k + ':ask:' + arg)
    return true
  }
  if (a === 'id') {
    if (cur.idAsked) { if (c.id) openCard(c); return true }
    cur.idAsked = true; G.log.push(c.k + ':id'); tutStep(2)
    if (addAnger(c.idCost)) return true
    if (c.id) { say(tx(c.idLine), c.ghost ? 'ghost' : ''); Snd.sfx('card'); later(0.5, () => { if (G.cur === cur && cur.phase === 'turn') openCard(c) }) }
    else { say(tx(c.noId), c.ghost ? 'ghost' : ''); note(L().noIdNote) }
    return true
  }
  if (a === 'sell' || a === 'refuse') { finish(a); return true }
  return false
}
function tutStep(n) {
  if (!G.tut) return
  if (n === 2 && G.tut < 3) { G.tut = 3; note(L().tut.decide, 'tut'); store.set('ac_tut', '1') }
}
function addAnger(n) {
  const cur = G.cur; cur.anger += n; drawAnger()
  if (cur.c.neck) Snd.sfx('creak')
  if (cur.anger > cur.c.pat) { rage(); return true }
  return false
}
function rage() {
  const cur = G.cur, c = cur.c
  cur.phase = 'leave'; cur.angry = true; cur.shake = G.t; G.flash = 1; setButtons(false); showQs(false); closeCard()
  Snd.sfx('slam'); Snd.sfx('shout')
  say(tx(c.rage), 'rage')
  cur.outcome = 'rage'; G.log.push(c.k + ':rage')
  later(0.15, () => snapshot())
  if (!c.minor) complaint(); else G.minorsRefused++
  later(2.3, leave)
}
function finish(a) {
  const cur = G.cur, c = cur.c
  cur.phase = 'leave'; setButtons(false); showQs(false); closeCard()
  cur.outcome = a; G.log.push(c.k + ':' + a)
  if (a === 'sell') {
    Snd.sfx('cash'); say(tx(c.sell), c.ghost ? 'ghost' : '')
    if (c.minor) {
      if (c.detect) { snapshot(); later(1.7, leave); later(1.7, () => { G.pendingDetect = c }); return }
      G.sneaky.push(c.k)
    } else G.adultsSold++
    later(1.7, leave)
  } else {
    Snd.sfx('refuse'); say(tx(c.refuse), c.ghost ? 'ghost' : (c.minor ? '' : 'rage'))
    if (!c.minor) {
      complaint(); cur.shake = G.t
      if (c.ghost) { G.ghostDark = G.t; Snd.sfx('whisper'); Snd.sfx('flick') }
      if (c.k === 'y_kappa') Snd.sfx('splash')
      if (c.neck) { cur.neckBoost = 1; Snd.sfx('creak') }
      if (c.angry) cur.angry = true
      snapshot()
    } else G.minorsRefused++
    later(1.9, leave)
  }
}
function complaint() { G.complaints++; updateComp(); Snd.sfx('complaint') }
function leave() {
  const cur = G.cur; if (!cur || cur.leaveAt) return
  cur.leaveAt = G.t; Snd.sfx('door')
  later(0.35, hideBubble)
  if (cur.c && cur.c.ghost) later(0.4, () => note(tx(D.EV.camEmpty)))
  later(1.0, () => {
    hideNote(); setPos(null)
    if (G.pendingDetect) { const c = G.pendingDetect; G.pendingDetect = null; return detected(c) }
    if (G.complaints >= 3) return fired()
    nextCustomer()
  })
}

// ---------- 終わり方
function eventShow(text, stamp, sfx) {
  G.mode = 'event'; setButtons(false); hideBubble(); hideNote()
  $('#evText').textContent = text; const st = $('#evStamp'); st.textContent = stamp || ''; st.hidden = !stamp; st.classList.remove('in')
  $('#bEvNext').hidden = true; $('#bEvNext').textContent = lang === 'ja' ? '給料明細へ' : 'See payslip'
  $('#event').hidden = false
  if (sfx) Snd.sfx(sfx)
  later(1.4, () => { if (stamp) { st.classList.add('in'); Snd.sfx('stamp') } })
  later(2.0, () => { $('#bEvNext').hidden = false })
}
function detected(c) {
  G.ended = 'stop'; Snd.setTrack('bad')
  G.cur = { boss: true, img: 'c_m_x', enterAt: G.t, leaveAt: null, anger: 0, asked: {}, c: { k: 'c_m' }, angry: true }
  eventShow(tx(c.detect), L().endStop, c.k === 'c_f' ? 'phone' : 'siren')
}
function fired() {
  G.ended = 'fired'; Snd.setTrack('bad')
  G.cur = { boss: true, img: 'c_m_x', enterAt: G.t, leaveAt: null, anger: 0, asked: {}, c: { k: 'c_m' }, angry: true }
  eventShow(tx(D.EV.fired), L().endFired, 'phone')
}
function dawn() {
  G.ended = 'dawn'; Snd.setTrack('dawn'); G.cur = null; G.dawnAt = G.t
  $('#clk').textContent = '05:00'
  eventShow(tx(D.EV.dawnOk), '', null)
}
function result() {
  const ja = lang === 'ja', hours = G.ended === 'dawn' ? 5 : Math.max(0.5, Math.round(G.idx * minutesPer() / 30) / 2)
  const pay = [], ded = []
  if (G.minorsRefused) pay.push({ label: ja ? '見抜き手当' : 'Sharp-eye bonus', note: ja ? `未成年 ${G.minorsRefused}人` : `${G.minorsRefused} minors`, yen: 500 * G.minorsRefused })
  if (G.complaints) ded.push({ label: ja ? 'クレーム' : 'Complaints', note: ja ? `${G.complaints}件` : `${G.complaints}`, yen: 1500 * G.complaints })
  if (G.ended === 'stop') ded.push({ label: ja ? '罰金' : 'Fine', note: ja ? '50万円以下' : 'up to ¥500,000', yen: 500000 })
  let stamp, comment
  if (G.ended === 'stop') { stamp = ja ? '営業\n停止' : 'SHUT\nDOWN'; comment = tx(D.BOSSC.stop) }
  else if (G.ended === 'fired') { stamp = ja ? 'クビ' : 'FIRED'; comment = tx(D.BOSSC.fired) }
  else if (G.sneaky.length) { stamp = ja ? '要注意' : 'WATCH'; comment = tx(D.BOSSC.sneaky) }
  else if (G.complaints === 0) { stamp = ja ? '本採用' : 'HIRED'; comment = tx(D.BOSSC.perfect) }
  else if (G.complaints === 1) { stamp = ja ? 'よし' : 'OK'; comment = tx(D.BOSSC.ok) }
  else { stamp = ja ? '要研修' : 'RETRAIN'; comment = tx(D.BOSSC.meh) }
  return { lang, no: G.idx + 1, job: L().job, date: '2026.11.01', wage: 1375, hours, pay, ded, boss: L().boss, comment, stamp, photo: G.snap, footer: 'tom3games.github.io/age-check', series: L().series, name: L().name }
}
function showEnd() {
  $('#event').hidden = true; G.mode = 'end'
  const d = result(); G.result = d; G.total = totals(d)
  drawPayslip($('#slip'), d, { main: '#1d6b4a', dark: '#0b2a1e', accent: '#e8423a', bg: '#0b1112' })
  show('vEnd')
}

// ---------- 吹き出し・メモ・POS・ボタン
let bubbleAt = 0
function say(s, cls = '') { const b = $('#bubble'); b.textContent = s; b.className = cls; b.hidden = false; bubbleAt = G.t; layoutDom() }
function hideBubble() { $('#bubble').hidden = true }
function note(s, cls = '') { const n = $('#note'); n.textContent = s; n.className = cls; n.hidden = false; G.noteAt = G.t; layoutDom() }
function hideNote() { $('#note').hidden = true }
function setPos(c) {
  if (!c) { $('#posNm').textContent = '---'; $('#posTag').hidden = true; $('#anger').innerHTML = ''; return }
  const it = D.ITEMS[c.item]
  $('#posNm').textContent = `${tx(it.n)} ×${c.n}  ¥${(it.p * c.n).toLocaleString()}`
  $('#posTag').hidden = false; $('#posTag').textContent = L().posAsk
  drawAnger()
}
function drawAnger() {
  const cur = G.cur; if (!cur || !cur.c || cur.boss) { $('#anger').innerHTML = ''; return }
  const n = Math.min(cur.c.pat, 5), on = Math.min(cur.anger, n)
  let h = lang === 'ja' ? '怒' : '!'
  for (let i = 0; i < n; i++) h += `<i class="${i < on ? 'on' : ''}"></i>`
  $('#anger').innerHTML = h
}
function setButtons(on) { for (const id of ['aAsk', 'aId', 'aRef', 'aSell']) $('#' + id).disabled = !on; $('#qs').querySelectorAll('button').forEach(b => { if (!on) b.disabled = true }) }
function showQs(on) { $('#qs').hidden = !on; $('#acts').hidden = on; if (on) markQs(); layoutDom() }
function markQs() { $('#qs').querySelectorAll('[data-q]').forEach(b => { b.disabled = !!(G.cur && G.cur.asked[b.dataset.q]) || !(G.cur && G.cur.phase === 'turn') }); $('#qBack').disabled = false }
function updateComp() { document.querySelectorAll('.comp i').forEach((e, i) => e.classList.toggle('on', i < G.complaints)) }

// ---------- 身分証
const WA = { 2002: '平成14年', 2004: '平成16年' }
const WAE = { 2002: 'Heisei 14', 2004: 'Heisei 16' }
const KAN = n => ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五'][n] || String(n)
function openCard(c) { drawCard($('#idc'), c); $('#mId').hidden = false; Snd.sfx('card') }
function closeCard() { $('#mId').hidden = true }
function facePhoto(x, k, X, Y, w, h, sepia) {
  const im = IMG[k]; if (!im) return
  const f = FACE[k] || [512, 420], cw = 330 * K, ch = cw * h / w
  x.save(); x.beginPath(); x.rect(X, Y, w, h); x.clip()
  x.fillStyle = sepia ? '#cdbb92' : '#cfd6db'; x.fillRect(X, Y, w, h)
  x.drawImage(im, f[0] * K - cw / 2, f[1] * K - ch * 0.45, cw, ch, X, Y, w, h)
  if (sepia) { x.globalCompositeOperation = 'color'; x.fillStyle = '#a0804a'; x.fillRect(X, Y, w, h); x.globalCompositeOperation = 'source-over' }
  x.restore(); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; x.strokeRect(X, Y, w, h)
}
function vtext(x, s, X, Y, size, gap = 1.08) { let y = Y; for (const ch of s) { x.fillText(ch, X, y); y += size * gap } }
function drawCard(cv, c) {
  const id = c.id, x = cv.getContext('2d'), W = cv.width, H = cv.height, ja = lang === 'ja'
  x.clearRect(0, 0, W, H); x.textBaseline = 'alphabetic'; x.textAlign = 'left'
  const F = '"Zen Kaku Gothic New","Hiragino Sans",sans-serif', M = '"Shippori Mincho B1","Hiragino Mincho ProN",serif'
  const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath() }
  if (id.kind === 'license') {
    rr(10, 10, W - 20, H - 20, 28); const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#eef6ef'); g.addColorStop(1, '#d9e9e4'); x.fillStyle = g; x.fill()
    x.save(); x.clip(); x.globalAlpha = 0.08; x.strokeStyle = '#2a7a5a'; for (let i = -H; i < W; i += 14) { x.beginPath(); x.moveTo(i, 0); x.quadraticCurveTo(i + 60, H / 2, i, H); x.stroke() } x.restore()
    x.fillStyle = '#1c3a30'; x.font = `900 30px ${F}`
    x.fillText(ja ? '氏名' : 'Name', 50, 80); x.font = `900 46px ${F}`; x.fillText(tx(id.name), 150, 82)
    x.font = `700 30px ${F}`; x.fillText(ja ? '生年月日' : 'Born', 50, 150)
    x.font = `900 40px ${F}`; x.fillStyle = '#0d1f19'; x.fillText(ja ? `${WA[id.y] || id.y + '年'} ${id.m}月 ${id.d}日生` : `${WAE[id.y] || id.y} / ${id.m} / ${id.d}`, 200, 152)
    x.fillStyle = '#1c3a30'; x.font = `700 26px ${F}`
    x.fillText(ja ? '住所　夜見市深川町2丁目13-4' : 'Address  2-13-4 Fukagawa, Yomi', 50, 215)
    x.fillText(ja ? '交付　令和6年 3月10日' : 'Issued  Reiwa 6.3.10', 50, 265)
    x.fillStyle = '#2d7d4f'; rr(50, 290, 580, 64, 10); x.fill(); x.fillStyle = '#fff'; x.font = `900 32px ${F}`; x.fillText(ja ? '令和11年 3月 8日まで有効' : 'Valid until Reiwa 11.3.8', 72, 334)
    x.fillStyle = '#1c3a30'; x.font = `900 52px ${M}`; x.fillText(ja ? '運転免許証' : "DRIVER'S LICENSE", 50, 440)
    x.font = `700 24px ${F}`; x.fillText(ja ? '第 4021 3381 7704 号' : 'No. 4021 3381 7704', 50, 490)
    x.fillText(ja ? '夜見県公安委員会' : 'Yomi Pref. Public Safety Comm.', 50, 560)
    facePhoto(x, id.photo || c.k, 680, 140, 260, 330)
  } else if (id.kind === 'student') {
    rr(10, 10, W - 20, H - 20, 26); x.fillStyle = '#fbfbf8'; x.fill()
    x.fillStyle = '#1f3c78'; rr(10, 10, W - 20, 110, 26); x.fill(); x.fillRect(10, 80, W - 20, 40)
    x.fillStyle = '#fff'; x.font = `900 48px ${M}`; x.fillText(ja ? '夜見大学　学生証' : 'YOMI UNIV. STUDENT ID', 50, 88)
    x.fillStyle = '#1b2440'; x.font = `700 28px ${F}`
    x.fillText(ja ? '経済学部 経済学科' : 'Faculty of Economics', 50, 190)
    x.fillText(ja ? '学籍番号 25E1047' : 'Student No. 25E1047', 50, 240)
    x.font = `900 46px ${F}`; x.fillText(tx(id.name), 50, 320)
    x.font = `900 36px ${F}`; x.fillText(ja ? `${id.y}年 ${id.m}月 ${id.d}日生` : `Born ${id.y}.${id.m}.${id.d}`, 50, 395)
    x.font = `700 24px ${F}`; x.fillText(ja ? '有効期限 2029年3月31日' : 'Valid until 2029.3.31', 50, 470)
    facePhoto(x, c.k, 690, 150, 240, 300)
  } else if (id.kind === 'paper') {
    x.fillStyle = '#d9c79c'; x.fillRect(30, 20, W - 60, H - 40)
    x.globalAlpha = 0.25; for (let i = 0; i < 60; i++) { x.fillStyle = i % 2 ? '#8a6d3b' : '#f1e3bf'; x.beginPath(); x.arc((i * 137) % W, (i * 91) % H, 20 + (i * 7) % 60, 0, 7); x.fill() } x.globalAlpha = 1
    x.fillStyle = '#2b1d10'; x.font = `400 64px ${M}`; x.textAlign = 'center'
    vtext(x, '身分證明書', 880, 110, 64)
    x.font = `400 76px ${M}`; vtext(x, tx(id.name), 760, 150, 76)
    x.font = `400 50px ${M}`; vtext(x, '大正十五年七月七日生', 640, 90, 50, 1.02)
    if (!ja) { x.textAlign = 'left'; x.font = `700 26px ${F}`; x.fillText('ID paper / born Taisho 15, July 7', 60, H - 50) }
    x.textAlign = 'left'; facePhoto(x, c.k, 90, 120, 230, 290, true)
    x.fillStyle = 'rgba(160,30,20,.7)'; x.beginPath(); x.arc(470, 470, 60, 0, 7); x.fill()
  } else if (id.kind === 'leaf') {
    x.fillStyle = '#2f6e3a'; x.beginPath(); x.ellipse(W / 2, H / 2, W / 2 - 20, H / 2 - 14, 0, 0, 7); x.fill()
    x.strokeStyle = 'rgba(200,240,190,.35)'; x.lineWidth = 4; for (let a = 0; a < 6.28; a += 0.4) { x.beginPath(); x.moveTo(W / 2, H / 2); x.lineTo(W / 2 + Math.cos(a) * (W / 2 - 30), H / 2 + Math.sin(a) * (H / 2 - 20)); x.stroke() }
    x.fillStyle = '#0f1f10'; x.textAlign = 'center'; x.font = `400 70px ${M}`
    vtext(x, '河童', 700, 130, 70); vtext(x, '川太郎', 590, 130, 70)
    x.font = `400 54px ${M}`; vtext(x, '寛政十年', 420, 140, 54); vtext(x, '午年生', 330, 170, 54)
    if (!ja) { x.textAlign = 'center'; x.font = `700 28px ${F}`; x.fillStyle = '#e8f5e0'; x.fillText('Kawataro / born Kansei 10 (1798), Horse', W / 2, H - 48) }
    x.textAlign = 'left'
  } else if (id.kind === 'tegata') {
    const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#7a4f2a'); g.addColorStop(0.5, '#9a6a3c'); g.addColorStop(1, '#6e4524')
    x.fillStyle = g; rr(250, 20, 500, H - 40, 30); x.fill()
    x.strokeStyle = 'rgba(40,20,5,.35)'; x.lineWidth = 2; for (let i = 0; i < 18; i++) { x.beginPath(); x.moveTo(260, 40 + i * 32); x.bezierCurveTo(400, 30 + i * 33, 600, 50 + i * 31, 740, 40 + i * 32); x.stroke() }
    x.fillStyle = '#1a0d04'; x.textAlign = 'center'; x.font = `400 72px ${M}`
    vtext(x, '通行手形', 610, 120, 72); x.font = `400 64px ${M}`; vtext(x, tx(id.name), 500, 150, 64); x.font = `400 52px ${M}`; vtext(x, '享保元年生', 400, 120, 52)
    if (!ja) { x.font = `700 26px ${F}`; x.fillStyle = '#fff'; x.fillText('Travel pass / born Kyoho 1 (1716)', W / 2, H - 4) }
    x.textAlign = 'left'
  }
}

// ---------- 早見表・遊び方
function buildSheet() {
  const u = L(), names = u.etoNames
  let eto = ''
  for (let i = 0; i < 12; i++) eto += `<div><b>${names[i]}</b>${D.ETO_BASE + i}</div>`
  $('#sheet').innerHTML = `<h3>${lang === 'ja' ? '年齢確認 早見表' : 'Age check cheat sheet'}</h3><div class="big">${u.sheetBody.line}</div><div class="era">${u.sheetBody.era}</div><div>${u.sheetBody.eto}</div><div class="eto">${eto}</div>`
}
function buildHow() {
  const u = L(); $('#howp').innerHTML = `<h2>${u.howto}</h2>` + u.howtoBody.map((s, i) => `<p data-n="${i + 1}">${s}</p>`).join('')
}

// ---------- 文言
function applyLang() {
  const u = L(); document.documentElement.lang = lang
  $('#tTitle').innerHTML = lang === 'ja' ? '年齢<span>確認</span>' : 'AGE <span>CHECK</span>'
  $('#tSub').textContent = u.sub; $('#bStart').textContent = u.start; $('#bHow').textContent = u.howto
  $('#bLang').textContent = lang === 'ja' ? 'EN' : 'JA'
  $('#tSheet').textContent = u.sheet; $('#tComp').textContent = u.complaints; $('#date').textContent = u.date
  $('#aAsk span').textContent = u.ask; $('#aId span').textContent = u.id; $('#aRef span').textContent = u.refuse; $('#aSell span').textContent = u.sell
  $('#qs').querySelectorAll('[data-q]').forEach(b => { b.textContent = u.q[b.dataset.q] }); $('#qBack').textContent = u.back
  $('#bIdClose').textContent = u.close; $('#bSheetClose').textContent = u.close; $('#bHowClose').textContent = u.close
  $('#bBossSkip').textContent = u.skip; $('#bBossNext').textContent = u.next; $('#bossNm').textContent = u.boss
  $('#bSave span').textContent = u.save; $('#bPost span').textContent = u.post; $('#bAgain').textContent = u.again; $('#bTitle').textContent = u.toTitle
  buildSheet(); buildHow()
  if (G.mode === 'boss' && !$('#boss').hidden) bossLine()
  if (G.cur && G.cur.c && !G.cur.boss && G.cur.put) setPos(G.cur.c)
  if (G.mode === 'end') showEnd()
}

// ---------- 描画
const cv = $('#cv'), cx = cv.getContext('2d')
let VW = 0, VH = 0, DPR = 1, AREA = { x: 0, y: 0, w: 1, h: 1 }, VIEW = { s: 1, ox: 0, oy: 0 }
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1); VW = innerWidth; VH = innerHeight
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR)
  layoutDom()
}
function computeView() {
  let a = { x: 0, y: 0, w: VW, h: VH }
  if (!$('#vPlay').hidden) {
    const p = $('#panel').getBoundingClientRect()
    if (VW >= VH) a = { x: 0, y: 0, w: p.left, h: VH }; else a = { x: 0, y: 0, w: VW, h: p.top }
  }
  AREA = a
  let s = Math.min(a.w / 740, a.h / 860)
  if ($('#vPlay').hidden) s = Math.max(VW / SW, VH / SH) * (VW < VH ? 1.0 : 1)
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
  const side = AREA.w / s > 1150
  const mon = $('#mon'); mon.style.visibility = 'visible'
  if (VW >= VH && !$('#vPlay').hidden) { const top = $('#panel .pos').getBoundingClientRect().top; if (mon.getBoundingClientRect().bottom > top - 6) mon.style.visibility = 'hidden' }
  let noteTop = AREA.y + AREA.h
  if (!n.hidden) {
    n.style.left = (AREA.x + AREA.w / 2) + 'px'
    n.style.top = 'auto'; n.style.bottom = (VH - (AREA.y + AREA.h) + 8) + 'px'
    noteTop = AREA.y + AREA.h - 8 - n.offsetHeight
  }
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
  const tin = ease((G.t - cur.enterAt) / 0.8), tout = cur.leaveAt != null ? ease((G.t - cur.leaveAt) / 0.7) : 0
  const a = tin * (1 - tout); if (a <= 0.001) return null
  let dx = 0, dy = (1 - tin) * 30 + tout * 20 + Math.sin(G.t * 1.7) * 2.5
  if (cur.shake != null && G.t - cur.shake < 0.7) { const k = 1 - (G.t - cur.shake) / 0.7; dx += Math.sin(G.t * 90) * 14 * k; dy += Math.cos(G.t * 77) * 6 * k }
  const img = cur.angry && cur.c && cur.c.angry ? cur.c.angry : (cur.img || cur.c.k)
  return { a, dx, dy, img, sc: 0.985 + 0.015 * tin }
}
function drawScene(x, s, ox, oy, o = {}) {
  const bg = IMG.bg
  x.save(); x.translate(ox, oy); x.scale(s, s)
  if (bg) x.drawImage(bg, 0, 0)
  const cur = G.cur, st = custState(cur)
  if (st && !(o.monitor && cur.c && cur.c.ghost)) {
    const im = o.monitor ? IMG[st.img] : tinted(st.img)
    if (im) {
      x.globalAlpha = st.a
      const ghostFlick = cur.c && cur.c.ghost && Math.sin(G.t * 31) > 0.93
      if (!ghostFlick) {
        const X = CX0 + st.dx, Y = CTOP + st.dy
        if (cur.c && cur.c.neck) {
          const e = cur.neck / CS, h1 = 430, h2 = 640
          x.drawImage(im, 0, h2, IW, IH - h2, X, Y + h2 * CS, IW * CS, (IH - h2) * CS)
          x.drawImage(im, 0, h1, IW, h2 - h1, X, Y + (h1 - e) * CS, IW * CS, (h2 - h1 + e) * CS)
          x.drawImage(im, 0, 0, IW, h1, X, Y - e * CS, IW * CS, h1 * CS)
        } else x.drawImage(im, X, Y, IW * CS, IH * CS)
      }
      x.globalAlpha = 1
    }
  }
  // カウンター（手前）
  if (bg) x.drawImage(bg, 0, CY, SW, SH - CY, 0, CY, SW, SH - CY)
  // 商品
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
  // 蛍光灯の明るさ
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
  // 拡大鏡
  const m = G.mag
  if (m && G.t - m.t < 2.8) {
    const k = Math.min(1, (G.t - m.t) / 0.12) * Math.min(1, (2.8 - (G.t - m.t)) / 0.3)
    const R = Math.min(AREA.w, AREA.h) * 0.2, Z = 2.4
    let px = ox + m.sx * s, py = oy + m.sy * s - R * 0.4
    px = Math.max(AREA.x + R + 6, Math.min(AREA.x + AREA.w - R - 6, px)); py = Math.max(AREA.y + R + 6, Math.min(AREA.y + AREA.h - R - 6, py))
    x.save(); x.globalAlpha = k; x.beginPath(); x.arc(px, py, R, 0, 7); x.clip()
    drawScene(x, s * Z, px - m.sx * s * Z, py - m.sy * s * Z)
    x.restore()
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
  mx.globalCompositeOperation = 'saturation'; mx.fillStyle = '#888'; mx.fillRect(0, 0, W, H)
  mx.globalCompositeOperation = 'source-over'
  mx.fillStyle = 'rgba(40,255,140,.06)'; mx.fillRect(0, 0, W, H)
  for (let y = 0; y < H; y += 3) { mx.fillStyle = 'rgba(0,0,0,.25)'; mx.fillRect(0, y, W, 1) }
  const ny = (G.t * 60) % H; mx.fillStyle = 'rgba(255,255,255,.06)'; mx.fillRect(0, ny, W, 10)
  mx.fillStyle = '#e8f0ec'; mx.font = '700 20px DotGothic16, monospace'; mx.fillText('CAM1', 10, 26)
  const min = Math.max(0, G.idx) * (G.list.length ? minutesPer() : 0) + Math.floor(G.t % 60 / 10)
  mx.fillText(clockText(min) + ':' + String(Math.floor(G.t % 60)).padStart(2, '0'), W - 120, H - 12)
  if (Math.floor(G.t * 2) % 2) { mx.fillStyle = '#e8423a'; mx.beginPath(); mx.arc(W - 20, 20, 7, 0, 7); mx.fill() }
}

// ---------- 見る（タップで拡大）
function inspect(sx, sy) {
  const cur = G.cur; if (G.mode !== 'play' || !cur || cur.phase !== 'turn' || cur.boss) return null
  if (sy > CY + 10) return null
  const ix = (sx - CX0) / CS / K, iy = (sy - CTOP) / CS / K
  if (ix < 0 || ix > 1024 || iy < 0 || iy > 1536) return null
  cur.lastAct = G.t
  let best = null, bd = 1e9
  for (const h of cur.c.hs) { const d = Math.hypot(ix - h[0], iy - h[1]) / h[2]; if (d < 1.15 && d < bd) { bd = d; best = h } }
  G.mag = { sx, sy, t: G.t, hit: !!best }
  Snd.sfx('look')
  note(best ? tx(best[3]) : L().nothing)
  if (G.tut === 1) { G.tut = 2; later(1.6, () => { if (G.tut === 2 && G.cur === cur && cur.phase === 'turn') note(L().tut.ask, 'tut') }) }
  G.looked = (G.looked || 0) + 1
  return best ? best[3].ja : null
}
cv.addEventListener('pointerdown', e => {
  if (G.mode !== 'play') return
  const { s, ox, oy } = VIEW
  inspect((e.clientX - ox) / s, (e.clientY - oy) / s)
})

// ---------- 結果の画像
function snapshot() {
  const c = document.createElement('canvas'); c.width = 640; c.height = 640
  const x = c.getContext('2d'), s = 640 / 760
  drawScene(x, s, 320 - 768 * s, 640 - 900 * s)
  G.snap = c
}

// ---------- ループ（固定60Hz）
let acc = 0, last = performance.now(), paused = false
function step(dt) {
  G.t += dt
  const due = G.tasks.filter(t => t.at <= G.t); G.tasks = G.tasks.filter(t => t.at > G.t); for (const t of due) t.fn()
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
  // 待たせすぎ
  const cur = G.cur
  if (G.mode === 'play' && cur && cur.phase === 'turn' && !modalOpen() && G.t - cur.lastAct > 25) {
    cur.lastAct = G.t - 13
    if (!addAnger(1)) say(tx(D.EV.idle), cur.c.ghost ? 'ghost' : '')
  }
}
function frame() {
  const n = performance.now(); let dt = Math.min(0.25, (n - last) / 1000); last = n
  if (!paused) { acc += dt; while (acc >= 1 / 60) { step(1 / 60); acc -= 1 / 60 } }
  Snd.tick(); render()
  requestAnimationFrame(frame)
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
  on('#bAgain', () => startShift())
  on('#bTitle', () => { G.mode = 'title'; G.cur = null; show('vTitle'); Snd.setTrack('title') })
  on('#bSave', () => { const c = $('#slip'); c.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'age-check.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000) }) })
  on('#bPost', () => {
    const r = G.result, st = r ? r.stamp.replace('\n', '') : ''
    const net = G.total ? G.total.net.toLocaleString() : '0'
    const text = lang === 'ja' ? `深夜コンビニの年齢確認バイト、結果は「${st}」。手取り${net}円 ${L().hash}` : `Night-shift age check: "${st}". Take-home ¥${net} ${L().hash}`
    open('https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent('https://tom3games.github.io/age-check/'), '_blank')
  })
  window.addEventListener('keydown', e => {
    if (G.mode !== 'play' || e.ctrlKey || e.metaKey) return
    const k = e.key.toLowerCase()
    if (k === 'escape') { closeCard(); $('#mSheet').hidden = true; showQs(false) }
    if (modalOpen()) return
    if (k === 's') act('sell'); else if (k === 'r') act('refuse'); else if (k === 'i') act('id'); else if (k === 'q') showQs($('#qs').hidden)
    else if ('1234'.includes(k) && !$('#qs').hidden) { act('ask', ['year', 'eto', 'student', 'why'][+k - 1]); showQs(false) }
  })
  window.addEventListener('resize', resize)
}
function muteIcon() { $('#icoSnd').style.opacity = Snd.muted ? 0.35 : 1; $('#bMute').setAttribute('aria-pressed', Snd.muted ? 'true' : 'false') }

// ---------- 検証用の窓口
window.ac = {
  G, D, Snd,
  start: (seed, opts) => startShift(seed, opts),
  act, inspect, showEnd, result: () => G.result, total: () => G.total,
  state: () => ({ mode: G.mode, idx: G.idx, n: G.list.length, k: G.cur && G.cur.c ? G.cur.c.k : null, phase: G.cur ? G.cur.phase : null, anger: G.cur ? G.cur.anger : 0, complaints: G.complaints, ended: G.ended, sneaky: G.sneaky.slice(), minorsRefused: G.minorsRefused, list: G.list.map(c => c.k), bubble: $('#bubble').hidden ? null : $('#bubble').textContent, note: $('#note').hidden ? null : $('#note').textContent, card: !$('#mId').hidden, event: !$('#event').hidden }),
  view: () => ({ ...VIEW, area: AREA }),
  drawScene, IMG,
  setCur: (k, extra = {}) => { const c = D.C.find(x => x.k === k); G.tasks = []; G.mode = 'play'; G.cur = { c, img: c.k, enterAt: G.t - 5, leaveAt: null, anger: 0, asked: {}, phase: 'turn', lastAct: G.t, put: G.t - 5, neck: 0, ...extra }; setPos(c); return G.cur },
  say, note,
  hs: k => D.C.find(c => c.k === k).hs.map(h => ({ sx: CX0 + h[0] * K * CS, sy: CTOP + h[1] * K * CS, ja: h[3].ja })),
  dbg: { pause: p => { paused = p }, step: n => { for (let i = 0; i < n; i++) step(1 / 60); render() } },
  setLang: l => { lang = l; applyLang() },
}

resize(); applyLang(); muteIcon(); bind()
loadAll().then(() => {
  requestAnimationFrame(frame)
  Snd.setTrack('title')
  window.__acReady = true
})
