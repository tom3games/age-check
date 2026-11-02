// 身分証の絵（Canvas 2D）。種類: license / student / techo / paper / leaf / tegata / crayon / shain / passport
const F = '"Zen Kaku Gothic New","Hiragino Sans",sans-serif', M = '"Shippori Mincho B1","Hiragino Mincho ProN",serif'
const KANJI = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
// 和暦（境目の日付は細かく見ない。ゲームに出る年だけ正しければよい）
export function wareki(y, en) {
  const [era, e, b] = y >= 2019 ? ['令和', 'Reiwa', 2018] : y >= 1989 ? ['平成', 'Heisei', 1988] : y >= 1927 ? ['昭和', 'Showa', 1925] : y >= 1912 ? ['大正', 'Taisho', 1911] : ['', '', 0]
  return en ? `${e} ${y - b}` : `${era}${y - b === 1 ? '元' : y - b}年`
}
const rr = (x, X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath() }
function vtext(x, s, X, Y, size, gap = 1.08) { let y = Y; for (const ch of s) { x.fillText(ch, X, y); y += size * gap } }
function photo(x, im, face, X, Y, w, h, sepia) {
  if (!im) return
  const K = im.width / 1024, cw = 330 * K, ch = cw * h / w
  x.save(); x.beginPath(); x.rect(X, Y, w, h); x.clip()
  x.fillStyle = sepia ? '#cdbb92' : '#cfd6db'; x.fillRect(X, Y, w, h)
  x.drawImage(im, face[0] * K - cw / 2, face[1] * K - ch * 0.45, cw, ch, X, Y, w, h)
  if (sepia) { x.globalCompositeOperation = 'color'; x.fillStyle = '#a0804a'; x.fillRect(X, Y, w, h); x.globalCompositeOperation = 'source-over' }
  x.restore(); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; x.strokeRect(X, Y, w, h)
}
// v: 身分証の出方（data.js の ids の1つ）、who: 写真に使う客のキー、face: 顔の中心、tx: 文言の取り出し
export function drawCard(cv, v, o) {
  const { lang, im, face, tx } = o, ja = lang === 'ja', x = cv.getContext('2d'), W = cv.width, H = cv.height
  x.clearRect(0, 0, W, H); x.textBaseline = 'alphabetic'; x.textAlign = 'left'
  const name = tx(v.name)
  if (v.kind === 'license') {
    rr(x, 10, 10, W - 20, H - 20, 28); const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#eef6ef'); g.addColorStop(1, '#d9e9e4'); x.fillStyle = g; x.fill()
    x.save(); x.clip(); x.globalAlpha = 0.08; x.strokeStyle = '#2a7a5a'; for (let i = -H; i < W; i += 14) { x.beginPath(); x.moveTo(i, 0); x.quadraticCurveTo(i + 60, H / 2, i, H); x.stroke() } x.restore()
    x.fillStyle = '#1c3a30'; x.font = `900 30px ${F}`; x.fillText(ja ? '氏名' : 'Name', 50, 80); x.font = `900 46px ${F}`; x.fillText(name, 150, 82)
    x.font = `700 30px ${F}`; x.fillText(ja ? '生年月日' : 'Born', 50, 150)
    x.font = `900 40px ${F}`; x.fillStyle = '#0d1f19'; x.fillText(ja ? `${wareki(v.y)} ${v.m}月 ${v.d}日生` : `${wareki(v.y, 1)} / ${v.m} / ${v.d}`, 200, 152)
    x.fillStyle = '#1c3a30'; x.font = `700 26px ${F}`
    x.fillText(ja ? '住所　夜見市深川町2丁目13-4' : 'Address  2-13-4 Fukagawa, Yomi', 50, 215)
    x.fillText(ja ? '交付　令和6年 3月10日' : 'Issued  Reiwa 6.3.10', 50, 265)
    x.fillStyle = '#2d7d4f'; rr(x, 50, 290, 580, 64, 10); x.fill(); x.fillStyle = '#fff'; x.font = `900 32px ${F}`; x.fillText(ja ? '令和11年 3月 8日まで有効' : 'Valid until Reiwa 11.3.8', 72, 334)
    x.fillStyle = '#1c3a30'; x.font = `800 52px ${M}`; x.fillText(ja ? '運転免許証' : "DRIVER'S LICENSE", 50, 440)
    x.font = `700 24px ${F}`; x.fillText(ja ? '第 4021 3381 7704 号' : 'No. 4021 3381 7704', 50, 490); x.fillText(ja ? '夜見県公安委員会' : 'Yomi Pref. Public Safety Comm.', 50, 560)
    photo(x, im, face, 680, 140, 260, 330)
  } else if (v.kind === 'student' || v.kind === 'techo') {
    const hs = v.kind === 'techo'
    rr(x, 10, 10, W - 20, H - 20, 26); x.fillStyle = hs ? '#f3f1e6' : '#fbfbf8'; x.fill()
    x.fillStyle = hs ? '#22305a' : '#1f3c78'; rr(x, 10, 10, W - 20, 110, 26); x.fill(); x.fillRect(10, 80, W - 20, 40)
    x.fillStyle = '#fff'; x.font = `800 46px ${M}`; x.fillText(hs ? (ja ? '夜見高等学校　生徒手帳' : 'YOMI HIGH SCHOOL HANDBOOK') : (ja ? '夜見大学　学生証' : 'YOMI UNIV. STUDENT ID'), 50, 88)
    x.fillStyle = '#1b2440'; x.font = `700 28px ${F}`
    x.fillText(hs ? (ja ? '第1学年 3組' : 'Grade 10, Class 3') : (ja ? '経済学部 経済学科' : 'Faculty of Economics'), 50, 190)
    x.fillText(ja ? '番号 25E1047' : 'No. 25E1047', 50, 240)
    x.font = `900 46px ${F}`; x.fillText(name, 50, 320)
    x.font = `900 36px ${F}`; x.fillText(hs ? (ja ? `${wareki(v.y)} ${v.m}月 ${v.d}日生` : `Born ${wareki(v.y, 1)} / ${v.m} / ${v.d}`) : (ja ? `${v.y}年 ${v.m}月 ${v.d}日生` : `Born ${v.y}.${v.m}.${v.d}`), 50, 395)
    x.font = `700 24px ${F}`; x.fillText(ja ? '有効期限 2029年3月31日' : 'Valid until 2029.3.31', 50, 470)
    if (v.fake) { x.save(); x.globalAlpha = 0.18; x.fillStyle = '#000'; for (let i = 0; i < 40; i++) x.fillRect((i * 97) % W, (i * 53) % H, 3, 3); x.restore() }
    photo(x, im, face, 690, 150, 240, 300)
  } else if (v.kind === 'shain') {
    rr(x, 10, 10, W - 20, H - 20, 26); x.fillStyle = '#fff'; x.fill()
    x.fillStyle = '#c0392b'; x.fillRect(10, 40, W - 20, 70)
    x.fillStyle = '#fff'; x.font = `900 40px ${F}`; x.fillText(ja ? '株式会社ヨミ商事　社員証' : 'YOMI TRADING CO. STAFF ID', 50, 90)
    x.fillStyle = '#222'; x.font = `700 30px ${F}`; x.fillText(ja ? '営業部 第二課' : 'Sales Dept. 2', 50, 200)
    x.font = `900 54px ${F}`; x.fillText(name, 50, 300)
    x.font = `700 26px ${F}`; x.fillText(ja ? '社員番号 0417' : 'Staff No. 0417', 50, 380)
    x.font = `700 22px ${F}`; x.fillStyle = '#888'; x.fillText(ja ? '※本証は入館用です' : '*Building access only', 50, 560)
    photo(x, im, face, 680, 150, 250, 310)
  } else if (v.kind === 'crayon') {
    x.fillStyle = '#fffdf2'; x.fillRect(20, 20, W - 40, H - 40)
    x.strokeStyle = '#e74c3c'; x.lineWidth = 8; x.setLineDash([18, 10]); x.strokeRect(34, 34, W - 68, H - 68); x.setLineDash([])
    const wob = (s, X, Y, size, col) => { x.fillStyle = col; let xx = X; for (const [i, ch] of [...s].entries()) { x.save(); x.translate(xx, Y + Math.sin(i * 1.7) * 6); x.rotate(Math.sin(i * 2.3) * 0.12); x.font = `900 ${size}px ${F}`; x.fillText(ch, 0, 0); xx += x.measureText(ch).width + 2; x.restore() } }
    wob(v.y === 2000 ? 'かっぱめんきょ' : 'おとなめんきょしょう', 70, 120, 58, '#2e86de')
    wob('なまえ ' + name, 70, 230, 46, '#222')
    wob(`${v.y}ねん うまれ`, 70, 320, 46, '#27ae60')
    wob('ほんものです', 70, 420, 40, '#e67e22')
    x.strokeStyle = '#8e44ad'; x.lineWidth = 6; x.beginPath(); x.arc(780, 260, 110, 0, 7); x.stroke()
    x.beginPath(); x.arc(745, 235, 10, 0, 7); x.arc(815, 235, 10, 0, 7); x.fillStyle = '#8e44ad'; x.fill()
    x.beginPath(); x.arc(780, 285, 45, 0.2, Math.PI - 0.2); x.stroke()
    if (v.y !== 2000) { x.fillStyle = '#222'; x.beginPath(); x.ellipse(780, 305, 60, 14, 0, 0, 7); x.fill() }
  } else if (v.kind === 'passport') {
    rr(x, 10, 10, W - 20, H - 20, 18); x.fillStyle = '#f2eee3'; x.fill()
    x.fillStyle = '#6d1f2b'; x.fillRect(10, 10, W - 20, 70)
    x.fillStyle = '#fff'; x.font = `900 38px ${F}`; x.fillText('PASSPORT / REISEPASS', 40, 58)
    x.fillStyle = '#333'; x.font = `700 20px ${F}`
    const row = (l, val, y) => { x.fillStyle = '#777'; x.font = `700 20px ${F}`; x.fillText(l, 330, y); x.fillStyle = '#111'; x.font = `900 32px ${F}`; x.fillText(val, 330, y + 36) }
    const [sur, giv] = name.split(' ')
    row('Surname / Name', sur, 130); row('Given names / Vornamen', giv || '', 210)
    row('Date of birth / Geburtsdatum', `${String(v.d).padStart(2, '0')} ${MON[v.m - 1]} ${v.y}`, 290)
    row('Nationality', 'DEUTSCH', 370)
    x.fillStyle = '#333'; x.font = `700 22px monospace`; x.fillText(`P<D<<${sur}<<${giv}<<<<<<<<<<<<<<<<<<<<`.slice(0, 44), 40, 560); x.fillText(`C01X00T47<4D<<${String(v.y).slice(2)}0${v.m}${v.d}5M<<<<<<<<<<<<<<`.slice(0, 44), 40, 595)
    photo(x, im, face, 50, 110, 240, 300)
    if (!ja) { } else { x.fillStyle = '#6d1f2b'; x.font = `700 22px ${F}`; x.fillText('生年月日は「日 月 年」の順', 330, 470) }
  } else if (v.kind === 'paper') {
    x.fillStyle = '#d9c79c'; x.fillRect(30, 20, W - 60, H - 40)
    x.globalAlpha = 0.25; for (let i = 0; i < 60; i++) { x.fillStyle = i % 2 ? '#8a6d3b' : '#f1e3bf'; x.beginPath(); x.arc((i * 137) % W, (i * 91) % H, 20 + (i * 7) % 60, 0, 7); x.fill() } x.globalAlpha = 1
    x.fillStyle = '#2b1d10'; x.font = `800 64px ${M}`; x.textAlign = 'center'
    vtext(x, '身分證明書', 880, 110, 64); x.font = `800 76px ${M}`; vtext(x, name, 760, 150, 76)
    x.font = `600 50px ${M}`; vtext(x, '大正十五年七月七日生', 640, 90, 50, 1.02)
    x.textAlign = 'left'; if (!ja) { x.font = `700 26px ${F}`; x.fillText('ID paper / born Taisho 15, July 7', 60, H - 50) }
    photo(x, im, face, 90, 120, 230, 290, true)
    x.fillStyle = 'rgba(160,30,20,.7)'; x.beginPath(); x.arc(470, 470, 60, 0, 7); x.fill()
  } else if (v.kind === 'leaf') {
    x.fillStyle = '#2f6e3a'; x.beginPath(); x.ellipse(W / 2, H / 2, W / 2 - 20, H / 2 - 14, 0, 0, 7); x.fill()
    x.strokeStyle = 'rgba(200,240,190,.35)'; x.lineWidth = 4; for (let a = 0; a < 6.28; a += 0.4) { x.beginPath(); x.moveTo(W / 2, H / 2); x.lineTo(W / 2 + Math.cos(a) * (W / 2 - 30), H / 2 + Math.sin(a) * (H / 2 - 20)); x.stroke() }
    x.fillStyle = '#0f1f10'; x.textAlign = 'center'; x.font = `800 70px ${M}`
    vtext(x, '河童', 700, 130, 70); vtext(x, '川太郎', 590, 130, 70); x.font = `800 54px ${M}`; vtext(x, '寛政十年', 420, 140, 54); vtext(x, '午年生', 330, 170, 54)
    if (!ja) { x.font = `700 28px ${F}`; x.fillStyle = '#e8f5e0'; x.fillText('Kawataro / born Kansei 10 (1798), Horse', W / 2, H - 48) }
    x.textAlign = 'left'
  } else if (v.kind === 'tegata') {
    const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#7a4f2a'); g.addColorStop(0.5, '#9a6a3c'); g.addColorStop(1, '#6e4524')
    x.fillStyle = g; rr(x, 250, 20, 500, H - 40, 30); x.fill()
    x.strokeStyle = 'rgba(40,20,5,.35)'; x.lineWidth = 2; for (let i = 0; i < 18; i++) { x.beginPath(); x.moveTo(260, 40 + i * 32); x.bezierCurveTo(400, 30 + i * 33, 600, 50 + i * 31, 740, 40 + i * 32); x.stroke() }
    x.fillStyle = '#1a0d04'; x.textAlign = 'center'; x.font = `800 72px ${M}`
    vtext(x, '通行手形', 610, 120, 72); x.font = `800 64px ${M}`; vtext(x, name, 500, 150, 64); x.font = `800 52px ${M}`; vtext(x, '享保元年生', 400, 120, 52)
    if (!ja) { x.font = `700 26px ${F}`; x.fillStyle = '#fff'; x.fillText('Travel pass / born Kyoho 1 (1716)', W / 2, H - 4) }
    x.textAlign = 'left'
  }
}
export { KANJI }
