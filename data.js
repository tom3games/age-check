// 年齢確認 v2 — 文言と客のデータ（日英）。客の手がかり(hs)の座標は元絵 1024x1536 の座標
// 夜は 2026年11月1日(日) 0:00〜5:00（ハロウィン明け）。2006年11月1日以前の生まれなら20歳以上
// v2: 売上ノルマ・行列・偽物/借り物の身分証・客ごとの身分証の出方が毎回変わる（ids の中から1つ）
window.AC = (() => {
  const T = (ja, en) => ({ ja, en })
  const UI = {
    ja: {
      title: '年齢確認', sub: '深夜0時、コンビニのレジ', start: 'シフトに入る', howto: '遊び方', mute: '音',
      ask: '質問', id: '身分証', sell: '売る', refuse: '断る', back: 'もどる', close: '閉じる', sheet: '早見表', skip: 'とばす', next: 'つぎへ',
      complaints: 'クレーム', sales: '売上', quota: '目標', posAsk: '20歳以上ですか？', posYes: 'はい', date: '11月1日(日)',
      q: { birth: '生年月日は？', eto: '干支は？', name: 'お名前は？', trend: '子どもの頃の流行りは？', job: 'お仕事は？' },
      tut: { look: n => n ? '気になる所をタップして、よく見よう' : '気になる所をクリックして、よく見よう', ask: '身分証は偽物もある。質問で照らし合わせよう', decide: '時間は止まらない。行列に注意' },
      nothing: '特に変わったところはない', noIdNote: '身分証は出てこない', fumble: '財布をごそごそ…',
      save: '画像を保存', post: 'Xでポスト', again: 'もう一回', toTitle: 'タイトル', check: '答え合わせ', toSlip: '給料明細へ',
      endStop: '営業停止', endFired: 'クビ', endQuota: 'ノルマ未達',
      howtoBody: [
        '深夜のコンビニで、酒とタバコを買いに来た客をさばく。朝5時までに売上の目標に届かせる。',
        '20歳未満に売ってバレたら営業停止。大人を断るとクレーム。3回でクビ。',
        '身分証には偽物・借り物がある。名前・生年月日・干支を聞いて、身分証と食い違わないか確かめよう。',
        '時間は止まらない。身分証を出させると時間がかかり、行列の客は待ちくたびれて帰る。',
        '客をタップすると、その場所をよく見られる。肌・髪・服・持ち物に手がかりがある。',
      ],
      sheetBody: { line: '2006年（平成18年）11月1日\n以前の生まれ → 20歳以上', era: '昭和◯年 = 1925+◯\n平成◯年 = 1988+◯\n大正◯年 = 1911+◯', eto: '干支（12年でひとまわり）', trend: '子どもの頃の流行り（小学生の時に夢中だった物）', trends: [['たまごっち', '1996年発売'], ['ニンテンドーDS', '2004年発売'], ['妖怪ウォッチ', '2014年アニメ'], ['鬼滅の刃', '2019年アニメ']] },
      etoNames: ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'],
      boss: '店長', series: '深夜のコンビニ', name: '夜勤バイト　様', job: '深夜レジ',
      hash: '#年齢確認ゲーム', you: { sell: '売った', refuse: '断った', rage: 'キレて帰った', left: '待たせて帰った' }, ok: '正解', ng: 'まちがい', real: n => `実年齢 ${n}歳`,
    },
    en: {
      title: 'AGE CHECK', sub: 'Midnight. Convenience store register.', start: 'Start shift', howto: 'How to play', mute: 'Sound',
      ask: 'Ask', id: 'ID', sell: 'Sell', refuse: 'Refuse', back: 'Back', close: 'Close', sheet: 'Cheat sheet', skip: 'Skip', next: 'Next',
      complaints: 'Complaints', sales: 'Sales', quota: 'Goal', posAsk: 'Are you 20 or older?', posYes: 'Yes', date: 'Sun, Nov 1',
      q: { birth: 'Date of birth?', eto: 'Zodiac animal?', name: 'Your name?', trend: 'What was big when you were a kid?', job: 'What do you do?' },
      tut: { look: n => n ? 'Tap anything suspicious to look closer' : 'Click anything suspicious to look closer', ask: 'IDs can be fake. Cross-check with questions', decide: 'Time keeps moving. Watch the line' },
      nothing: 'Nothing unusual here', noIdNote: 'No ID comes out', fumble: 'Rummaging in the wallet...',
      save: 'Save image', post: 'Post on X', again: 'Again', toTitle: 'Title', check: 'Answers', toSlip: 'See payslip',
      endStop: 'SHUT DOWN', endFired: 'FIRED', endQuota: 'MISSED GOAL',
      howtoBody: [
        'Run the night register. Reach the sales goal by 5 a.m.',
        'Sell to anyone under 20 and get caught: the store is shut down. Refusing adults brings complaints. 3 complaints: fired.',
        'IDs can be fake or borrowed. Ask name, birthday and zodiac, and check they match the card.',
        'Time never stops. Checking IDs takes time, and people in line get tired and leave.',
        'Tap a customer to look closely. Skin, hair, clothes and belongings hold clues.',
      ],
      sheetBody: { line: 'Born on or before\nNov 1, 2006 → 20 or older', era: 'Showa N = 1925+N\nHeisei N = 1988+N\nTaisho N = 1911+N', eto: 'Zodiac (12-year cycle)', trend: 'Childhood crazes (loved in elementary school)', trends: [['Tamagotchi', '1996'], ['Nintendo DS', '2004'], ['Yo-kai Watch', '2014 anime'], ['Demon Slayer', '2019 anime']] },
      etoNames: ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Boar'],
      boss: 'Manager', series: 'MIDNIGHT STORE', name: 'Night-shift temp', job: 'Night register',
      hash: '#AgeCheckGame', you: { sell: 'Sold', refuse: 'Refused', rage: 'Stormed out', left: 'Left (waited)' }, ok: 'Right', ng: 'Wrong', real: n => `Real age ${n}`,
    },
  }
  const ETO_BASE = 1996

  const BOSS = [
    T('深夜の店番、よろしく。今夜の売上目標はこれや', 'Thanks for the night shift. Here is tonight\'s sales goal.'),
    T('酒とタバコは、20歳未満に売ったらアカン。バレたら営業停止や', 'No alcohol or cigarettes under 20. Get caught and we\'re shut down.'),
    T('でも大人を断ったらクレームや。3回でクビ', 'But refuse adults and they complain. Three and you\'re out.'),
    T('身分証は偽物も借り物もある。名前と干支、聞いて照らし合わせ', 'IDs can be fake or borrowed. Ask name and zodiac, compare.'),
    T('終電のあとと2時ごろは行列や。待たせたら帰られるで', 'Lines form after the last train and around 2. Make them wait and they leave.'),
    T('……あと、人間やない客も来る。20歳超えてたら売ってええ', '...Some customers aren\'t human. Over 20 is over 20.'),
  ]

  const ITEMS = {
    cup: { img: 'i_cup', n: T('ワンカップ', 'Cup sake'), p: 260 },
    strong: { img: 'i_strong', n: T('ストロング缶', 'Strong chu-hi'), p: 198 },
    beer: { img: 'i_beer', n: T('缶ビール', 'Beer'), p: 238 },
    tabako: { img: 'i_tabako', n: T('タバコ 14番', 'Cigarettes #14'), p: 600 },
    sake: { img: 'i_sake', n: T('日本酒 四合瓶', 'Sake bottle'), p: 1480 },
    highball: { img: 'i_highball', n: T('ハイボール缶', 'Highball can'), p: 218 },
  }

  // 身分証の種類: license 免許 / student 学生証 / techo 生徒手帳 / paper 古い紙 / leaf ハスの葉 / tegata 手形 / crayon 手作り / shain 社員証（生年月日なし）/ passport
  // fake: 偽物・借り物（画面には出さない。答え合わせ用） / why: 見抜く決め手（答え合わせで出す）
  // a: その出方の時だけ答えが変わる分
  const C = [
    { k: 'c_a', claim: [1954, '午'], angry: 'c_a_x', minor: false, age: 72, item: 'cup', n: 1, pat: 3, idCost: 9, plain: true,
      hello: T('ワンカップ、ひとつ', 'One cup sake.'),
      a: { birth: T('昭和29年3月10日じゃ', 'Showa 29, March 10.'), eto: T('午じゃ', 'Horse.'), name: T('源田じゃ', 'Genda.'), trend: T('ベーゴマじゃな', 'Spinning tops.'), job: T('年金暮らしじゃ', 'Retired.') },
      ids: [{ none: true, why: T('しわ・シミ・白髪。身分証を求めるだけで怒る', 'Wrinkles, spots, white hair. Asking for ID is an insult') }],
      noId: T('どう見ても20歳以上じゃろが！', 'Do I look under 20 to you?!'),
      sell: T('……ふん。ありがとさん', 'Hmph. Thanks.'), refuse: T('なんで売らんのじゃ！', 'Why won\'t you sell?!'), rage: T('年寄りをバカにしおって！', 'You mock an old man?!'),
      hs: [[503, 400, 150, T('深いしわと、ほおのシミ。白い無精ひげ', 'Deep wrinkles, age spots, white stubble')], [503, 200, 110, T('真っ白で、うすい髪', 'Thin, pure white hair')], [520, 1180, 170, T('がま口の財布。手の甲にもシミ', 'Old coin purse. Spots on his hands')], [250, 860, 150, T('色あせた作業着', 'A faded work jacket')]] },

    { k: 'c_b', claim: [1998, '寅'], minor: false, age: 28, item: 'strong', n: 3, pat: 4, idCost: 1,
      hello: T('これ3本、お願いしまーす', 'These three, please.'),
      a: { birth: T('平成10年7月21日', 'Heisei 10, July 21.'), eto: T('寅！がおー', 'Tiger! Rawr.'), name: T('加藤真央でーす', 'Mao Kato.'), trend: T('DS！めっちゃやった', 'DS! Played it nonstop.'), job: T('OL。これコスプレね', 'Office job. This is a costume.') },
      ids: [
        { none: true, why: T('目の下のくま・大人のメイク・車のキー・衣装の値札', 'Dark circles, grown-up makeup, car key, costume price tag') },
        { kind: 'license', name: T('加藤 真央', 'Mao Kato'), y: 1998, m: 7, d: 21, why: T('免許の写真・名前・干支が全部合う', 'Photo, name and zodiac all match') },
      ],
      noId: T('財布、友達の車の中なんよ…', 'My wallet is in my friend\'s car...'), idLine: T('はいはい、免許', 'Sure, license.'),
      sell: T('ありがと！おつかれー', 'Thanks! Hang in there.'), refuse: T('えー、28なんやけど…', 'Seriously? I\'m 28...'), rage: T('もうええわ、他で買う！', 'Forget it, I\'ll go elsewhere!'),
      hs: [[542, 433, 140, T('目の下にくま。くずれかけた大人のメイク', 'Dark circles. Fading grown-up makeup')], [482, 160, 120, T('ハロウィンのネコ耳', 'Halloween cat ears')], [811, 800, 140, T('長いジェルネイル。割れたスマホ', 'Long gel nails. Cracked phone')], [802, 1185, 100, T('手首に車のキー', 'Car key on her wrist')], [450, 1000, 170, T('テカテカの安いセーラー服。衣装だ', 'Shiny cheap sailor uniform. A costume')]] },

    { k: 'c_c', claim: [2001, '辰'], minor: true, age: 17, item: 'tabako', n: 1, pat: 4, idCost: 1,
      hello: T('じゅ、14番ひとつ', 'N-number 14, one.'),
      a: { birth: T('へ、平成13年…っす', 'H-Heisei 13...'), eto: T('えっと…辰？っす', 'Uh... Dragon?'), name: T('高橋っす', 'Takahashi.'), trend: T('鬼滅っす！…あ', 'Demon Slayer! ...oops'), job: T('営業っす', 'Sales.') },
      ids: [
        { none: true, why: T('平成13年なら巳年。辰と答えた。流行りが鬼滅', 'Heisei 13 is Snake, not Dragon. Childhood craze: Demon Slayer') },
        { kind: 'shain', name: T('高橋 翔', 'Sho Takahashi'), why: T('社員証に生年月日は無い。年齢の証明にならない', 'A work badge has no birth date. Not proof of age') },
        { kind: 'license', name: T('佐野 正和', 'Masakazu Sano'), y: 1981, m: 10, d: 3, photo: 'c_k', fake: true, claim: [1981, '未'], idLine: T('と、父ちゃんの…いや、俺のっす', 'M-my dad\'s... I mean, mine.'), a: { name: T('さ、佐野…っす', 'S-Sano...'), birth: T('しょ、昭和…56年っす', 'Sh-Showa... 56'), eto: T('…ひつじ？っす', '...Goat?') }, why: T('免許の写真は45歳のおじさん（父）。干支もちがう', 'The photo is a 45-year-old man (his dad). Wrong zodiac too') },
      ],
      noId: T('か、会社に置いてきたっす', 'L-left it at the office.'), idLine: T('社員証っす！', 'Work badge!'),
      sell: T('…っしゃ', '...Yes.'), refuse: T('…っす', '...Okay.'), rage: T('もういいっす！', 'Never mind!'),
      detect: T('10分後、警官が来た。「スーツの子、補導しました。高校2年です」', 'Ten minutes later, police: "That kid in the suit? 11th grader."'),
      hs: [[496, 400, 130, T('おでことあごにニキビ。うっすら産毛のひげ', 'Pimples. Just peach fuzz above the lip')], [800, 740, 150, T('スーツの肩が大きすぎる', 'Suit shoulders far too wide')], [513, 1110, 150, T('袖が手にかぶる。マジックテープの財布', 'Sleeves cover his hands. Velcro wallet')], [513, 815, 90, T('ゆるくて曲がったネクタイ', 'Loose, crooked tie')], [496, 180, 110, T('校則みたいな短い黒髪', 'School-rule haircut')]] },

    { k: 'c_d', claim: [2002, '午'], minor: false, age: 24, item: 'beer', n: 2, pat: 6, idCost: 0,
      hello: T('これ、お願いします', 'These, please.'),
      a: { birth: T('平成14年5月14日です', 'Heisei 14, May 14.'), eto: T('午です', 'Horse.'), name: T('佐倉小春です', 'Koharu Sakura.'), trend: T('妖怪ウォッチ。中1でハマってました', 'Yo-kai Watch, in 7th grade.'), job: T('看護師です。夜勤明けで', 'Nurse. Just off nights.') },
      ids: [
        { kind: 'license', name: T('佐倉 小春', 'Koharu Sakura'), y: 2002, m: 5, d: 14, why: T('童顔だが免許・名前・干支が全部合う', 'Baby face, but license, name and zodiac all match') },
        { none: true, why: T('荒れた手・病院の名札・ペンライト。夜勤明けの看護師', 'Chapped hands, hospital badge, penlight. A nurse off night shift') },
        { kind: 'hoken', name: T('佐倉 小春', 'Koharu Sakura'), y: 2002, m: 5, d: 14, idLine: T('免許なくて…保険証でいいですか', 'No license... will my health card do?'), why: T('保険証に写真は無いが、名前・生年月日・干支が全部合う', 'No photo, but name, birth date and zodiac all match') },
      ],
      noId: T('病院のロッカーに置いてきちゃって…', 'I left it in my locker at the hospital...'), idLine: T('よく言われます…どうぞ', 'I get that a lot... here.'),
      sell: T('ありがとうございます', 'Thank you.'), refuse: T('…24なんですけど', '...I\'m 24.'), rage: T('もう、いいです', 'Never mind.'),
      hs: [[528, 433, 140, T('化粧っ気なし。目の下に濃いくま', 'No makeup. Heavy dark circles')], [440, 1020, 130, T('手が赤く荒れている。何度も洗った手', 'Red, chapped hands. Washed too often')], [719, 927, 80, T('胸にペンライト', 'A penlight on her chest')], [470, 740, 75, T('首から名札。病院のストラップ', 'A hospital staff lanyard')], [294, 624, 90, T('フードにクマの耳', 'Bear ears on the hood')]] },

    { k: 'c_e', claim: [2006, '戌'], minor: true, age: 19, item: 'highball', n: 1, pat: 4, idCost: 1,
      hello: T('これで。袋いらないっす', 'This. No bag.'),
      a: { birth: T('平成18年…3月っす', 'Heisei 18... March.'), eto: T('戌っす', 'Dog.'), name: T('宮田っす', 'Miyata.'), trend: T('妖怪ウォッチっすね', 'Yo-kai Watch.'), job: T('大学2年っす', 'College sophomore.') },
      ids: [
        { kind: 'student', name: T('宮田 拓海', 'Takumi Miyata'), y: 2007, m: 1, d: 15, coached: true, why: T('学生証は2007年生まれ＝19歳。言った年と違う', 'Student ID says 2007 = 19. Not what he said') },
        { kind: 'student', name: T('宮田 拓海', 'Takumi Miyata'), y: 2006, m: 2, d: 30, fake: true, coached: true, why: T('2月30日は存在しない。手作りの学生証', 'February 30 doesn\'t exist. A forged ID') },
        { kind: 'student', name: T('宮田 拓海', 'Takumi Miyata'), y: 2006, m: 4, d: 3, minor: false, age: 20, detect: null, a: { birth: T('平成18年4月3日っす', 'Heisei 18, April 3.'), job: T('大学3年っす', 'College junior.') }, why: T('この夜は本当に20歳。学生証も名前も干支も合う', 'Tonight he really is 20. ID, name and zodiac all match') },
      ],
      noId: T('家に置いてきたっす', 'Left it at home.'), idLine: T('学生証でいいっすか', 'Student ID okay?'),
      sell: T('あざっす', 'Thanks.'), refuse: T('え、なんで？', 'Wait, why?'), rage: T('うざ。もういいわ', 'Ugh. Forget it.'),
      detect: null,
      hs: [[525, 416, 130, T('つるつるの肌。眉は細く整えてある', 'Smooth skin. Trimmed brows')], [508, 240, 110, T('明るい茶色に染めた髪', 'Light brown dyed hair')], [386, 477, 60, T('ワイヤレスイヤホン', 'Wireless earbuds')], [742, 953, 90, T('大学のロゴ入りパーカー', 'A college hoodie')], [430, 1000, 130, T('スマホを握っている', 'Gripping a phone')]] },

    { k: 'c_f', claim: [2004, '申'], minor: true, age: 18, item: 'strong', n: 1, pat: 6, idCost: 0,
      hello: T('これ、お願いします', 'This, please.'),
      a: { birth: T('平成16年…6月です', 'Heisei 16... June.'), eto: T('申です', 'Monkey.'), name: T('佐々木です', 'Sasaki.'), trend: T('…妖怪ウォッチです', '...Yo-kai Watch.'), job: T('フリーターです', 'Part-timer.') },
      ids: [
        { none: true, coached: true, why: T('すっぴんの若い肌、バッジにカメラのレンズ。身分証なしの18歳の覆面調査員', 'Young skin, a lens in the badge. An 18-year-old mystery shopper with no ID') },
        { kind: 'license', name: T('佐々木 結衣', 'Yui Sasaki'), y: 2004, m: 6, d: 12, minor: false, age: 22, detect: null, idLine: T('はい、免許です', 'Here is my license.'), a: { birth: T('平成16年6月12日です', 'Heisei 16, June 12.'), job: T('…調査のお仕事です', '...Research work.') }, why: T('この夜は22歳の調査員。免許・名前・干支が合う。確かめてから売れば合格', 'Tonight a 22-year-old shopper. License, name, zodiac match. Check, then sell') },
      ],
      noId: T('持ってないです', 'I don\'t have any.'),
      sell: T('…ありがとうございました', '...Thank you very much.'), refuse: T('…はい。ありがとうございます', '...Understood. Thank you.'), rage: T('…失礼します', '...Excuse me.'),
      detect: T('電話が鳴った。本部「覆面調査です。18歳の調査員に販売しましたね」', 'Phone rings. HQ: "Mystery shopper. You sold to our 18-year-old."'),
      hs: [[522, 430, 140, T('すっぴん。ハリのある若い肌', 'No makeup. Very young skin')], [235, 893, 80, T('バッジの真ん中に、小さなレンズ…', 'A tiny lens in the badge...')], [539, 1196, 110, T('茶色い財布を両手で', 'Brown wallet, both hands')], [720, 1000, 150, T('きっちりボタンを留めたコート', 'Coat buttoned to the top')]] },

    { k: 'c_g', claim: [1960, '辰'], minor: true, age: 10, item: 'beer', n: 3, pat: 4, idCost: 1,
      hello: T('ビールを、くれたまえ', 'Beer, my good man.'),
      a: { birth: T('せ、1960年じゃ', 'Ni-nineteen sixty.'), eto: T('ドラゴン！', 'Dragon!'), name: T('お、おとなたろう', 'G-Grownup Taro.'), trend: T('きめつ！', 'Demon Slayer!'), job: T('しょうがくせいじゃない！', 'I\'m NOT in grade school!') },
      ids: [
        { none: true, why: T('サングラスの下は子どもの顔。コートから3本目の手', 'A child\'s face under the shades. A third hand from the coat') },
        { kind: 'crayon', name: T('おとな たろう', 'GROWNUP TARO'), y: 1960, m: 1, d: 1, fake: true, why: T('クレヨンの手作り「おとなめんきょしょう」', 'A crayon-made "grown-up license"') },
      ],
      noId: T('おとなは、いらんのじゃ', 'Grown-ups don\'t need ID.'), idLine: T('こ、これじゃ！', 'B-behold!'),
      sell: T('やった！…じゃなくて、うむ', 'Yay! ...I mean, good.'), refuse: T('くそー！にげろ！', 'Dang! Run!'), rage: T('ばーか！', 'Meanie!'),
      detect: T('駐車場で子ども2人がビールを開けた。親が通報した', 'Two kids opened beer in the parking lot. A parent called the police.'),
      hs: [[502, 450, 100, T('サングラスの下は、幼い顔', 'A child\'s face under the shades')], [537, 470, 60, T('ひげが、のりで貼ってある', 'The mustache is glued on')], [330, 1040, 100, T('袖が長すぎる。小さな手', 'Sleeves too long. Tiny hands')], [736, 1040, 100, T('小さな手', 'Tiny hands')], [572, 1196, 100, T('コートのすき間から、もう1本の手…', 'A third hand pokes out of the coat...')], [208, 700, 110, T('肩幅がやけに広い', 'Shoulders oddly wide')]] },

    { k: 'c_h', claim: [2004, '申'], angry: 'c_h_x', minor: false, age: 22, item: 'tabako', n: 2, pat: 2, idCost: 1,
      hello: T('14番、2つ', '#14. Two.'),
      a: { birth: T('平成16年2月8日や', 'Heisei 16, Feb 8.'), eto: T('申や。なんやねん', 'Monkey. What of it?'), name: T('葛城や', 'Katsuragi.'), trend: T('妖怪ウォッチやろ', 'Yo-kai Watch.'), job: T('現場や', 'Construction.') },
      ids: [
        { kind: 'license', name: T('葛城 健二', 'Kenji Katsuragi'), y: 2004, m: 2, d: 8, why: T('免許は本人。根元の黒い金髪・原付のヘルメット', 'His own license. Black roots, scooter helmet') },
        { none: true, why: T('ひげ・荒れた肌・現場仕事・原付のヘルメット。言う年と干支も合う', 'Stubble, rough skin, construction job, scooter helmet. Year and zodiac match') },
      ],
      idLine: T('チッ…ほら', 'Tch... here.'), noId: T('免許は原付のシートの中や。取ってこいってか？', 'License is under my scooter seat. You want me to go get it?'),
      sell: T('おう', 'Yeah.'), refuse: T('はぁ？殴るぞコラ', 'Huh? Want a punch?'), rage: T('なめとんのかコラァ！', 'You messing with me?!'),
      hs: [[506, 260, 110, T('金髪。根元が2cmくらい黒い', 'Bleached. 2 cm of black roots')], [593, 367, 60, T('眉にピアス', 'Eyebrow piercing')], [506, 450, 130, T('肌が荒れている。にらんでくる', 'Rough skin. Glaring')], [482, 736, 100, T('金のネックレス', 'Gold chain')], [794, 1144, 140, T('原付のヘルメット', 'Scooter helmet')]] },

    { k: 'c_i', claim: [1926, '寅'], minor: false, age: 100, ghost: true, item: 'sake', n: 1, pat: 9, idCost: 0,
      hello: T('……これを……', '......this......'),
      a: { birth: T('大正……十五年……', 'Taisho... fifteen...'), eto: T('……寅……', '...tiger...'), name: T('……志津……', '...Shizu...'), trend: T('……おはじき……', '...marbles...'), job: T('ずっと……ここに……', 'Always... here...') },
      ids: [{ kind: 'paper', name: T('志津', 'Shizu'), y: 1926, m: 7, d: 7, why: T('大正15年生まれ＝100歳。防犯カメラには映っていない', 'Born Taisho 15 = 100. Not on the security camera') }],
      idLine: T('……どうぞ……', '......here......'),
      sell: T('……ありがとう……', '......thank you......'), refuse: T('……うらめしい……', '......I resent you......'), rage: T('……', '......'),
      hs: [[560, 420, 120, T('ぬれた髪のすき間から、片目だけ', 'One eye through wet hair')], [522, 1126, 150, T('黄ばんだ古い紙', 'Old yellowed paper')], [380, 1170, 95, T('灰色の、冷たそうな手', 'Grey, cold-looking hands')], [808, 936, 130, T('白い着物。ぬれている', 'A wet white robe')]] },

    { k: 'c_j', claim: [2004, '子'], minor: true, age: 15, item: 'tabako', n: 2, pat: 5, idCost: 0,
      hello: T('14番、2こ', '#14, two.'),
      a: { birth: T('…平成、16年…', '...Heisei, 16...'), eto: T('ね、ねずみ？', 'R-rat?'), name: T('か、葛城…けんじ', 'K-Katsuragi... Kenji'), trend: T('鬼滅！', 'Demon Slayer!'), job: T('…おつかい', '...An errand.') },
      ids: [
        { kind: 'license', name: T('葛城 健二', 'Kenji Katsuragi'), y: 2004, m: 2, d: 8, photo: 'c_h', fake: true, why: T('免許の写真は金髪の別人（兄）。干支もちがう', 'The photo is someone else (his brother). Wrong zodiac too') },
        { none: true, why: T('ひげのない丸い顔、メモ「14番 2こ」。兄のおつかい', 'Round beardless face, a note "#14 x2". An errand for his brother') },
      ],
      noId: T('兄ちゃんのおつかいやねん', 'It\'s for my brother.'), idLine: T('こ、これ', 'H-here.'),
      sell: T('よっしゃ', 'Sweet.'), refuse: T('兄ちゃんに怒られる…', 'My brother\'s gonna kill me...'), rage: T('もうええわ！', 'Forget it!'),
      detect: T('中学生の母親から電話。「うちの子にタバコ売ったでしょ」', 'A mother calls: "You sold cigarettes to my 15-year-old!"'),
      hs: [[511, 381, 130, T('まん丸の顔。ひげは生えていない', 'Round face. No stubble at all')], [503, 190, 110, T('坊主頭', 'Buzz cut')], [338, 893, 110, T('メモに「14番 2こ」', 'A note: "#14 x2"')], [728, 866, 110, T('免許証くらいのカード', 'A license-sized card')], [250, 1150, 130, T('ぶかぶかの黒いパーカー', 'Baggy black hoodie')]] },

    { k: 'c_k', claim: [1981, '酉'], angry: 'c_k_x', minor: false, age: 45, item: 'beer', n: 2, pat: 3, idCost: 2,
      hello: T('ビール！もう2本だけ！', 'Beer! Just two more!'),
      a: { birth: T('昭和56年や〜', 'Showa 56~'), eto: T('酉や！コケコッコー', 'Rooster! Cock-a-doodle!'), name: T('佐野や！部長や！', 'Sano! I\'m a manager!'), trend: T('たまごっち、妹のやつで遊んだわ', 'Tamagotchi, my sister\'s.'), job: T('接待帰りや…', 'Client dinner...') },
      ids: [
        { none: true, why: T('真っ赤な顔・うすい頭・二重あご。財布を落とした酔っぱらい', 'Red face, thinning hair, double chin. A drunk who lost his wallet') },
        { kind: 'license', name: T('佐野 正和', 'Masakazu Sano'), y: 1981, m: 10, d: 3, why: T('免許は本人。でも求めるだけで怒る', 'His own license, but asking annoys him') },
      ],
      noId: T('財布落としてん！スマホで払う！', 'Lost my wallet! I\'ll pay by phone!'), idLine: T('ほれ！見てみぃ！', 'There! Look!'),
      sell: T('ありがとう！がんばりや！', 'Thanks! Keep it up!'), refuse: T('客を疑うんか！', 'You doubt your customer?!'), rage: T('45のおっさんに何言うとんねん！', 'I\'m 45, you idiot!'),
      hs: [[516, 400, 140, T('真っ赤な顔。ほうれい線と二重あご', 'Red face. Laugh lines, double chin')], [499, 190, 120, T('うすくなった頭。こめかみに白髪', 'Thinning top. Grey temples')], [568, 830, 100, T('ゆるめたネクタイ', 'Loosened tie')], [317, 832, 110, T('スマホ。財布は持っていない', 'A phone. No wallet')], [811, 728, 110, T('肩に背広', 'Jacket over his shoulder')]] },

    { k: 'c_l', claim: [2005, '丑'], angry: 'c_l_x', minor: true, age: 17, item: 'strong', n: 2, pat: 3, idCost: 1,
      hello: T('これ。はよして', 'These. Hurry.'),
      a: { birth: T('平成17年…5月', 'Heisei 17... May.'), eto: T('え、…うし？', 'Uh... Ox?'), name: T('莉子', 'Riko.'), trend: T('鬼滅やけど', 'Demon Slayer.'), job: T('大学生やけど', 'College.') },
      ids: [
        { none: true, why: T('平成17年なら酉年。丑と答えた。流行りが鬼滅', 'Heisei 17 is Rooster, not Ox. Craze: Demon Slayer') },
        { kind: 'license', name: T('加藤 真央', 'Mao Kato'), y: 1998, m: 7, d: 21, photo: 'c_b', fake: true, why: T('免許は別人（友達の姉）。名前を聞くと「莉子」', 'The license is someone else\'s. She says her name is Riko') },
        { kind: 'license', name: T('松本 莉子', 'Riko Matsumoto'), y: 2006, m: 3, d: 9, minor: false, age: 20, detect: null, claim: [2006, '戌'], idLine: T('はい。もう20やし', 'Here. I\'m 20 now.'), a: { birth: T('平成18年3月9日', 'Heisei 18, March 9.'), eto: T('戌やけど', 'Dog.'), trend: T('妖怪ウォッチ', 'Yo-kai Watch.'), job: T('ネイリスト', 'Nail artist.') }, why: T('この夜は本当に20歳。免許・名前・干支が全部合う', 'Tonight she really is 20. License, name and zodiac all match') },
      ],
      noId: T('免許まだ取って…あ、家', 'Haven\'t got my license ye- I mean, at home.'), idLine: T('…はい', '...Here.'),
      sell: T('どうも', 'Thanks.'), refuse: T('は？意味わからん', 'Huh? Unbelievable.'), rage: T('うっざ！もうええわ！', 'So annoying! Forget it!'),
      detect: T('公園で補導された女子高生のレシートから、店がバレた', 'Police found our receipt on a high schooler in the park.'),
      hs: [[537, 400, 120, T('濃いメイク。でも、ほおはふっくら', 'Heavy makeup. Still chubby cheeks')], [529, 454, 60, T('風船ガム', 'Bubble gum')], [329, 815, 120, T('プリクラと、スマホの裏に定期券', 'Photo stickers. A commuter pass')], [693, 1161, 90, T('手首に紺のシュシュ', 'A navy scrunchie on her wrist')], [407, 468, 70, T('大きいフープピアス', 'Big hoop earrings')]] },

    { k: 'y_kappa', claim: [1798, '午'], yokai: true, minor: false, age: 228, item: 'cup', n: 2, pat: 5, idCost: 0,
      hello: T('酒をくれんか。2つじゃ', 'Sake, please. Two.'),
      a: { birth: T('寛政十年じゃ', 'Kansei 10.'), eto: T('午じゃよ', 'Horse.'), name: T('川太郎じゃ', 'Kawataro.'), trend: T('相撲じゃ', 'Sumo.'), job: T('川におる', 'I live in the river.') },
      ids: [{ kind: 'leaf', name: T('河童 川太郎', 'Kawataro the Kappa'), y: 1798, m: 6, d: 1, why: T('本物の皿と水かき。寛政10年生まれ＝228歳', 'A real head dish and webbed hands. Born 1798 = 228') }],
      idLine: T('これがワシの証じゃ', 'Here is my proof.'),
      sell: T('かたじけない', 'Much obliged.'), refuse: T('228歳を子ども扱いか！', 'You treat a 228-year-old like a child?!'), rage: T('尻子玉ぬくぞ！', 'I\'ll steal your soul!'),
      hs: [[511, 200, 120, T('頭のお皿。本物で、ぬれている', 'The head dish. Real, and wet')], [511, 420, 130, T('深いしわ。年老いた目', 'Deep wrinkles. Ancient eyes')], [364, 1075, 120, T('水かきと長い爪', 'Webbed hands, long claws')], [329, 900, 90, T('自前のきゅうり', 'His own cucumber')], [797, 918, 140, T('ハスの葉。何か書いてある', 'A lotus leaf with writing')], [173, 728, 100, T('甲羅が体とつながっている', 'The shell grows from his body')]] },

    { k: 'y_kappakid', claim: [2000, '?'], minor: true, age: 14, item: 'beer', n: 1, pat: 5, idCost: 0,
      hello: T('かっぱだぞ〜。ビールください', 'I\'m a kappa~ Beer please.'),
      a: { birth: T('2000年…です', '2000...'), eto: T('かっぱ年！', 'Year of the Kappa!'), name: T('かっぱ！', 'Kappa!'), trend: T('鬼滅！', 'Demon Slayer!'), job: T('ち、ちがうし', 'N-no.') },
      ids: [
        { none: true, why: T('紙皿をゴムひもで留めている。首は普通の肌色。中学生', 'A paper plate on elastic, normal skin on the neck. A middle schooler') },
        { kind: 'crayon', name: T('かっぱ', 'KAPPA'), y: 2000, m: 4, d: 1, fake: true, why: T('クレヨンの「かっぱめんきょ」', 'A crayon "kappa license"') },
      ],
      noId: T('河童は持ってない！', 'Kappas don\'t carry ID!'), idLine: T('かっぱめんきょ！', 'Kappa license!'),
      sell: T('やったー！', 'Yesss!'), refuse: T('ちぇー', 'Aww.'), rage: T('もう帰る！', 'I\'m going home!'),
      detect: T('河童の仮装の中学生が補導された。レシートが残っていた', 'Police caught a middle schooler in a kappa costume. With our receipt.'),
      hs: [[506, 150, 110, T('紙皿をゴムひもで留めている', 'A paper plate held by elastic')], [515, 590, 90, T('あごの下に黒いゴムひも', 'Elastic strap under the chin')], [506, 420, 120, T('緑の絵の具。首は普通の肌色', 'Green paint. Normal skin on the neck')], [541, 500, 70, T('歯に矯正器具', 'Braces on his teeth')], [222, 1075, 110, T('台所用のゴム手袋', 'Kitchen rubber gloves')], [860, 1075, 110, T('台所用のゴム手袋', 'Kitchen rubber gloves')], [256, 832, 90, T('甲羅にリュックのベルト', 'The shell has backpack straps')]] },

    { k: 'y_rokuro', claim: [1716, '申'], yokai: true, neck: true, minor: false, age: 310, item: 'sake', n: 1, pat: 3, idCost: 1,
      hello: T('お酒を、ひとつ', 'One sake, please.'),
      a: { birth: T('享保元年ですの', 'Kyoho 1.'), eto: T('申ですわ', 'Monkey.'), name: T('ろく、と申します', 'I am Roku.'), trend: T('貝合わせですわね', 'Shell-matching games.'), job: T('首の運動を少々', 'A little neck exercise.') },
      ids: [{ kind: 'tegata', name: T('ろく', 'Roku'), y: 1716, m: 3, d: 3, why: T('首が伸びる本物の妖怪。享保元年生まれ＝310歳', 'A real yokai. Born 1716 = 310') }],
      idLine: T('手形でよろしくて？', 'Will a travel pass do?'),
      sell: T('ごきげんよう', 'Good evening.'), refuse: T('……あら', '......oh my.'), rage: T('しつこいですわね', 'How persistent.'),
      hs: [[522, 580, 110, T('首が…長い', 'The neck is... long')], [522, 400, 120, T('白い肌に紅。年がわからない', 'Pale skin, red lips. Ageless')], [530, 1126, 120, T('木の通行手形', 'A wooden travel pass')], [496, 150, 110, T('江戸の髪型', 'An Edo-era hairstyle')], [287, 970, 130, T('古い仕立ての着物', 'An old-style kimono')]] },

    { k: 'n_oldboy', claim: [1990, '卯'], minor: true, age: 16, item: 'beer', n: 2, pat: 5, idCost: 0,
      hello: T('ビール、2本で', 'Two beers.'),
      a: { birth: T('…平成2年です', '...Heisei 2.'), eto: T('…うさぎ、です', '...Rabbit.'), name: T('大森です', 'Omori.'), trend: T('鬼滅の刃ですね', 'Demon Slayer.'), job: T('…会社員です', '...Office worker.') },
      ids: [
        { none: true, why: T('老け顔だが、ジャケットの下は学校のシャツとネクタイ。流行りが鬼滅', 'Looks 35, but a school shirt and tie under the jacket. Craze: Demon Slayer') },
        { kind: 'techo', name: T('大森 剛', 'Tsuyoshi Omori'), y: 2010, m: 5, d: 20, why: T('間違えて生徒手帳を出した。2010年生まれ＝16歳', 'He handed over his school handbook by mistake: born 2010 = 16') },
      ],
      noId: T('…家に置いてきました', '...Left it at home.'), idLine: T('…あ', '...Oh.'),
      sell: T('どうも', 'Thanks.'), refuse: T('…ですよね', '...Figured.'), rage: T('…失礼します', '...Excuse me.'),
      detect: T('「老け顔の高校生がビールを持っていた」と学校から通報', 'The school reports a mature-looking high schooler with our beer.'),
      hs: [[511, 480, 130, T('ひげが濃い。目の下にくま。30代に見える', 'Heavy stubble, tired eyes. Looks 30-something')], [563, 832, 110, T('ジャケットの下は、学校のシャツとネクタイ', 'Under the jacket: a school shirt and tie')], [355, 927, 100, T('紺の手帳。校章のような金のマーク', 'A navy booklet with a gold school crest')], [260, 815, 70, T('通学かばんのベルト', 'A school bag strap')], [511, 303, 100, T('生え際が少し後退', 'Slightly receding hairline')]] },

    { k: 'n_babyface', claim: [1985, '丑'], minor: false, age: 41, item: 'beer', n: 2, pat: 6, idCost: 0,
      hello: T('これ、お願いします', 'These, please.'),
      a: { birth: T('昭和60年9月1日です', 'Showa 60, Sept 1.'), eto: T('丑です', 'Ox.'), name: T('小野雄一です', 'Yuichi Ono.'), trend: T('たまごっちですね', 'Tamagotchi.'), job: T('市役所勤めです', 'City hall.') },
      ids: [
        { kind: 'license', name: T('小野 雄一', 'Yuichi Ono'), y: 1985, m: 9, d: 1, why: T('高校生に見えるが41歳。結婚指輪・白髪・老眼鏡', 'Looks 17 but is 41. Wedding ring, grey hairs, reading glasses') },
        { none: true, why: T('結婚指輪・こめかみの白髪・頭に老眼鏡。流行りがたまごっち', 'Wedding ring, grey temples, reading glasses. Craze: Tamagotchi') },
      ],
      noId: T('すみません、家に忘れて…よく言われます', 'Sorry, left it at home... I get that a lot.'), idLine: T('ええ、どうぞ。慣れてます', 'Sure. I\'m used to it.'),
      sell: T('ありがとうございます', 'Thank you.'), refuse: T('41歳なんですけどね…', 'I\'m 41, you know...'), rage: T('もう結構です', 'That\'s enough.'),
      hs: [[499, 500, 130, T('童顔。でも目じりに小じわ', 'Baby face, but crow\'s feet')], [482, 208, 110, T('頭に老眼鏡', 'Reading glasses on his head')], [378, 399, 70, T('こめかみに白髪', 'Grey hairs at the temples')], [631, 1135, 60, T('左手の薬指に結婚指輪', 'A wedding ring')], [525, 979, 110, T('使い込んだ革の財布', 'A well-worn leather wallet')], [222, 1040, 100, T('お父さんっぽいカーディガン', 'A very dad cardigan')]] },

    { k: 'n_eighteen', claim: [2008, '子'], minor: true, age: 18, item: 'strong', n: 2, pat: 4, idCost: 0,
      hello: T('これ。18で成人やから', 'These. I\'m 18, so adult.'),
      a: { birth: T('平成20年4月2日！', 'Heisei 20, April 2!'), eto: T('子！', 'Rat!'), name: T('森下さくら', 'Sakura Morishita.'), trend: T('妖怪ウォッチ！', 'Yo-kai Watch!'), job: T('専門学生！成人やで', 'Vocational school! An adult!') },
      ids: [
        { kind: 'license', name: T('森下 さくら', 'Sakura Morishita'), y: 2008, m: 4, d: 2, coached: true, why: T('成人は18歳でも、お酒は20歳から。免許は本物で18歳', 'Adulthood is 18, but alcohol is 20. A real license showing 18') },
        { kind: 'license', name: T('森下 さくら', 'Sakura Morishita'), y: 2006, m: 4, d: 2, minor: false, age: 20, detect: null, claim: [2006, '戌'], hello: T('これ。もう20歳やから', 'These. I\'m 20 now.'), idLine: T('ほら！20歳やで！', 'See! I\'m 20!'), refuse: T('なんでなん！20歳やで！', 'Why?! I\'m 20!'), a: { birth: T('平成18年4月2日！', 'Heisei 18, April 2!'), eto: T('戌！', 'Dog!'), job: T('専門学校の2年！', 'Second year of vocational school!') }, why: T('この夜は20歳。免許は2006年4月生まれ', 'Tonight she is 20. License says April 2006') },
      ],
      idLine: T('ほら！成人やろ！', 'See! Adult!'),
      sell: T('ほらな！', 'Told you!'), refuse: T('なんでなん！18で成人やろ！', 'Why?! 18 is adult!'), rage: T('もうええわ！', 'Whatever!'),
      detect: T('18歳に酒を売ったと、親から店に電話', 'A parent calls: "You sold alcohol to my 18-year-old."'),
      hs: [[504, 520, 130, T('若い肌。薄いメイク', 'Young skin, light makeup')], [253, 685, 100, T('カードを誇らしげに掲げている', 'Holding a card up proudly')], [365, 433, 50, T('小さいピアス', 'Small stud earrings')], [513, 1075, 140, T('ラベンダーのパーカー', 'A lavender hoodie')]] },

    { k: 'n_tourist', claim: [1994, '?'], minor: false, age: 32, item: 'beer', n: 2, pat: 6, idCost: 0,
      hello: T('ビール、プリーズ！', 'Beer, please!'),
      a: { birth: T('1994ネン、3ガツ！', '1994, March!'), eto: T('エト？ワカラナイ！', 'Zodiac? No idea!'), name: T('ルーカスです！', 'Lukas!'), trend: T('ポケモン！DS！', 'Pokémon! DS!'), job: T('カンコウ！', 'Tourist!') },
      ids: [{ kind: 'passport', name: T('WEBER LUKAS', 'WEBER LUKAS'), y: 1994, m: 3, d: 15, why: T('パスポートは本物で32歳。干支は知らなくて当然', 'A real passport: 32. Of course he doesn\'t know his zodiac') }],
      idLine: T('パスポート、OK？', 'Passport, OK?'),
      sell: T('アリガト！', 'Arigato!'), refuse: T('Why!?', 'Why?!'), rage: T('No way!', 'No way!'),
      hs: [[509, 503, 130, T('日焼けした顔。目じりに笑いじわ', 'Sunburned face, laugh lines')], [319, 893, 120, T('えんじ色のパスポート', 'A burgundy passport')], [804, 866, 90, T('大きな登山リュック', 'A big hiking backpack')], [509, 572, 70, T('しっかりしたひげ', 'A full beard')]] },

    { k: 'y_zashiki', claim: [1624, '子'], yokai: true, minor: false, age: 402, item: 'cup', n: 1, pat: 5, idCost: 0,
      hello: T('……おさけ、ちょうだい', '...sake, please.'),
      a: { birth: T('寛永元年……', 'Kan\'ei 1...'), eto: T('……子', '...rat.'), name: T('……わらし', '...Warashi.'), trend: T('……まりつき', '...ball bouncing.'), job: T('……このおうちに、すんでる', '...I live in this house.') },
      ids: [{ none: true, why: T('座敷わらし。寛永元年（1624年）生まれ＝402歳。古い銭を持っている', 'A zashiki-warashi. Born 1624 = 402. Holding an Edo coin') }],
      noId: T('……そんなもの、ないよ', '...I don\'t have that.'),
      sell: T('……ふふ。このお店、しあわせになるよ', '...hehe. This store will be lucky.'), refuse: T('……じゃあ、出ていこうかな', '...then maybe I\'ll leave this house.'), rage: T('……', '......'),
      hs: [[515, 555, 120, T('白すぎる肌。子どもの顔なのに、目が古い', 'Too pale. A child\'s face with ancient eyes')], [411, 832, 80, T('四角い穴の古い銭', 'An old coin with a square hole')], [671, 927, 100, T('手まり', 'A temari ball')], [194, 1200, 100, T('色あせた古い着物', 'A faded old kimono')], [515, 208, 110, T('おかっぱ頭', 'An okappa bob')]] },
  ]

  const EV = {
    fired: T('店長「クレーム3回。もう来んでええ」', 'Manager: "Three complaints. Don\'t come back."'),
    quota: T('朝5時。売上が目標に届かなかった', '5 a.m. Sales fell short of the goal.'),
    dawnOk: T('朝5時。外が明るくなってきた', '5 a.m. The sky is getting light.'),
    camEmpty: T('防犯カメラには、誰も映っていない', 'The security camera shows no one.'),
    idle: T('…まだ？', '...Well?'),
    leftQueue: T('待ちくたびれた客が帰っていった', 'Someone in line gave up and left.'),
  }
  const BOSSC = {
    perfect: T('完璧や。明日も入ってくれ', 'Perfect. Come back tomorrow.'),
    ok: T('ようやった。目標達成や', 'Good job. Goal reached.'),
    sneaky: T('……さっきの大学生、ほんまに20歳やったか？', '...That college kid. Was he really 20?'),
    quota: T('売上が足りん。断りすぎや', 'Not enough sales. You refuse too much.'),
    stop: T('……店、閉めなアカンようになった', '...We have to close the store.'),
    fired: T('クレーム3回や。お疲れさん', 'Three complaints. You\'re done.'),
  }
  return { UI, ETO_BASE, BOSS, ITEMS, C, EV, BOSSC, T }
})()
