'use strict';
GAMES.push({
  id: 'hafiza',
  title: 'Işık Hafızası',
  skill: 'Hafıza',
  icon: '💡',
  color: GDG.yellow,
  duration: 60,
  tagline: 'Işıkların sırasını aklında tut, aynen tekrarla!',
  rules: [
    ['👀', 'Renkli ışıklar sırayla yanar, dikkatle izle.'],
    ['👆', 'Sıra sende olunca aynı sırayla bas.'],
    ['❤️', 'Her turda sıra 1 uzar. 3 hakkın var!']
  ],
  controls: 'Renkli alanlara dokun / tıkla veya 1–4 tuşları',
  scoring: 'Her doğru basış +5 · Tamamlanan tur: sıra uzunluğu × 10 · 3 yanlışta oyun biter',

  create(stage, api) {
    const PADS = [GDG.blue, GDG.red, GDG.yellow, GDG.green];
    const wrap = document.createElement('div');
    wrap.className = 'simon';
    wrap.innerHTML = `
      <div class="simon-msg">Hazır ol…</div>
      <div class="simon-grid locked">${PADS.map((col, i) =>
        `<button class="simon-pad" data-i="${i}" style="--c:${col}" aria-label="Işık ${i + 1}"><kbd>${i + 1}</kbd></button>`).join('')}
      </div>
      <div class="simon-level">&nbsp;</div>`;
    stage.appendChild(wrap);
    const msg = wrap.querySelector('.simon-msg');
    const grid = wrap.querySelector('.simon-grid');
    const level = wrap.querySelector('.simon-level');
    const pads = [...wrap.querySelectorAll('.simon-pad')];

    let seq = [], phase = 'idle', idx = 0, lives = 3;
    let showClock = 0, waitT = 0, lit = -1, rounds = 0;
    const flashTimers = new Map();

    const hearts = () => '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
    const onTime = () => Math.max(0.26, 0.55 - seq.length * 0.025);
    const gap = () => Math.max(0.12, 0.2 - seq.length * 0.008);

    function light(i) {
      pads.forEach((p, j) => p.classList.toggle('lit', j === i));
      lit = i;
    }
    function flashPad(i) {
      const p = pads[i];
      p.classList.add('lit');
      clearTimeout(flashTimers.get(i));
      flashTimers.set(i, setTimeout(() => p.classList.remove('lit'), 200));
    }
    function setMode(m) {
      grid.classList.toggle('locked', m !== 'input');
      grid.classList.toggle('input', m === 'input');
    }
    function updateInfo() {
      level.textContent = `Seviye ${seq.length}   ·   Tamamlanan tur: ${rounds}`;
      api.status(hearts());
    }
    function startShow() {
      phase = 'show'; showClock = -0.45; light(-1); setMode('show');
      msg.textContent = '👀 İzle…';
      updateInfo();
    }

    function press(i) {
      if (!api.running() || phase !== 'input') return;
      flashPad(i);
      api.sfx.pad(i);
      if (i === seq[idx]) {
        idx++;
        api.addScore(5);
        if (idx === seq.length) {
          const bonus = seq.length * 10;
          api.addScore(bonus);
          rounds++;
          api.sfx.good();
          msg.textContent = `✅ Harika! +${bonus + 5}`;
          seq.push(Util.randInt(0, 3));
          phase = 'wait'; waitT = 0.9; setMode('wait');
          updateInfo();
        }
      } else {
        lives--;
        api.sfx.bad(); api.shake();
        updateInfo();
        if (lives <= 0) {
          msg.textContent = '❌ Hakların bitti!';
          phase = 'over'; setMode('over');
          api.end('Hakların bitti!');
        } else {
          msg.textContent = '❌ Yanlış! Aynı sırayı tekrar izle';
          phase = 'wait'; waitT = 1.2; setMode('wait');
        }
      }
    }

    const onDown = e => {
      const b = e.target.closest('.simon-pad');
      if (b) { e.preventDefault(); press(+b.dataset.i); }
    };
    const onKey = e => {
      const n = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Numpad1', 'Numpad2', 'Numpad3', 'Numpad4'].indexOf(e.code);
      if (n >= 0) { e.preventDefault(); press(n % 4); }
    };
    wrap.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);

    return {
      start() {
        seq = [Util.randInt(0, 3), Util.randInt(0, 3)];
        startShow();
      },
      update(dt) {
        if (phase === 'show') {
          showClock += dt;
          const on = onTime(), step = on + gap();
          const i = Math.floor(showClock / step);
          if (showClock < 0) return;
          if (i >= seq.length) {
            light(-1);
            phase = 'input'; idx = 0; setMode('input');
            msg.textContent = '👆 Sıra sende!';
            return;
          }
          const want = (showClock - i * step) < on ? seq[i] : -1;
          if (want !== lit) { light(want); if (want >= 0) api.sfx.pad(want); }
        } else if (phase === 'wait') {
          waitT -= dt;
          if (waitT <= 0) startShow();
        }
      },
      destroy() {
        flashTimers.forEach(t => clearTimeout(t));
        wrap.removeEventListener('pointerdown', onDown);
        window.removeEventListener('keydown', onKey);
        wrap.remove();
      }
    };
  }
});
