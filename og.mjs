// SNS用の画像 og.png（1200x630）。node og.mjs
import { chromium } from 'playwright'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
import { spawn } from 'node:child_process'
const srv = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '5544' } }); await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(MUTE_LAUNCH), ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 1200, height: 630 } }); await muteContext(ctx)
const p = await ctx.newPage(); await p.goto('http://localhost:5544/'); await p.waitForFunction(() => window.__acReady)
await p.evaluate(async () => { await document.fonts.load('800 150px "Shippori Mincho B1"', '年齢確認'); await document.fonts.load('900 34px "Zen Kaku Gothic New"', 'この客、20歳以上？ビールをくれたまえ深夜コンビニ推理ゲーム'); await document.fonts.load('24px DotGothic16') })
const data = await p.evaluate(async () => {
  ac.dbg.pause(true)
  const c = document.createElement('canvas'); c.width = 1200; c.height = 630; const x = c.getContext('2d')
  x.fillStyle = '#050707'; x.fillRect(0, 0, 1200, 630)
  ac.setCur('c_g'); ac.G.light = 1
  const s = 0.68, ox = 360 - 768 * s, oy = -20
  ac.drawScene(x, s, ox, oy)
  // 拡大鏡: コートのすき間の3本目の手
  const h = ac.hs('c_g').find(h => /もう1本/.test(h.ja)), R = 120, px = 560, py = 400, Z = 2.3
  x.save(); x.beginPath(); x.arc(px, py, R, 0, 7); x.clip(); ac.drawScene(x, s * Z, px - h.sx * s * Z, py - h.sy * s * Z); x.restore()
  x.strokeStyle = '#f2c94c'; x.lineWidth = 6; x.beginPath(); x.arc(px, py, R, 0, 7); x.stroke()
  x.strokeStyle = 'rgba(242,201,76,.8)'; x.lineWidth = 3; x.beginPath(); x.moveTo(ox + h.sx * s, oy + h.sy * s); x.lineTo(px - R * 0.7, py + R * 0.7); x.stroke()
  // 右の帯
  const g = x.createLinearGradient(640, 0, 900, 0); g.addColorStop(0, 'rgba(5,7,7,0)'); g.addColorStop(1, 'rgba(5,7,7,.94)'); x.fillStyle = g; x.fillRect(640, 0, 560, 630)
  x.fillStyle = 'rgba(5,7,7,.94)'; x.fillRect(900, 0, 300, 630)
  x.textAlign = 'center'; x.fillStyle = '#d9f2e6'; x.font = '24px DotGothic16'; x.fillText('NIGHT SHIFT 02:13', 960, 120)
  x.font = '800 150px "Shippori Mincho B1"'; x.fillStyle = '#f3f6f1'; x.shadowColor = 'rgba(217,242,230,.4)'; x.shadowBlur = 20
  x.fillText('年齢', 960, 290); x.fillStyle = '#e8423a'; x.fillText('確認', 960, 440); x.shadowBlur = 0
  x.fillStyle = '#fff'; x.font = '900 34px "Zen Kaku Gothic New"'; x.fillText('この客、20歳以上？', 960, 520)
  x.fillStyle = '#9aa5a0'; x.font = '700 22px "Zen Kaku Gothic New"'; x.fillText('深夜コンビニ推理ゲーム', 960, 570)
  // 吹き出し
  x.textAlign = 'left'; x.fillStyle = '#f6f7f2'; x.beginPath(); x.roundRect(40, 470, 330, 70, 16); x.fill()
  x.fillStyle = '#121617'; x.font = '900 32px "Zen Kaku Gothic New"'; x.fillText('ビールを、くれたまえ', 62, 517)
  return c.toDataURL('image/png')
})
const { writeFileSync } = await import('node:fs'); writeFileSync('og.png', Buffer.from(data.split(',')[1], 'base64'))
await b.close(); srv.kill(); console.log('og.png')
