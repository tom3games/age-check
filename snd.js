// 音（素材なし・WebAudio）。game.js から import
const store = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch (e) {} } }
export const Snd = {
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
      case 'fumble': for (let k = 0; k < 6; k++) this.noise(t + k * 0.11, 0.07, 0.05, 1800 + k * 200, 'bandpass', null, 2); break
      case 'leave': this.tone(220, t, 0.5, 'sine', 0.08, null, 160); this.noise(t + 0.1, 0.5, 0.04, 500, 'lowpass'); break
      case 'ok': this.tone(880, t, 0.12, 'triangle', 0.1); this.tone(1320, t + 0.1, 0.2, 'triangle', 0.1); break
      case 'ng': this.tone(200, t, 0.3, 'square', 0.06, null, 150); break
    }
  },
}
