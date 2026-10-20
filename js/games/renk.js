'use strict';
GAMES.push({
  id: 'renk',
  title: 'Renk Tuzağı',
  skill: 'Dikkat',
  icon: '🎨',
  color: GDG.blue,
  duration: 40,
  tagline: 'Kelimeyi değil, rengini seç. Beynin seni kandırmasın!',
  rules: [
    ['👀', 'Ekranda bir renk adı çıkar, ama başka bir renkle yazılmıştır.'],
    ['🎯', 'Kelimeye değil, YAZININ RENGİNE bas.'],
    ['🔥', 'Doğru cevaplar seri yapar. Yanlış cevap −5 puan.']
  ],
  controls: 'Renkli butonlara dokun / tıkla veya 1–4 tuşları',
  scoring: 'Doğru 10 puan + seri bonusu (en fazla +10) · 1 sn\'den hızlıysa +5 · Yanlış −5',

  create(stage, api) {
    const COLORS = [
      { name: 'MAVİ', c: GDG.blue },
      { name: 'KIRMIZI', c: GDG.red },
      { name: 'SARI', c: GDG.yellow },
      { name: 'YEŞİL', c: GDG.green }
    ];
    const wrap = document.createElement('div');
    wrap.className = 'stroop';
    wrap.innerHTML = `
      <div class="stroop-hint">Kelimeyi değil, <b>yazının rengini</b> seç!</div>
      <div class="stroop-word">?</div>
      <div class="stroop-btns">${COLORS.map((col, i) =>
        `<button class="stroop-btn" data-i="${i}" style="--c:${col.c}" aria-label="${col.name}"><kbd>${i + 1}</kbd><em>${col.name}</em></button>`).join('')}
      </div>`;
    stage.appendChild(wrap);
    const wordEl = wrap.querySelector('.stroop-word');
    const btns = [...wrap.querySelectorAll('.stroop-btn')];

    let cur = null, streak = 0, t = 0, qStart = 0, lockUntil = 0;

    function next() {
      let word, ink;
      do {
        word = Util.randInt(0, 3);
        ink = Math.random() < 0.78 ? (word + Util.randInt(1, 3)) % 4 : word;
      } while (cur && cur.word === word && cur.ink === ink);
      cur = { word, ink };
      qStart = t;
      wordEl.textContent = COLORS[word].name;
      wordEl.style.color = COLORS[ink].c;
      wordEl.classList.remove('pop'); void wordEl.offsetWidth; wordEl.classList.add('pop');
    }

    function answer(i) {
      if (!api.running() || !cur || t < lockUntil) return;
      const btn = btns[i];
      btn.classList.add('hit'); setTimeout(() => btn.classList.remove('hit'), 120);
      const sr = stage.getBoundingClientRect(), br = btn.getBoundingClientRect();
      const fx = br.left - sr.left + br.width / 2, fy = br.top - sr.top - 10;
      if (i === cur.ink) {
        streak++;
        let pts = 10 + Math.min(streak - 1, 10);
        if (t - qStart < 1) pts += 5;
        api.addScore(pts);
        api.sfx.good();
        floatText(stage, fx, fy, '+' + pts, '#fff');
      } else {
        streak = 0;
        api.addScore(-5);
        api.sfx.bad(); api.shake();
        floatText(stage, fx, fy, '−5', GDG.red);
        lockUntil = t + 0.35;
      }
      api.status(streak >= 2 ? `🔥 Seri ×${streak}` : '');
      next();
    }

    const onClick = e => {
      const b = e.target.closest('.stroop-btn');
      if (b) answer(+b.dataset.i);
    };
    const onKey = e => {
      const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'].indexOf(e.code);
      if (n >= 0) { e.preventDefault(); answer(n % 4); }
    };
    wrap.addEventListener('pointerdown', onClick);
    window.addEventListener('keydown', onKey);

    return {
      start() { next(); },
      update(dt) { t += dt; },
      destroy() {
        wrap.removeEventListener('pointerdown', onClick);
        window.removeEventListener('keydown', onKey);
        wrap.remove();
      }
    };
  }
});
