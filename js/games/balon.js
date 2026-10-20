'use strict';
GAMES.push({
  id: 'balon',
  title: 'Balon Patlat',
  skill: 'Refleks',
  icon: '🎈',
  color: GDG.red,
  duration: 30,
  tagline: 'Balonlar kaçmadan hepsini patlat!',
  rules: [
    ['🎈', 'Ekranda beliren balonlara dokun ya da tıkla.'],
    ['⚡', 'Ne kadar hızlı patlatırsan o kadar çok puan alırsın.'],
    ['💣', 'Bombalara dokunma, her biri −20 puan!']
  ],
  controls: 'Fare veya dokunmatik ekran',
  scoring: 'Balon 10–20 puan (hızına göre) · 5\'li seride +5 · Bomba −20',

  create(stage, api) {
    const v = makeCanvas(stage);
    const c = v.ctx;
    const fx = new FX();
    let items = [], spawnT = 0.15, t = 0, combo = 0;

    const radius = () => Util.clamp(Math.min(v.w, v.h) * 0.075, 36, 74);

    function spawn() {
      const r = radius(), pad = r + 16;
      let x, y, tries = 0;
      do {
        x = Util.rand(pad, v.w - pad);
        y = Util.rand(pad, v.h - pad - r);
        tries++;
      } while (tries < 14 && items.some(o => Math.hypot(o.x - x, o.y - y) < (o.r + r) * 1.15));
      const bomb = t > 4 && Math.random() < 0.17;
      const life = Util.clamp(1.9 - t * 0.03, 1.0, 1.9) * (bomb ? 1.4 : 1);
      items.push({ x, y, r, age: 0, life, bomb, color: Util.pick(GDG_LIST), wob: Math.random() * 6 });
    }

    function scaleOf(it) {
      if (it.age < 0.14) { const k = it.age / 0.14; return 0.3 + 0.7 * (1 - Math.pow(1 - k, 3)); }
      const k = it.age / it.life;
      return k > 0.75 ? 1 - (k - 0.75) / 0.25 * 0.45 : 1;
    }

    function showCombo() { api.status(combo >= 2 ? `🔥 Seri ×${combo}` : ''); }

    function onDown(e) {
      if (!api.running()) return;
      e.preventDefault();
      const p = v.pos(e);
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        const hitR = it.r * Math.max(scaleOf(it), 0.75) + 12;
        if (Math.hypot(p.x - it.x, p.y - it.y) > hitR) continue;
        items.splice(i, 1);
        if (it.bomb) {
          combo = 0;
          api.addScore(-20);
          api.sfx.bad(); api.shake();
          fx.burst(it.x, it.y, '#9ca3af', 26);
          fx.text(it.x, it.y, '−20', GDG.red, 44);
        } else {
          combo++;
          const quick = 1 - it.age / it.life;
          const pts = 10 + Math.round(quick * 10) + (combo >= 5 ? 5 : 0);
          api.addScore(pts);
          api.sfx.pop();
          fx.burst(it.x, it.y, it.color, 18);
          fx.text(it.x, it.y - it.r * 0.4, '+' + pts, '#fff', 38);
        }
        showCombo();
        return;
      }
    }
    v.canvas.addEventListener('pointerdown', onDown);

    function drawBalloon(it, x, y, r) {
      c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x, y + r * 1.08);
      c.quadraticCurveTo(x - r * 0.25, y + r * 1.5, x + r * 0.05, y + r * 1.9); c.stroke();
      c.fillStyle = it.color;
      c.beginPath(); c.moveTo(x, y + r * 0.98); c.lineTo(x - r * 0.14, y + r * 1.16); c.lineTo(x + r * 0.14, y + r * 1.16); c.closePath(); c.fill();
      const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.1);
      g.addColorStop(0, '#ffffff55'); g.addColorStop(0.25, it.color); g.addColorStop(1, it.color);
      c.fillStyle = g;
      c.beginPath(); c.ellipse(x, y, r * 0.9, r * 1.04, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.45)';
      c.beginPath(); c.ellipse(x - r * 0.36, y - r * 0.42, r * 0.13, r * 0.26, -0.5, 0, Math.PI * 2); c.fill();
    }

    function drawBomb(it, x, y, r) {
      const br = r * 0.8;
      c.strokeStyle = '#d6b37a'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(x + br * 0.5, y - br * 0.75);
      c.quadraticCurveTo(x + br * 0.9, y - br * 1.35, x + br * 1.2, y - br * 1.1); c.stroke();
      const flick = (Math.sin(it.age * 40) + 1) / 2;
      c.fillStyle = flick > 0.5 ? GDG.yellow : '#ff7a00';
      c.beginPath(); c.arc(x + br * 1.2, y - br * 1.1, 7 + flick * 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#10131f';
      c.strokeStyle = GDG.red; c.lineWidth = 5;
      c.beginPath(); c.arc(x, y, br, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#2b3148';
      c.fillRect(x + br * 0.25, y - br * 0.95, br * 0.5, br * 0.35);
      c.fillStyle = GDG.red; c.font = `900 ${br * 0.9}px ${CANVAS_FONT}`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('✕', x, y + 2);
    }

    return {
      update(dt) {
        t += dt;
        spawnT -= dt;
        if (spawnT <= 0) {
          spawn();
          if (t > 10 && Math.random() < 0.3) spawn();
          if (t > 20 && Math.random() < 0.3) spawn();
          spawnT = Util.clamp(0.8 - t * 0.014, 0.4, 0.8);
        }
        for (const it of items) it.age += dt;
        items = items.filter(it => {
          if (it.age < it.life) return true;
          if (!it.bomb && combo) { combo = 0; showCombo(); }
          return false;
        });
        fx.update(dt);
      },
      draw() {
        c.clearRect(0, 0, v.w, v.h);
        for (const it of items) {
          const s = scaleOf(it), r = it.r * s;
          const x = it.x, y = it.y + Math.sin((it.age + it.wob) * 3) * 4;
          const k = 1 - it.age / it.life;
          c.lineWidth = 5; c.lineCap = 'round';
          c.strokeStyle = it.bomb ? 'rgba(234,67,53,.55)' : 'rgba(255,255,255,.3)';
          c.beginPath(); c.arc(x, y, r + 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); c.stroke();
          if (it.bomb) drawBomb(it, x, y, r); else drawBalloon(it, x, y, r);
        }
        fx.draw(c);
      },
      destroy() {
        v.canvas.removeEventListener('pointerdown', onDown);
        v.destroy();
      }
    };
  }
});
