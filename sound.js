// 音の割り当て（全部録音素材。出所は CREDITS.md）。game.js はここの sfx / setTrack / tick を呼ぶ
(() => {
  const KEY = 'ac_mute'
  try { Snd.muted = localStorage.getItem(KEY) === '1' } catch (e) {}
  const setM = Snd.setMute
  Snd.setMute = function (m) { setM.call(this, m); try { localStorage.setItem(KEY, m ? '1' : '0') } catch (e) {} }
  const grunts = [1, 2, 3, 4].map(i => `snd/grunt_0${i}.mp3`)
  Snd.def({
    chime1: 'snd/chime1.mp3', chime2: 'snd/chime2.mp3', phone: 'snd/phone.mp3', put: 'snd/put.mp3', beep: 'snd/beep.mp3', tap: 'snd/tap.mp3', ask: 'snd/ask.mp3', look: 'snd/look.mp3',
    card: ['snd/card1.mp3', 'snd/card2.mp3'], slam: 'snd/slam.mp3', thwack: 'snd/thwack.mp3', grunt: grunts, refuse: 'snd/refuse.mp3', coins: 'snd/coins.mp3', coin: 'snd/coin.mp3',
    complaint: 'snd/complaint.mp3', siren: 'snd/siren.mp3', whisper: 'snd/whisper.mp3', flick: 'snd/flick.mp3', splash: 'snd/splash.mp3', creak: 'snd/creak.mp3', dooropen: 'snd/dooropen.mp3', doorclose: 'snd/doorclose.mp3',
    fumble: ['snd/fumble1.mp3', 'snd/fumble2.mp3'], ok: 'snd/ok.mp3', ng: 'snd/ng.mp3', stamp: 'snd/stamp1.mp3', crow: 'snd/crow.mp3',
  })
  // 最初のタップまでに頼まれていた環境音を、音が使えるようになった時点で鳴らし始める
  const init0 = Snd.init
  Snd.init = function () { const first = !this.ctx; init0.call(this); if (first && this.ctx) for (const k in this.loops) { const l = this.loops[k]; if (l && l.url && !l.node) this.loop(k, l.url, l.vol) } }
  const HUM = 'snd/hum.mp3', STREET = 'snd/street.mp3'
  const CUE = {
    chime: [['chime1', { vol: 0.4, jitter: 0 }], ['chime2', { vol: 0.35, delay: 0.32, jitter: 0 }], ['dooropen', { vol: 0.35 }]],
    put: [['put', { vol: 0.8 }]], beep: [['beep', { vol: 0.45, jitter: 0 }]], yes: [['tap', { vol: 0.45, jitter: 0 }]], ask: [['ask', { vol: 0.45 }]], look: [['look', { vol: 0.35 }]],
    card: [['card', { vol: 0.7 }]], slam: [['slam', { vol: 1, rate: 0.8 }], ['thwack', { vol: 0.8, rate: 0.75 }]], shout: [['grunt', { vol: 1, rate: 0.75, room: 0.3 }], ['grunt', { vol: 0.8, rate: 0.68, delay: 0.14, room: 0.3 }]],
    refuse: [['refuse', { vol: 0.5 }]], cash: [['coins', { vol: 0.7 }], ['coin', { vol: 0.5, delay: 0.1 }]], complaint: [['complaint', { vol: 0.7 }]], siren: [['siren', { vol: 0.5, room: 0.4 }]],
    phone: [0, 0.34, 0.68, 1.5, 1.84, 2.18].map(d => ['phone', { vol: 0.35, rate: 1.7, delay: d, jitter: 0 }]), stamp: [['stamp', { vol: 1 }], ['put', { vol: 0.7 }]],
    flick: [['flick', { vol: 0.35 }]], whisper: [['whisper', { vol: 0.3, rate: 0.7, dest: 'muf' }]], splash: [['splash', { vol: 0.7 }]], creak: [['creak', { vol: 0.5, rate: 0.8 }]],
    door: [['doorclose', { vol: 0.5, room: 0.3 }]], leave: [['doorclose', { vol: 0.45, rate: 0.85, room: 0.3 }]], tap: [['tap', { vol: 0.55, jitter: 0 }]], boss: [['grunt', { vol: 0.65, rate: 0.85 }]],
    fumble: [0, 0.32, 0.72, 1.2].map(d => ['fumble', { vol: 0.5, delay: d }]), ok: [['ok', { vol: 0.5 }]], ng: [['ng', { vol: 0.5 }]],
  }
  Snd.sfx = function (n) {
    if (!this.ctx) return
    for (const [k, o] of CUE[n] || []) this.play(k, o)
    this.played[n] = (this.played[n] || 0) + 1
  }
  // 曲は入れない（録音の曲で合う物が無い）。深夜の店は冷蔵庫のうなりと外の通りだけ
  Snd.setTrack = function (t) {
    this.track = t; if (t) this.played['bgm:' + t] = (this.played['bgm:' + t] || 0) + 1
    this.loop('amb', t === 'dawn' ? null : HUM, t === 'bad' ? 0.3 : 0.2, 1)
    this.loop('bed', STREET, t === 'dawn' ? 0.22 : 0.07, 1)
    if (t === 'dawn' && this.ctx) { this.play('crow', { vol: 0.6, room: 0.5 }); this.play('crow', { vol: 0.4, delay: 0.8, rate: 0.92, room: 0.5 }) }
  }
  Snd.tick = function () { if (this.track === 'bad' && this.ctx && this.loops.amb && this.loops.amb.node) this.loops.amb.node.playbackRate.setTargetAtTime(0.82, this.now(), 0.5) }
})()
