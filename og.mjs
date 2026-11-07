// SNS用の画像 og.png（1200x630）。node og.mjs
import './mute-auto.mjs'  // テスト中は絶対に音を出さない（playwright を無音に差し替え）
import { chromium } from 'playwright'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
import { spawn } from 'node:child_process'
const srv = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '5544' } }); await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(MUTE_LAUNCH), ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 1200, height: 630 } }); await muteContext(ctx)
const p = await ctx.newPage(); await p.goto('http://localhost:5544/'); await p.waitForFunction(() => window.__acReady)
await p.evaluate(async () => { await document.fonts.load('800 150px "Shippori Mincho B1"', '年齢確認'); await document.fonts.load('900 34px "Zen Kaku Gothic New"', 'この身分証、本物？行列は待ってくれない深夜コンビニ推理ゲーム2087年から来た'); await document.fonts.load('24px DotGothic16') })
const data = await p.evaluate(async () => {
  ac.dbg.pause(true)
  const c = document.createElement('canvas'); c.width = 1200; c.height = 630; const x = c.getContext('2d')
  x.fillStyle = '#050707'; x.fillRect(0, 0, 1200, 630)
  // 新しい遊びの見せ場: 行列を背負って、未来人の手作り身分証を見ている所
  const C = k => ac.D.C.find(q => q.k === k), fut = C('n_future')
  ac.start(5, { skipBoss: true }); ac.dbg.pause(true); ac.dbg.step(30)
  ac.setCur('n_future', { v: fut.ids[1] }); ac.act('id'); ac.dbg.step(170)
  const idc = document.querySelector('#idc'); const card = document.createElement('canvas'); card.width = idc.width; card.height = idc.height; card.getContext('2d').drawImage(idc, 0, 0)
  document.querySelector('#bIdClose').click()
  ac.G.queue = ['y_tanuki', 'n_santa', 'c_k', 'n_babyface'].map(k => ({ c: C(k), v: C(k).ids[0], joinT: -10, waited: 50, state: 'wait' }))
  ac.G.light = 1
  ac.drawScene(x, 0.62, 300 - 768 * 0.62, 0)
  // 右の帯
  const g = x.createLinearGradient(540, 0, 776, 0); g.addColorStop(0, 'rgba(5,7,7,0)'); g.addColorStop(1, 'rgba(5,7,7,.95)'); x.fillStyle = g; x.fillRect(540, 0, 660, 630)
  x.fillStyle = 'rgba(5,7,7,.95)'; x.fillRect(776, 0, 424, 630)
  x.textAlign = 'center'; x.fillStyle = '#d9f2e6'; x.font = '24px DotGothic16'; x.fillText('NIGHT SHIFT 02:13', 1000, 74)
  x.font = '800 128px "Shippori Mincho B1"'; x.fillStyle = '#f3f6f1'; x.shadowColor = 'rgba(217,242,230,.4)'; x.shadowBlur = 20
  x.fillText('年齢', 1000, 205); x.fillStyle = '#e8423a'; x.fillText('確認', 1000, 335); x.shadowBlur = 0
  x.fillStyle = '#fff'; x.font = '900 34px "Zen Kaku Gothic New"'; x.fillText('この身分証、本物？', 1000, 398)
  x.fillStyle = '#9aa5a0'; x.font = '700 24px "Zen Kaku Gothic New"'; x.fillText('行列は待ってくれない', 1000, 440); x.fillText('深夜コンビニ推理ゲーム', 1000, 476)
  // 身分証（手に持って差し出された向き）
  const cw = 370, ch = cw * card.height / card.width
  x.save(); x.translate(640, 488); x.rotate(-0.07); x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = 26; x.shadowOffsetY = 10; x.drawImage(card, -cw / 2, -ch / 2, cw, ch); x.restore()
  // 吹き出し
  x.textAlign = 'left'; x.fillStyle = '#f6f7f2'; x.beginPath(); x.roundRect(28, 520, 330, 70, 16); x.fill()
  x.fillStyle = '#121617'; x.font = '900 28px "Zen Kaku Gothic New"'; x.fillText('2087年から来た', 56, 565)
  return c.toDataURL('image/png')
})
const { writeFileSync } = await import('node:fs'); writeFileSync('og.png', Buffer.from(data.split(',')[1], 'base64'))
await b.close(); srv.kill(); console.log('og.png')
