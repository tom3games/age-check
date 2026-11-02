// 年齢確認 — 文言と客のデータ（日英）。客の手がかり(hs)の座標は元絵 1024x1536 の座標
// 夜は 2026年11月1日(日) 0:00〜5:00（ハロウィンの夜明け前）。2006年11月1日以前の生まれなら20歳以上
window.AC = (() => {
  const T = (ja, en) => ({ ja, en })
  const UI = {
    ja: {
      title: '年齢確認', sub: '深夜0時、コンビニのレジ', start: 'シフトに入る', howto: '遊び方', lang: 'English', mute: '音', on: 'ON', off: 'OFF',
      ask: '質問', id: '身分証', sell: '売る', refuse: '断る', back: 'もどる', close: '閉じる', sheet: '早見表', skip: 'とばす', next: 'つぎへ',
      complaints: 'クレーム', ageItem: '年齢確認商品', posAsk: '20歳以上ですか？', posYes: 'はい', date: '11月1日(日)',
      q: { year: 'お生まれは何年ですか？', eto: '干支は何ですか？', student: '学生さんですか？', why: '今日は何の帰りですか？' },
      tut: { look: n => n ? '気になる所をタップして、よく見よう' : '気になる所をクリックして、よく見よう', ask: 'あやしければ、質問か身分証', decide: '最後に「売る」か「断る」' },
      nothing: '特に変わったところはない', noIdNote: '身分証は出てこない',
      save: '画像を保存', post: 'Xでポスト', again: 'もう一回', toTitle: 'タイトル',
      endStop: '営業停止', endFired: 'クビ', endDawn: '夜明け',
      howtoBody: [
        '深夜のコンビニで、酒とタバコを買いに来た客を見きわめる。',
        '20歳未満に売ってバレたら営業停止。大人を疑いすぎて怒らせると、クレーム。3回でクビ。',
        '客をタップすると、その場所をよく見られる。肌・髪・服・持ち物に手がかりがある。',
        '質問は4つ。生まれ年と干支が合っているか、早見表で確かめよう。身分証は聞くだけで怒る人もいる。',
        '朝5時まで乗り切れば給料が出る。',
      ],
      sheetBody: { line: '2006年（平成18年）11月1日\n以前の生まれ → 20歳以上', era: '昭和◯年 = 1925+◯\n平成◯年 = 1988+◯\n大正◯年 = 1911+◯', eto: '干支（12年でひとまわり）' },
      etoNames: ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'],
      boss: '店長', series: '深夜のコンビニ', name: '夜勤バイト　様', job: '深夜レジ',
      hash: '#年齢確認ゲーム',
    },
    en: {
      title: 'AGE CHECK', sub: 'Midnight. Convenience store register.', start: 'Start shift', howto: 'How to play', lang: '日本語', mute: 'Sound', on: 'ON', off: 'OFF',
      ask: 'Ask', id: 'ID', sell: 'Sell', refuse: 'Refuse', back: 'Back', close: 'Close', sheet: 'Cheat sheet', skip: 'Skip', next: 'Next',
      complaints: 'Complaints', ageItem: 'Age-restricted', posAsk: 'Are you 20 or older?', posYes: 'Yes', date: 'Sun, Nov 1',
      q: { year: 'What year were you born?', eto: 'What is your zodiac animal?', student: 'Are you a student?', why: 'Where are you coming from?' },
      tut: { look: n => n ? 'Tap anything suspicious to look closer' : 'Click anything suspicious to look closer', ask: 'Suspicious? Ask, or check ID', decide: 'Then Sell or Refuse' },
      nothing: 'Nothing unusual here', noIdNote: 'No ID comes out',
      save: 'Save image', post: 'Post on X', again: 'Again', toTitle: 'Title',
      endStop: 'SHUT DOWN', endFired: 'FIRED', endDawn: 'DAWN',
      howtoBody: [
        'Night shift. Decide who may buy alcohol and cigarettes.',
        'Sell to anyone under 20 and get caught: the store is shut down. Doubt adults too much and they complain. 3 complaints: fired.',
        'Tap a customer to look closely. Skin, hair, clothes and belongings hold clues.',
        'Four questions. Check if birth year and zodiac match on the cheat sheet. Some get angry just for being asked for ID.',
        'Survive until 5 a.m. to get paid.',
      ],
      sheetBody: { line: 'Born on or before\nNov 1, 2006 → 20 or older', era: 'Showa N = 1925+N\nHeisei N = 1988+N\nTaisho N = 1911+N', eto: 'Zodiac (12-year cycle)' },
      etoNames: ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Boar'],
      boss: 'Manager', series: 'MIDNIGHT STORE', name: 'Night-shift temp', job: 'Night register',
      hash: '#AgeCheckGame',
    },
  }
  // 早見表の干支: 1996年=子 から 2007年=亥
  const ETO_BASE = 1996

  // 店長のルール説明（本人指定: 最初は店長から）
  const BOSS = [
    T('深夜の店番、よろしく。ルールは3つだけや', 'Thanks for the night shift. Three rules.'),
    T('酒とタバコは、20歳未満に売ったらアカン', 'No alcohol or cigarettes for anyone under 20.'),
    T('バレたら営業停止。店も君も終わりや', 'Get caught, and the store is shut down. We are done.'),
    T('あやしい客は、よう見て、質問して、身分証や', 'Suspicious? Look closely, ask, check ID.'),
    T('でもな、大人を疑いすぎたら怒らせる', 'But doubt adults too much and they explode.'),
    T('クレーム3回でクビ。朝5時まで頼むで', '3 complaints and you are fired. Until 5 a.m.'),
    T('……あと、人間やない客も来る。気にせんでええ', '...Also, some customers are not human. Ignore it.'),
  ]

  const ITEMS = {
    cup: { img: 'i_cup', n: T('ワンカップ', 'Cup sake'), p: 260 },
    strong: { img: 'i_strong', n: T('ストロング缶', 'Strong chu-hi'), p: 198 },
    beer: { img: 'i_beer', n: T('缶ビール', 'Beer'), p: 238 },
    tabako: { img: 'i_tabako', n: T('タバコ 14番', 'Cigarettes #14'), p: 600 },
    sake: { img: 'i_sake', n: T('日本酒 四合瓶', 'Sake bottle'), p: 1480 },
    highball: { img: 'i_highball', n: T('ハイボール缶', 'Highball can'), p: 218 },
  }

  // minor: 本当に20歳未満か / pat: 怒りの上限（これを超えるとブチギレ） / idCost: 身分証を求めた時に増える怒り
  // id: 身分証（null=出せない） / detect: 売ったらバレる時の出来事（null=バレない）
  const C = [
    { k: 'c_a', angry: 'c_a_x', minor: false, item: 'cup', n: 1, pat: 2, idCost: 9,
      hello: T('ワンカップ、ひとつ', 'One cup sake.'),
      a: { year: T('昭和29年じゃ', 'Showa 29.'), eto: T('午じゃ。うま', 'Horse.'), student: T('ワシが学生に見えるか', 'Do I look like a student?'), why: T('眠れんでな。散歩じゃ', "Can't sleep. A walk.") },
      noId: T('どう見ても20歳以上じゃろが！', 'Do I look under 20 to you?!'),
      sell: T('……ふん。ありがとさん', 'Hmph. Thanks.'), refuse: T('なんで売らんのじゃ！', 'Why won\'t you sell?!'),
      rage: T('年寄りをバカにしおって！', 'You mock an old man?!'),
      hs: [[503, 400, 150, T('深いしわと、ほおのシミ。白い無精ひげ', 'Deep wrinkles, age spots, white stubble')], [503, 200, 110, T('真っ白で、うすい髪', 'Thin, pure white hair')], [520, 1180, 170, T('がま口の財布。手の甲にもシミ', 'Old coin purse. Spots on his hands')], [250, 860, 150, T('色あせた作業着', 'A faded work jacket')]] },

    { k: 'c_b', minor: false, item: 'strong', n: 3, pat: 3, idCost: 1,
      hello: T('これ3本、お願いしまーす', 'These three, please.'),
      a: { year: T('1998年でーす', '1998.'), eto: T('寅！がおー', 'Tiger! Rawr.'), student: T('これコスプレ！ハロウィン', "It's a costume! Halloween."), why: T('ハロウィンの打ち上げ帰り', 'Halloween after-party.') },
      noId: T('財布、友達の車の中なんよ…', 'My wallet is in my friend\'s car...'),
      sell: T('ありがと！おつかれー', 'Thanks! Hang in there.'), refuse: T('えー、28なんやけど…', 'Seriously? I\'m 28...'),
      rage: T('もうええわ、他で買う！', 'Forget it, I\'ll go elsewhere!'),
      hs: [[542, 433, 140, T('目の下にくま。くずれかけた大人のメイク', 'Dark circles. Fading grown-up makeup')], [482, 160, 120, T('ハロウィンのネコ耳', 'Halloween cat ears')], [811, 800, 140, T('長いジェルネイル。割れたスマホ', 'Long gel nails. Cracked phone')], [802, 1185, 100, T('手首に車のキー', 'Car key on her wrist')], [450, 1000, 170, T('テカテカの安いセーラー服。衣装だ', 'Shiny cheap sailor uniform. A costume')]] },

    { k: 'c_c', minor: true, item: 'tabako', n: 1, pat: 4, idCost: 1,
      hello: T('じゅ、14番ひとつ', 'N-number 14, one.'),
      a: { year: T('2001年っす', '2001.'), eto: T('えっと…辰？っす', 'Uh... Dragon?'), student: T('社会人っす。営業っす', 'Working. Sales.'), why: T('残業っす', 'Overtime.') },
      noId: T('か、会社に置いてきたっす', 'L-left it at the office.'),
      sell: T('…っしゃ', '...Yes.'), refuse: T('…っす', '...Okay.'),
      rage: T('もういいっす！', 'Never mind!'),
      detect: T('10分後、警官が来た。「スーツの子、補導しました。高校2年です」', 'Ten minutes later, police: "That kid in the suit? 11th grader."'),
      hs: [[496, 400, 130, T('おでことあごにニキビ。うっすら産毛のひげ', 'Pimples. Just peach fuzz above the lip')], [800, 740, 150, T('スーツの肩が大きすぎる', 'Suit shoulders far too wide')], [513, 1110, 150, T('袖が手にかぶる。マジックテープの財布', 'Sleeves cover his hands. Velcro wallet')], [513, 815, 90, T('ゆるくて曲がったネクタイ', 'Loose, crooked tie')], [496, 180, 110, T('校則みたいな短い黒髪', 'School-rule haircut')]] },

    { k: 'c_d', minor: false, item: 'beer', n: 2, pat: 4, idCost: 0,
      hello: T('これ、お願いします', 'These, please.'),
      a: { year: T('2002年です', '2002.'), eto: T('午です', 'Horse.'), student: T('いえ、看護師です', 'No, I\'m a nurse.'), why: T('夜勤明けです', 'Just off a night shift.') },
      id: { kind: 'license', name: T('佐倉 小春', 'Koharu Sakura'), y: 2002, m: 5, d: 14 },
      idLine: T('よく言われます…どうぞ', 'I get that a lot... here.'),
      sell: T('ありがとうございます', 'Thank you.'), refuse: T('…24なんですけど', '...I\'m 24.'),
      rage: T('もう、いいです', 'Never mind.'),
      hs: [[528, 433, 140, T('化粧っ気なし。目の下に濃いくま', 'No makeup. Heavy dark circles')], [440, 1020, 130, T('手が赤く荒れている。何度も洗った手', 'Red, chapped hands. Washed too often')], [719, 927, 80, T('胸にペンライト', 'A penlight on her chest')], [470, 740, 75, T('首から名札。裏返してある', 'A staff badge, flipped over')], [294, 624, 90, T('フードにクマの耳', 'Bear ears on the hood')]] },

    { k: 'c_e', minor: true, item: 'highball', n: 1, pat: 3, idCost: 1,
      hello: T('これで。袋いらないっす', 'This. No bag.'),
      a: { year: T('2006年です', '2006.'), eto: T('戌っす', 'Dog.'), student: T('大学2年っす', 'College sophomore.'), why: T('サークルの飲み会っす', 'Club party.') },
      id: { kind: 'student', name: T('宮田 拓海', 'Takumi Miyata'), y: 2007, m: 1, d: 15 },
      idLine: T('学生証でいいっすか', 'Student ID okay?'),
      sell: T('あざっす', 'Thanks.'), refuse: T('え、なんで？', 'Wait, why?'),
      rage: T('うざ。もういいわ', 'Ugh. Forget it.'),
      detect: null,
      hs: [[525, 416, 130, T('つるつるの肌。眉は細く整えてある', 'Smooth skin. Trimmed brows')], [508, 240, 110, T('明るい茶色に染めた髪', 'Light brown dyed hair')], [386, 477, 60, T('ワイヤレスイヤホン', 'Wireless earbuds')], [742, 953, 90, T('大学のロゴ入りパーカー', 'A college hoodie')], [430, 1000, 130, T('スマホを握っている', 'Gripping a phone')]] },

    { k: 'c_f', minor: true, item: 'strong', n: 1, pat: 5, idCost: 0,
      hello: T('これ、お願いします', 'This, please.'),
      a: { year: T('2004年です', '2004.'), eto: T('申です', 'Monkey.'), student: T('フリーターです', 'Part-timer.'), why: T('バイト終わりです', 'After work.') },
      noId: T('持ってないです', 'I don\'t have any.'),
      sell: T('…ありがとうございました', '...Thank you very much.'), refuse: T('…はい。ありがとうございます', '...Understood. Thank you.'),
      rage: T('…失礼します', '...Excuse me.'),
      detect: T('電話が鳴った。本部「覆面調査です。18歳の調査員に販売しましたね」', 'Phone rings. HQ: "Mystery shopper. You sold to our 18-year-old."'),
      hs: [[522, 430, 140, T('すっぴん。ハリのある若い肌', 'No makeup. Very young skin')], [235, 893, 80, T('バッジの真ん中に、小さなレンズ…', 'A tiny lens in the badge...')], [539, 1196, 110, T('茶色い財布を両手で', 'Brown wallet, both hands')], [720, 1000, 150, T('きっちりボタンを留めたコート', 'Coat buttoned to the top')]] },

    { k: 'c_g', minor: true, item: 'beer', n: 3, pat: 3, idCost: 1,
      hello: T('ビールを、くれたまえ', 'Beer, my good man.'),
      a: { year: T('せ、1960年じゃ', 'Ni-nineteen sixty.'), eto: T('ドラゴン！', 'Dragon!'), student: T('しょうがくせいじゃない！', 'I\'m NOT in grade school!'), why: T('かいしゃ…の、かえり', 'From... the office.') },
      noId: T('おとなは、いらんのじゃ', 'Grown-ups don\'t need ID.'),
      sell: T('やった！…じゃなくて、うむ', 'Yay! ...I mean, good.'), refuse: T('くそー！にげろ！', 'Dang! Run!'),
      rage: T('ばーか！', 'Meanie!'),
      detect: T('駐車場で子ども2人がビールを開けた。親が通報した', 'Two kids opened beer in the parking lot. A parent called the police.'),
      hs: [[502, 450, 100, T('サングラスの下は、幼い顔', 'A child\'s face under the shades')], [537, 470, 60, T('ひげが、のりで貼ってある', 'The mustache is glued on')], [330, 1040, 100, T('袖が長すぎる。小さな手', 'Sleeves too long. Tiny hands')], [736, 1040, 100, T('小さな手', 'Tiny hands')], [572, 1196, 100, T('コートのすき間から、もう1本の手…', 'A third hand pokes out of the coat...')], [208, 700, 110, T('肩幅がやけに広い', 'Shoulders oddly wide')]] },

    { k: 'c_h', angry: 'c_h_x', minor: false, item: 'tabako', n: 2, pat: 2, idCost: 1,
      hello: T('14番、2つ', '#14. Two.'),
      a: { year: T('2004や', '2004.'), eto: T('申や。なんやねん', 'Monkey. What of it?'), student: T('ちゃうわ。現場や', 'No. Construction.'), why: T('うっさいわ', 'None of your business.') },
      id: { kind: 'license', name: T('葛城 健二', 'Kenji Katsuragi'), y: 2004, m: 2, d: 8 },
      idLine: T('チッ…ほら', 'Tch... here.'),
      sell: T('おう', 'Yeah.'), refuse: T('はぁ？殴るぞコラ', 'Huh? Want a punch?'),
      rage: T('なめとんのかコラァ！', 'You messing with me?!'),
      hs: [[506, 260, 110, T('金髪。根元が2cmくらい黒い', 'Bleached. 2 cm of black roots')], [593, 367, 60, T('眉にピアス', 'Eyebrow piercing')], [506, 450, 130, T('肌が荒れている。にらんでくる', 'Rough skin. Glaring')], [482, 736, 100, T('金のネックレス', 'Gold chain')], [794, 1144, 140, T('原付のヘルメット', 'Scooter helmet')]] },

    { k: 'c_i', minor: false, ghost: true, item: 'sake', n: 1, pat: 9, idCost: 0,
      hello: T('……これを……', '......this......'),
      a: { year: T('大正……十五年……', 'Taisho... fifteen...'), eto: T('……寅……', '...tiger...'), student: T('……', '......'), why: T('ずっと……ここに……', 'Always... here...') },
      id: { kind: 'paper', name: T('志津', 'Shizu'), y: 1926, m: 7, d: 7 },
      idLine: T('……どうぞ……', '......here......'),
      sell: T('……ありがとう……', '......thank you......'), refuse: T('……うらめしい……', '......I resent you......'),
      rage: T('……', '......'),
      hs: [[560, 420, 120, T('ぬれた髪のすき間から、片目だけ', 'One eye through wet hair')], [522, 1126, 150, T('黄ばんだ古い紙', 'Old yellowed paper')], [380, 1170, 95, T('灰色の、冷たそうな手', 'Grey, cold-looking hands')], [808, 936, 130, T('白い着物。ぬれている', 'A wet white robe')]] },

    { k: 'c_j', minor: true, item: 'tabako', n: 2, pat: 4, idCost: 0,
      hello: T('14番、2こ', '#14, two.'),
      a: { year: T('…2004年', '...2004.'), eto: T('ね、ねずみ？', 'R-rat?'), student: T('ちゃう', 'No.'), why: T('兄ちゃんのおつかい', 'Errand for my brother.') },
      id: { kind: 'license', name: T('葛城 健二', 'Kenji Katsuragi'), y: 2004, m: 2, d: 8, photo: 'c_h' },
      idLine: T('こ、これ', 'H-here.'),
      sell: T('よっしゃ', 'Sweet.'), refuse: T('兄ちゃんに怒られる…', 'My brother\'s gonna kill me...'),
      rage: T('もうええわ！', 'Forget it!'),
      detect: T('中学生の母親から電話。「うちの子にタバコ売ったでしょ」', 'A mother calls: "You sold cigarettes to my 15-year-old!"'),
      hs: [[511, 381, 130, T('まん丸の顔。ひげは生えていない', 'Round face. No stubble at all')], [503, 190, 110, T('坊主頭', 'Buzz cut')], [338, 893, 110, T('メモに「14番 2こ」', 'A note: "#14 x2"')], [728, 866, 110, T('免許証くらいのカード', 'A license-sized card')], [250, 1150, 130, T('ぶかぶかの黒いパーカー', 'Baggy black hoodie')]] },

    { k: 'c_k', angry: 'c_k_x', minor: false, item: 'beer', n: 1, pat: 3, idCost: 2,
      hello: T('ビール！もう1本だけ！', 'Beer! Just one more!'),
      a: { year: T('1981年や〜', '1981~'), eto: T('酉や！コケコッコー', 'Rooster! Cock-a-doodle!'), student: T('学生！？うれしいこと言うな', 'Student?! You flatter me!'), why: T('接待や、接待…', 'Client dinner...') },
      noId: T('財布落としてん！スマホで払う！', 'Lost my wallet! I\'ll pay by phone!'),
      sell: T('ありがとう！がんばりや！', 'Thanks! Keep it up!'), refuse: T('客を疑うんか！', 'You doubt your customer?!'),
      rage: T('45のおっさんに何言うとんねん！', 'I\'m 45, you idiot!'),
      hs: [[516, 400, 140, T('真っ赤な顔。ほうれい線と二重あご', 'Red face. Laugh lines, double chin')], [499, 190, 120, T('うすくなった頭。こめかみに白髪', 'Thinning top. Grey temples')], [568, 830, 100, T('ゆるめたネクタイ', 'Loosened tie')], [317, 832, 110, T('スマホ。財布は持っていない', 'A phone. No wallet')], [811, 728, 110, T('肩に背広', 'Jacket over his shoulder')]] },

    { k: 'c_l', angry: 'c_l_x', minor: true, item: 'strong', n: 2, pat: 2, idCost: 1,
      hello: T('これ。はよして', 'These. Hurry.'),
      a: { year: T('2005年', '2005.'), eto: T('え、…うし？', 'Uh... Ox?'), student: T('大学生やけど', 'College.'), why: T('友達んち', 'A friend\'s place.') },
      noId: T('免許まだ取って…あ、家', 'I haven\'t got my license ye- I mean, at home.'),
      sell: T('どうも', 'Thanks.'), refuse: T('は？意味わからん', 'Huh? Unbelievable.'),
      rage: T('うっざ！もうええわ！', 'So annoying! Forget it!'),
      detect: T('公園で補導された女子高生のレシートから、店がバレた', 'Police found our receipt on a high schooler in the park.'),
      hs: [[537, 400, 120, T('濃いメイク。でも、ほおはふっくら', 'Heavy makeup. Still chubby cheeks')], [529, 454, 60, T('風船ガム', 'Bubble gum')], [329, 815, 120, T('プリクラと、スマホの裏に定期券', 'Photo stickers. A commuter pass')], [693, 1161, 90, T('手首に紺のシュシュ', 'A navy scrunchie on her wrist')], [407, 468, 70, T('大きいフープピアス', 'Big hoop earrings')]] },

    { k: 'y_kappa', yokai: true, minor: false, item: 'cup', n: 2, pat: 4, idCost: 0,
      hello: T('酒をくれんか。2つじゃ', 'Sake, please. Two.'),
      a: { year: T('寛政十年じゃ', 'Kansei 10.'), eto: T('午じゃよ', 'Horse.'), student: T('学生？228歳じゃぞ', 'Student? I am 228.'), why: T('川で相撲の帰りじゃ', 'Sumo at the river.') },
      id: { kind: 'leaf', name: T('河童 川太郎', 'Kawataro the Kappa'), y: 1798, m: 6, d: 1 },
      idLine: T('これがワシの証じゃ', 'Here is my proof.'),
      sell: T('かたじけない', 'Much obliged.'), refuse: T('228歳を子ども扱いか！', 'You treat a 228-year-old like a child?!'),
      rage: T('尻子玉ぬくぞ！', 'I\'ll steal your soul!'),
      hs: [[511, 200, 120, T('頭のお皿。本物で、ぬれている', 'The head dish. Real, and wet')], [511, 420, 130, T('深いしわ。年老いた目', 'Deep wrinkles. Ancient eyes')], [364, 1075, 120, T('水かきと長い爪', 'Webbed hands, long claws')], [329, 900, 90, T('自前のきゅうり', 'His own cucumber')], [797, 918, 140, T('ハスの葉。何か書いてある', 'A lotus leaf with writing')], [173, 728, 100, T('甲羅が体とつながっている', 'The shell grows from his body')]] },

    { k: 'y_kappakid', minor: true, item: 'beer', n: 1, pat: 4, idCost: 0,
      hello: T('かっぱだぞ〜。ビールください', 'I\'m a kappa~ Beer please.'),
      a: { year: T('2000年…です', '2000...'), eto: T('かっぱ年！', 'Year of the Kappa!'), student: T('ち、ちがうし', 'N-no.'), why: T('ハロウィンの帰り！', 'Halloween!') },
      noId: T('河童は持ってない！', 'Kappas don\'t carry ID!'),
      sell: T('やったー！', 'Yesss!'), refuse: T('ちぇー', 'Aww.'),
      rage: T('もう帰る！', 'I\'m going home!'),
      detect: T('河童の仮装の中学生が補導された。レシートが残っていた', 'Police caught a middle schooler in a kappa costume. With our receipt.'),
      hs: [[506, 150, 110, T('紙皿をゴムひもで留めている', 'A paper plate held by elastic')], [515, 590, 90, T('あごの下に黒いゴムひも', 'Elastic strap under the chin')], [506, 420, 120, T('緑の絵の具。首は普通の肌色', 'Green paint. Normal skin on the neck')], [541, 500, 70, T('歯に矯正器具', 'Braces on his teeth')], [222, 1075, 110, T('台所用のゴム手袋', 'Kitchen rubber gloves')], [860, 1075, 110, T('台所用のゴム手袋', 'Kitchen rubber gloves')], [256, 832, 90, T('甲羅にリュックのベルト', 'The shell has backpack straps')]] },

    { k: 'y_rokuro', yokai: true, neck: true, minor: false, item: 'sake', n: 1, pat: 3, idCost: 1,
      hello: T('お酒を、ひとつ', 'One sake, please.'),
      a: { year: T('享保元年ですの', 'Kyoho 1.'), eto: T('申ですわ', 'Monkey.'), student: T('うふふ', 'Ohoho.'), why: T('首の運動の帰りですの', 'Neck exercises.') },
      id: { kind: 'tegata', name: T('ろく', 'Roku'), y: 1716, m: 3, d: 3 },
      idLine: T('手形でよろしくて？', 'Will a travel pass do?'),
      sell: T('ごきげんよう', 'Good evening.'), refuse: T('……あら', '......oh my.'),
      rage: T('しつこいですわね', 'How persistent.'),
      hs: [[522, 580, 110, T('首が…長い', 'The neck is... long')], [522, 400, 120, T('白い肌に紅。年がわからない', 'Pale skin, red lips. Ageless')], [530, 1126, 120, T('木の通行手形', 'A wooden travel pass')], [496, 150, 110, T('江戸の髪型', 'An Edo-era hairstyle')], [287, 970, 130, T('古い仕立ての着物', 'An old-style kimono')]] },
  ]
  // 年齢（2026-11-01 時点）。妖怪は生まれ年から
  const REAL = { c_a: 72, c_b: 28, c_c: 17, c_d: 24, c_e: 19, c_f: 18, c_g: 10, c_h: 22, c_i: 100, c_j: 15, c_k: 45, c_l: 17, y_kappa: 228, y_kappakid: 14, y_rokuro: 310 }
  for (const c of C) c.age = REAL[c.k]

  const EV = {
    fired: T('店長「クレーム3回。もう来んでええ」', 'Manager: "Three complaints. Don\'t come back."'),
    dawnOk: T('朝5時。外が明るくなってきた', '5 a.m. The sky is getting light.'),
    flicker: T('……蛍光灯が、ちらついた', '...The lights flicker.'),
    camEmpty: T('防犯カメラには、誰も映っていない', 'The security camera shows no one.'),
    idle: T('…まだ？', '...Well?'),
  }
  const BOSSC = {
    perfect: T('完璧や。明日も入ってくれ', 'Perfect. Come back tomorrow.'),
    ok: T('ようやった。クレームは気にすんな', 'Good job. Don\'t mind the complaints.'),
    meh: T('疑いすぎや。客商売やで', 'You doubt too much. This is retail.'),
    sneaky: T('……さっきの大学生、ほんまに20歳やったか？', '...That college kid. Was he really 20?'),
    stop: T('……店、閉めなアカンようになった', '...We have to close the store.'),
    fired: T('クレーム3回や。お疲れさん', 'Three complaints. You\'re done.'),
  }
  return { UI, ETO_BASE, BOSS, ITEMS, C, EV, BOSSC, T }
})()
