'use strict';
GAMES.push({
  id: 'avci',
  title: 'Bug Avcısı',
  skill: 'Beceri',
  icon: '🧺',
  color: GDG.blue,
  duration: 45,
  tagline: 'Renkli topları topla, böceklerden kaç!',
  rules: [
    ['🧺', 'Sepeti sağa sola hareket ettir.'],
    ['⭐', 'Renkli topları (+10) ve yıldızları (+30) yakala.'],
    ['🐛', 'Böcek yakalarsan 1 can gider. 3 canın var!']
  ],
  controls: 'Fare / parmakla sürükle veya ← → ok tuşları',
  scoring: 'Top +10 (seri ile +15\'e kadar) · Yıldız +30 · Böcek −1 can · Sonda kalan her can +25',

  create(stage, api) {
    const v = makeCanvas(stage);
    const c = v.ctx;
    const fx = new FX();
    let x = v.w / 2, target = null, items = [], spawnT = 0.3, t = 0, lives = 3, combo = 0, hurt = 0;
    const keys = { l: false, r: false };
    const PH = 26;
    const pw = () => Util.clamp(v.w * 0.14, 120, 230);
    const py = () => v.h - 70;

    const updateStatus = () => api.status('❤️'.repeat(lives) + '🖤'.repeat(3 - lives) + (combo >= 3 ? ` 🔥×${combo}` : ''));

    function spawn() {
      const base = Util.clamp(Math.min(v.w, v.h) * 0.032, 18, 32);
      const roll = Math.random();
      const bugP = Math.min(0.2 + t * 0.006, 0.42);
      const type = roll < bugP ? 'bug' : roll > 0.93 ? 'star' : 'dot';
      const r = type === 'dot' ? base : base * 1.3;
      items.push({
        type, r, x: Util.rand(r + 10, v.w - r - 10), y: -r,
        vy: Util.rand(0.9, 1.15) * (230 + t * 6) * Util.clamp(v.h / 800, 0.7, 1.5),
        color: Util.pick(GDG_LIST), rot: Math.random() * 6
      });
    }

    function onCatch(it) {
      const top = py();
      if (it.type === 'bug') {
        lives--; combo = 0; hurt = 0.7;
        api.sfx.bad(); api.shake();
        fx.burst(it.x, top, GDG.red, 20);
        fx.text(it.x, top - 40, '−1 ❤', GDG.red, 40);
        updateStatus();
        if (lives <= 0) api.end('Canların bitti!');
      } else if (it.type === 'star') {
        combo++;
        api.addScore(30); api.sfx.perfect();
        fx.burst(it.x, top, GDG.yellow, 26);
        fx.text(it.x, top - 40, '+30', GDG.yellow, 44);
        updateStatus();
      } else {
        combo++;
        const pts = 10 + Math.min(combo - 1, 5);
        api.addScore(pts); api.sfx.catch();
        fx.burst(it.x, top, it.color, 12);
        fx.text(it.x, top - 40, '+' + pts, '#fff', 34);
        updateStatus();
      }
    }

    const onMove = e => { if (api.running()) target = v.pos(e).x; };
    const keyMap = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
    const onKeyDown = e => { const k = keyMap[e.code]; if (k) { e.preventDefault(); keys[k] = true; } };
    const onKeyUp = e => { const k = keyMap[e.code]; if (k) keys[k] = false; };
    const onBlur = () => { keys.l = keys.r = false; };
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerdown', onMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    function drawStar(x, y, r, rot) {
      c.save(); c.translate(x, y); c.rotate(rot);
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r;
        c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
      c.fillStyle = GDG.yellow; c.shadowColor = GDG.yellow; c.shadowBlur = 20; c.fill();
      c.restore();
    }

    return {
      start() { updateStatus(); },
      update(dt) {
        t += dt; fx.update(dt); hurt = Math.max(0, hurt - dt);
        const w = pw(), sp = v.w * 1.1;
        if (keys.l) { x -= sp * dt; target = null; }
        if (keys.r) { x += sp * dt; target = null; }
        if (target !== null) x += (target - x) * Math.min(1, dt * 18);
        x = Util.clamp(x, w / 2, v.w - w / 2);

        spawnT -= dt;
        if (spawnT <= 0) { spawn(); spawnT = Util.clamp(0.62 - t * 0.008, 0.28, 0.62); }

        const top = py();
        for (const it of items) {
          it.y += it.vy * dt; it.rot += dt * 2;
          if (!it.done && it.y + it.r >= top && it.y - it.r <= top + PH && Math.abs(it.x - x) <= w / 2 + it.r * 0.5) {
            it.done = true;
            onCatch(it);
          }
        }
        items = items.filter(it => {
          if (it.done) return false;
          if (it.y - it.r > v.h) {
            if (it.type !== 'bug' && combo) { combo = 0; updateStatus(); }
            return false;
          }
          return true;
        });
      },
      draw() {
        c.clearRect(0, 0, v.w, v.h);
        const w = pw(), top = py();
        c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(0, top + PH + 10, v.w, v.h);

        for (const it of items) {
          if (it.type === 'dot') {
            c.fillStyle = it.color;
            c.beginPath(); c.arc(it.x, it.y, it.r, 0, Math.PI * 2); c.fill();
            c.fillStyle = 'rgba(255,255,255,.45)';
            c.beginPath(); c.arc(it.x - it.r * 0.35, it.y - it.r * 0.35, it.r * 0.28, 0, Math.PI * 2); c.fill();
          } else if (it.type === 'star') {
            drawStar(it.x, it.y, it.r, it.rot * 0.5);
          } else {
            c.fillStyle = 'rgba(234,67,53,.35)'; c.strokeStyle = GDG.red; c.lineWidth = 3;
            c.beginPath(); c.arc(it.x, it.y, it.r * 1.15, 0, Math.PI * 2); c.fill(); c.stroke();
            c.save(); c.translate(it.x, it.y); c.rotate(Math.sin(it.rot * 3) * 0.25);
            c.font = `${it.r * 1.7}px ${EMOJI_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillStyle = '#fff';
            c.fillText('🐛', 0, 2);
            c.restore();
          }
        }

        const blink = hurt > 0 && Math.floor(hurt * 12) % 2 === 0;
        c.save();
        c.globalAlpha = blink ? 0.35 : 1;
        Util.roundRect(c, x - w / 2, top, w, PH, 13); c.clip();
        GDG_LIST.forEach((col, i) => { c.fillStyle = col; c.fillRect(x - w / 2 + i * w / 4, top, w / 4 + 1, PH); });
        c.restore();
        c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 3;
        Util.roundRect(c, x - w / 2, top, w, PH, 13); c.stroke();
        fx.draw(c);
      },
      onEnd() {
        if (lives > 0) {
          const bonus = lives * 25;
          api.addScore(bonus);
          return `❤️ Can bonusu: +${bonus}`;
        }
      },
      destroy() {
        stage.removeEventListener('pointermove', onMove);
        stage.removeEventListener('pointerdown', onMove);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', onBlur);
        v.destroy();
      }
    };
  }
});
