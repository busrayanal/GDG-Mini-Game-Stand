'use strict';
GAMES.push({
  id: 'isabet',
  title: 'Tam İsabet',
  skill: 'Zamanlama',
  icon: '🎯',
  color: GDG.green,
  duration: 40,
  tagline: 'Doğru anda bas, tam ortadan vur!',
  rules: [
    ['↔️', 'Beyaz işaret sağa sola kayıyor.'],
    ['🎯', 'İşaret yeşil bölgedeyken bas. Sarı merkez = MÜKEMMEL!'],
    ['⚠️', 'Her isabette hızlanır. Iskalarsan −15 puan.']
  ],
  controls: 'Boşluk tuşu, fare tıklaması veya ekrana dokunma',
  scoring: 'İsabet 50–100 puan (merkeze yakınlık) · Seri çarpanı ×1.5\'e kadar · Iska −15',

  create(stage, api) {
    const v = makeCanvas(stage);
    const c = v.ctx;
    const fx = new FX();
    let p = 0.05, dir = 1, speed = 0.55, zc = 0.62, zw = 0.24;
    let cool = 0, combo = 0, hits = 0, flash = null;

    function newZone() {
      let z, tries = 0;
      do { z = Util.rand(zw / 2 + 0.03, 1 - zw / 2 - 0.03); tries++; }
      while (Math.abs(z - p) < 0.25 && tries < 20);
      zc = z;
    }

    function geom() {
      const tw = Math.min(v.w * 0.86, 1400);
      const th = Util.clamp(v.h * 0.13, 60, 120);
      return { tx: (v.w - tw) / 2, ty: v.h * 0.5 - th / 2, tw, th };
    }

    function press() {
      if (!api.running() || cool > 0) return;
      const g = geom();
      const d = Math.abs(p - zc), half = zw / 2;
      const mx = g.tx + p * g.tw, my = g.ty - 40;
      if (d <= half) {
        const acc = 1 - d / half;
        combo++; hits++;
        const mult = 1 + Math.min(combo - 1, 5) * 0.1;
        const perfect = acc >= 0.8;
        const pts = Math.round((50 + 50 * acc) * mult);
        api.addScore(pts);
        fx.text(mx, my, (perfect ? 'MÜKEMMEL! ' : '') + '+' + pts, perfect ? GDG.yellow : '#fff', perfect ? 46 : 38);
        fx.burst(mx, g.ty + g.th / 2, perfect ? GDG.yellow : GDG.green, perfect ? 30 : 16);
        perfect ? api.sfx.perfect() : api.sfx.good();
        speed = Math.min(speed * 1.08, 2.4);
        zw = Math.max(zw * 0.93, 0.07);
        flash = { good: true, age: 0 };
      } else {
        combo = 0;
        api.addScore(-15);
        fx.text(mx, my, 'ISKA −15', GDG.red, 40);
        api.sfx.bad(); api.shake();
        flash = { good: false, age: 0 };
      }
      api.status(combo >= 2 ? `🔥 Seri ×${combo}` : '');
      cool = 0.45;
    }

    const onKey = e => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); press(); }
    };
    const onDown = e => { e.preventDefault(); press(); };
    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);

    return {
      update(dt) {
        fx.update(dt);
        if (flash) flash.age += dt;
        if (cool > 0) {
          cool -= dt;
          if (cool <= 0) newZone();
          return;
        }
        p += dir * speed * dt;
        if (p > 1) { p = 2 - p; dir = -1; }
        if (p < 0) { p = -p; dir = 1; }
      },
      draw() {
        c.clearRect(0, 0, v.w, v.h);
        const g = geom();
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillStyle = 'rgba(255,255,255,.75)';
        c.font = `800 ${Util.clamp(v.h * 0.05, 22, 40)}px ${CANVAS_FONT}`;
        c.fillText('Yeşil bölgede BAS!', v.w / 2, g.ty - Util.clamp(v.h * 0.16, 70, 140));

        Util.roundRect(c, g.tx, g.ty, g.tw, g.th, g.th / 2);
        c.fillStyle = 'rgba(255,255,255,.07)'; c.fill();
        c.lineWidth = 3;
        c.strokeStyle = flash && flash.age < 0.35 ? (flash.good ? GDG.green : GDG.red) : 'rgba(255,255,255,.18)';
        c.stroke();

        c.save();
        Util.roundRect(c, g.tx, g.ty, g.tw, g.th, g.th / 2); c.clip();
        const zx = g.tx + (zc - zw / 2) * g.tw, zpx = zw * g.tw;
        c.fillStyle = 'rgba(52,168,83,.6)'; c.fillRect(zx, g.ty, zpx, g.th);
        c.fillStyle = 'rgba(251,188,4,.9)'; c.fillRect(zx + zpx * 0.4, g.ty, zpx * 0.2, g.th);
        c.restore();

        const mx = g.tx + p * g.tw;
        c.save();
        c.shadowColor = 'rgba(255,255,255,.9)'; c.shadowBlur = 24;
        c.fillStyle = '#fff';
        Util.roundRect(c, mx - 7, g.ty - 22, 14, g.th + 44, 7); c.fill();
        c.restore();
        c.fillStyle = '#fff';
        c.beginPath(); c.moveTo(mx - 16, g.ty - 44); c.lineTo(mx + 16, g.ty - 44); c.lineTo(mx, g.ty - 24); c.closePath(); c.fill();

        c.fillStyle = 'rgba(255,255,255,.55)';
        c.font = `700 ${Util.clamp(v.h * 0.035, 18, 28)}px ${CANVAS_FONT}`;
        c.fillText(`İsabet: ${hits}   ·   Hız: ${speed.toFixed(1)}x`, v.w / 2, g.ty + g.th + Util.clamp(v.h * 0.12, 50, 110));
        fx.draw(c);
      },
      destroy() {
        stage.removeEventListener('pointerdown', onDown);
        window.removeEventListener('keydown', onKey);
        v.destroy();
      }
    };
  }
});
