'use strict';
(function () {
  const $ = s => document.querySelector(s);
  const screens = {};
  document.querySelectorAll('.screen').forEach(s => { screens[s.id.replace('scr-', '')] = s; });
  let current = 'home';

  const S = {
    game: null, name: '', keepName: '', keepNameUntil: 0,
    inst: null, phase: 'none', started: false, score: 0, elapsed: 0, lastSec: -1,
    cdTimers: [], entry: null, boardTab: 0, boardAuto: true
  };

  const settings = Store.settings();
  Sound.enabled = settings.sound;

  function show(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
    screens[name].scrollTop = 0;
    current = name;
    document.body.classList.toggle('playing', name === 'play');
    lastAct = Date.now();
  }
  const setColor = (el, c) => el.style.setProperty('--c', c);
  const gameById = id => GAMES.find(g => g.id === id);

  function renderHome() {
    const wrap = $('#cards');
    wrap.innerHTML = '';
    GAMES.forEach((g, i) => {
      const top = Store.day(g.id)[0];
      const b = document.createElement('button');
      b.className = 'card';
      setColor(b, g.color);
      b.innerHTML = `
        <span class="card-num">${i + 1}</span>
        <span class="card-icon">${g.icon}</span>
        <span class="chip">${g.skill}</span>
        <span class="card-title">${g.title}</span>
        <span class="card-tag">${g.tagline}</span>
        <span class="card-meta">
          <span>⏱ ${g.duration} sn</span>
          <span>${top ? `👑 ${Util.esc(top.name)} · <b>${top.score}</b>` : 'Henüz rekor yok, ilk sen ol!'}</span>
        </span>`;
      b.addEventListener('click', () => pickGame(g));
      wrap.appendChild(b);
    });
  }

  function goHome(clearName) {
    if (clearName) S.keepName = '';
    teardown();
    renderHome();
    show('home');
  }

  const ADJ = ['Hızlı', 'Çılgın', 'Neşeli', 'Cesur', 'Minik', 'Parlak', 'Havalı', 'Gizemli', 'Zıpır', 'Süper', 'Uçan', 'Kodcu'];
  const NOUN = ['Panda', 'Tilki', 'Kedi', 'Baykuş', 'Penguen', 'Ahtapot', 'Sincap', 'Robot', 'Kirpi', 'Yunus', 'Kaplan', 'Roket'];

  function pickGame(g) {
    Sound.click();
    S.game = g;
    const chip = $('#nameChip');
    setColor(chip, g.color);
    chip.textContent = `${g.icon} ${g.title}`;
    $('#nameInput').value = (S.keepName && Date.now() < S.keepNameUntil) ? S.keepName : '';
    $('#nameErr').textContent = '';
    show('name');
    setTimeout(() => $('#nameInput').focus(), 60);
  }

  function cleanName(s) {
    return s.replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
  }

  $('#nameForm').addEventListener('submit', e => {
    e.preventDefault();
    const n = cleanName($('#nameInput').value);
    if (n.length < 2) {
      $('#nameErr').textContent = 'En az 2 karakterlik bir takma ad yaz 🙂';
      Sound.bad();
      $('#nameInput').focus();
      return;
    }
    S.name = n;
    Sound.click();
    renderIntro();
    show('intro');
    $('#nameInput').blur();
  });
  $('#nameRandom').addEventListener('click', () => {
    $('#nameInput').value = `${Util.pick(ADJ)} ${Util.pick(NOUN)}`;
    $('#nameErr').textContent = '';
    Sound.click();
  });
  $('#nameBack').addEventListener('click', () => goHome(false));

  function renderIntro() {
    const g = S.game, p = $('#introPanel');
    setColor(p, g.color);
    p.innerHTML = `
      <div class="panel-chip" style="--c:${g.color}">${g.skill} · Oyuncu: ${Util.esc(S.name)}</div>
      <div class="intro-icon">${g.icon}</div>
      <h2>${g.title}</h2>
      <ul class="rules">${g.rules.map(([ic, tx]) => `<li><span>${ic}</span>${tx}</li>`).join('')}</ul>
      <div class="intro-meta"><span>⏱ ${g.duration} saniye</span><span>🎮 ${g.controls}</span></div>
      <div class="intro-score">Puanlama: ${g.scoring}</div>
      <div class="btn-row">
        <button class="btn ghost" id="introBack">← Geri</button>
        <button class="btn primary big" id="introGo">Hazırım, başla! ▶</button>
      </div>`;
    $('#introBack').addEventListener('click', () => { show('name'); $('#nameInput').focus(); });
    $('#introGo').addEventListener('click', startGame);
    setTimeout(() => $('#introGo') && $('#introGo').focus(), 50);
  }

  const stage = $('#stage');
  const api = {
    running: () => S.phase === 'running',
    addScore(n) {
      S.score = Math.max(0, S.score + n);
      const el = $('#hudScore');
      el.textContent = S.score;
      el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    },
    status(html) { $('#hudStatus').innerHTML = html || ''; },
    end(reason) { finish(reason); },
    shake() { stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); },
    sfx: Sound
  };

  function startGame() {
    teardown();
    Sound.init();
    const g = S.game;
    const playEl = screens.play;
    setColor(playEl, g.color);
    $('#hudGame').textContent = `${g.icon} ${g.title}`;
    $('#hudPlayer').textContent = `Oyuncu: ${S.name}`;
    S.score = 0; S.elapsed = 0; S.lastSec = -1; S.started = false; S.entry = null;
    $('#hudScore').textContent = '0';
    api.status('');
    updateTimeHud();
    show('play');
    if (document.activeElement) document.activeElement.blur();
    S.inst = g.create(stage, api);
    S.phase = 'countdown';
    $('#cdHint').textContent = g.rules[1][1];
    countdown(beginRunning);
  }

  function beginRunning() {
    S.phase = 'running';
    if (!S.started) { S.started = true; S.inst.start && S.inst.start(); }
  }

  function countdown(done) {
    cancelCountdown();
    const ov = $('#ovCount'), num = $('#cdNum');
    ov.classList.add('show');
    ['3', '2', '1', 'BAŞLA!'].forEach((txt, i) => {
      S.cdTimers.push(setTimeout(() => {
        num.textContent = txt;
        num.classList.toggle('go', i === 3);
        num.style.animation = 'none'; void num.offsetWidth; num.style.animation = '';
        i < 3 ? Sound.tick() : Sound.go();
      }, i * 1000));
    });
    S.cdTimers.push(setTimeout(() => {
      ov.classList.remove('show');
      S.cdTimers = [];
      done();
    }, 3000 + 500));
  }
  function cancelCountdown() {
    S.cdTimers.forEach(clearTimeout);
    S.cdTimers = [];
    $('#ovCount').classList.remove('show');
  }

  function updateTimeHud() {
    const d = S.game ? S.game.duration : 1;
    const left = Math.max(0, d - S.elapsed);
    const sec = Math.ceil(left);
    $('#hudTime').textContent = sec;
    $('#timebar i').style.transform = `scaleX(${left / d})`;
    const low = left <= 5 && S.phase === 'running';
    $('#hudTime').parentElement.classList.toggle('low', low);
    $('#timebar').classList.toggle('low', low);
    if (low && sec !== S.lastSec && sec > 0) Sound.lowTick();
    S.lastSec = sec;
  }

  function pause() {
    if (current !== 'play') return;
    if (S.phase !== 'running' && S.phase !== 'countdown') return;
    cancelCountdown();
    S.phase = 'paused';
    $('#ovPause').classList.add('show');
  }
  function resume() {
    if (S.phase !== 'paused') return;
    $('#ovPause').classList.remove('show');
    S.phase = 'countdown';
    lastFrame = performance.now();
    countdown(beginRunning);
  }
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  $('#btnPause').addEventListener('click', pause);
  $('#btnResume').addEventListener('click', resume);
  $('#btnQuit').addEventListener('click', () => goHome(false));

  function finish(reason) {
    if (S.phase === 'ended' || !S.inst) return;
    S.phase = 'ended';
    cancelCountdown();
    const bonus = S.inst.onEnd ? S.inst.onEnd() : '';
    updateTimeHud();
    Sound.end();
    $('#endReason').textContent = reason || '⏰ Süre doldu!';
    $('#endScore').textContent = S.score;
    $('#endBonus').textContent = bonus || '';
    $('#ovEnd').classList.add('show');

    const entry = { id: Util.uid(), game: S.game.id, name: S.name, score: S.score, ts: Date.now(), day: Util.todayKey() };
    Store.add(entry);
    S.entry = entry;
    setTimeout(() => {
      if (current !== 'play' || S.entry !== entry) return;
      teardown();
      renderResult();
      show('result');
    }, 2200);
  }

  function teardown() {
    cancelCountdown();
    if (S.inst) { try { S.inst.destroy(); } catch (e) { console.error(e); } }
    S.inst = null;
    if (S.phase !== 'none') S.phase = 'none';
    stage.innerHTML = '';
    stage.classList.remove('shake');
    ['#ovPause', '#ovEnd', '#ovCount'].forEach(s => $(s).classList.remove('show'));
  }

  let lastFrame = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    if (S.inst) {
      if (S.phase === 'running') {
        S.elapsed += dt;
        try { S.inst.update(dt); } catch (e) { console.error(e); }
        if (S.phase === 'running' && S.elapsed >= S.game.duration) {
          S.elapsed = S.game.duration;
          finish('⏰ Süre doldu!');
        }
        if (S.phase === 'running') updateTimeHud();
      }
      if (S.inst && S.inst.draw) { try { S.inst.draw(); } catch (e) { console.error(e); } }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const MEDAL = ['🥇', '🥈', '🥉'];
  function boardHTML(gameId, hlId) {
    const list = Store.day(gameId);
    if (!list.length) return `<div class="lb-empty">Bugün henüz skor yok.<br>İlk rekoru sen kır! 🚀</div>`;
    const row = (s, r) => `<tr class="${s.id === hlId ? 'me' : ''}"><td class="rk">${MEDAL[r - 1] || r}</td><td class="nm">${Util.esc(s.name)}</td><td class="sc">${s.score}</td></tr>`;
    let rows = list.slice(0, 10).map((s, i) => row(s, i + 1)).join('');
    if (hlId) {
      const idx = list.findIndex(s => s.id === hlId);
      if (idx >= 10) rows += `<tr class="gap"><td colspan="3">⋯</td></tr>` + row(list[idx], idx + 1);
    }
    return `<table class="lb">${rows}</table>`;
  }

  function renderResult() {
    const g = S.game, e = S.entry;
    const list = Store.day(g.id);
    const rank = list.findIndex(s => s.id === e.id) + 1;
    setColor(screens.result, g.color);
    const chip = $('#resChip');
    chip.textContent = `${g.icon} ${g.title}`;
    setColor(chip, g.color);
    $('#resName').textContent = e.name;
    $('#resScore').textContent = e.score;
    $('#resRank').textContent = `Bugün ${list.length} oyuncu içinde #${rank}`;
    let msg;
    if (rank === 1) msg = list.length > 1 ? '🥇 Günün lideri sensin! Tebrikler!' : '🥇 Günün ilk rekoru senin!';
    else if (rank <= 3) msg = `${MEDAL[rank - 1]} Kürsüdesin! Birinciliğe ${list[0].score - e.score + 1} puan kaldı.`;
    else if (rank <= 10) msg = `🎉 Top 10'dasın! Kürsüye ${list[2].score - e.score + 1} puan kaldı.`;
    else msg = `💪 Top 10'a girmek için ${list[9].score - e.score + 1} puan daha lazım. Bir daha dene!`;
    $('#resMsg').textContent = msg;
    $('#resBoardTitle').textContent = `${g.icon} ${g.title}: Günün Top 10`;
    $('#resBoard').innerHTML = boardHTML(g.id, e.id);
    setTimeout(() => $('#btnReplay').focus(), 50);
  }

  $('#btnReplay').addEventListener('click', () => { Sound.click(); startGame(); });
  $('#btnOther').addEventListener('click', () => {
    S.keepName = S.name;
    S.keepNameUntil = Date.now() + 3 * 60 * 1000;
    goHome(false);
  });
  $('#btnNewPlayer').addEventListener('click', () => goHome(true));

  function renderBoards() {
    const tabs = $('#boardTabs');
    tabs.innerHTML = '';
    GAMES.forEach((g, i) => {
      const b = document.createElement('button');
      b.className = 'tab' + (i === S.boardTab ? ' active' : '');
      setColor(b, g.color);
      b.textContent = `${g.icon} ${g.title}`;
      b.addEventListener('click', () => { S.boardTab = i; S.boardAuto = false; renderBoards(); });
      tabs.appendChild(b);
    });
    const g = GAMES[S.boardTab];
    const p = $('#boardPanel');
    setColor(p, g.color);
    p.innerHTML = `<h3>${g.icon} ${g.title} <span class="chip" style="--c:${g.color}">${g.skill}</span></h3>${boardHTML(g.id)}`;
  }
  function openBoards() { S.boardTab = 0; S.boardAuto = true; renderBoards(); show('boards'); }
  setInterval(() => {
    if (current === 'boards' && S.boardAuto) { S.boardTab = (S.boardTab + 1) % GAMES.length; renderBoards(); }
  }, 8000);
  $('#btnBoards').addEventListener('click', openBoards);
  $('#boardsBack').addEventListener('click', () => goHome(false));
  $('#brandBtn').addEventListener('click', () => { if (current !== 'play') goHome(false); });

  function renderSoundBtn() {
    $('#btnSound').innerHTML = Sound.enabled ? '🔊 <span>Ses açık</span>' : '🔇 <span>Ses kapalı</span>';
  }
  $('#btnSound').addEventListener('click', () => {
    Sound.enabled = !Sound.enabled;
    Store.set('sound', Sound.enabled);
    renderSoundBtn();
    Sound.click();
  });
  function renderFullBtn() {
    $('#btnFull').innerHTML = document.fullscreenElement ? '🗗 <span>Pencere</span>' : '⛶ <span>Tam ekran</span>';
  }
  $('#btnFull').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
  });
  document.addEventListener('fullscreenchange', renderFullBtn);

  let modalOpen = false;
  function modal(opts) {
    return new Promise(resolve => {
      const m = $('#modal'), inp = $('#mInput'), bw = $('#mBtns');
      $('#mTitle').textContent = opts.title;
      $('#mBody').innerHTML = opts.html || '';
      if (opts.input) {
        inp.style.display = '';
        inp.type = opts.input.type || 'text';
        inp.inputMode = opts.input.inputMode || 'text';
        inp.value = '';
        inp.placeholder = opts.input.placeholder || '';
      } else inp.style.display = 'none';
      const buttons = opts.buttons || [{ label: 'Tamam', value: true, cls: 'primary' }];
      bw.innerHTML = '';
      const close = val => {
        m.classList.remove('show');
        modalOpen = false;
        document.removeEventListener('keydown', onKey, true);
        resolve({ value: val, input: inp.value });
      };
      buttons.forEach(b => {
        const el = document.createElement('button');
        el.className = 'btn ' + (b.cls || '');
        el.textContent = b.label;
        el.addEventListener('click', () => close(b.value));
        bw.appendChild(el);
      });
      const onKey = e => {
        if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); close(null); }
        else if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); close(buttons[buttons.length - 1].value); }
      };
      document.addEventListener('keydown', onKey, true);
      modalOpen = true;
      m.classList.add('show');
      setTimeout(() => (opts.input ? inp : bw.lastChild).focus(), 50);
    });
  }
  const alertBox = (title, html) => modal({ title, html });

  async function openAdmin() {
    if (current === 'play') return;
    const r = await modal({
      title: '🔐 Yönetici girişi',
      html: 'Yönetici PIN kodunu gir.',
      input: { type: 'password', inputMode: 'numeric', placeholder: 'PIN' },
      buttons: [{ label: 'Vazgeç', value: false, cls: 'ghost' }, { label: 'Giriş', value: true, cls: 'primary' }]
    });
    if (!r.value) return;
    if (r.input !== Store.settings().pin) { Sound.bad(); await alertBox('Hatalı PIN', 'PIN kodu yanlış.'); return; }
    renderAdmin();
    show('admin');
  }

  function renderAdmin() {
    const today = Util.todayKey();
    $('#admDay').textContent = `(${today})`;
    const all = Store.all();
    let html = '<tr><th>Oyun</th><th class="num">Bugün oynanma</th><th class="num">Günün rekoru</th><th class="num">Tüm zamanlar</th></tr>';
    GAMES.forEach(g => {
      const d = Store.day(g.id);
      html += `<tr><td>${g.icon} ${g.title}</td><td class="num">${d.length}</td><td class="num">${d[0] ? `${d[0].score} (${Util.esc(d[0].name)})` : '–'}</td><td class="num">${all.filter(s => s.game === g.id).length}</td></tr>`;
    });
    const todayCount = all.filter(s => s.day === today).length;
    html += `<tr><th>Toplam</th><th class="num">${todayCount}</th><th></th><th class="num">${all.length}</th></tr>`;
    $('#admSum').innerHTML = html;

    const sel = $('#admGame');
    const prev = sel.value || GAMES[0].id;
    sel.innerHTML = GAMES.map(g => `<option value="${g.id}">${g.icon} ${g.title}</option>`).join('');
    sel.value = prev;
    renderAdminList();
  }

  function renderAdminList() {
    const list = Store.day($('#admGame').value);
    if (!list.length) { $('#admList').innerHTML = '<p class="muted">Bugün bu oyunda skor yok.</p>'; return; }
    const fmt = ts => new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    $('#admList').innerHTML = `<table class="adm-table"><tr><th>#</th><th>Takma ad</th><th class="num">Skor</th><th>Saat</th><th></th></tr>${
      list.map((s, i) => `<tr><td>${i + 1}</td><td>${Util.esc(s.name)}</td><td class="num">${s.score}</td><td>${fmt(s.ts)}</td><td class="num"><button class="del-btn" data-id="${s.id}">🗑 Sil</button></td></tr>`).join('')
    }</table>`;
  }
  $('#admGame').addEventListener('change', renderAdminList);
  $('#admList').addEventListener('click', async e => {
    const b = e.target.closest('.del-btn');
    if (!b) return;
    const s = Store.all().find(x => x.id === b.dataset.id);
    if (!s) return;
    const r = await modal({
      title: 'Skoru sil?',
      html: `<b>${Util.esc(s.name)}</b> (${s.score} puan) kalıcı olarak silinecek.`,
      buttons: [{ label: 'Vazgeç', value: false, cls: 'ghost' }, { label: 'Sil', value: true, cls: 'red' }]
    });
    if (r.value) { Store.remove(s.id); renderAdmin(); }
  });

  function download(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  function toCSV(list) {
    const rank = {};
    const groups = {};
    list.forEach(s => { (groups[s.game + '|' + s.day] = groups[s.game + '|' + s.day] || []).push(s); });
    Object.values(groups).forEach(gl => gl.sort(Store.cmp).forEach((s, i) => { rank[s.id] = i + 1; }));
    const order = GAMES.map(g => g.id);
    const sorted = list.slice().sort((a, b) => a.day.localeCompare(b.day) || order.indexOf(a.game) - order.indexOf(b.game) || rank[a.id] - rank[b.id]);
    const cell = v => {
      let s = String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const lines = [['Tarih', 'Saat', 'Oyun', 'Takma ad', 'Skor', 'Günlük sıra'].map(cell).join(';')];
    sorted.forEach(s => {
      const g = gameById(s.game);
      const time = new Date(s.ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      lines.push([s.day, time, g ? g.title : s.game, s.name, s.score, rank[s.id]].map(cell).join(';'));
    });
    return '﻿' + lines.join('\r\n');
  }
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');

  $('#admCsvToday').addEventListener('click', () => {
    const today = Util.todayKey();
    download(`gdg-skorlar-${today}.csv`, toCSV(Store.all().filter(s => s.day === today)), 'text/csv;charset=utf-8');
  });
  $('#admCsvAll').addEventListener('click', () => {
    download(`gdg-skorlar-tumu-${stamp()}.csv`, toCSV(Store.all()), 'text/csv;charset=utf-8');
  });
  $('#admJson').addEventListener('click', () => {
    const data = { app: 'gdg-oyun-standi', version: 1, exportedAt: new Date().toISOString(), scores: Store.all() };
    download(`gdg-yedek-${stamp()}.json`, JSON.stringify(data, null, 2), 'application/json');
  });
  $('#admImport').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const incoming = (Array.isArray(data) ? data : data.scores || []).filter(s =>
        s && typeof s.id === 'string' && gameById(s.game) && typeof s.name === 'string' &&
        Number.isFinite(s.score) && Number.isFinite(s.ts) && /^\d{4}-\d{2}-\d{2}$/.test(s.day));
      const list = Store.all();
      const ids = new Set(list.map(s => s.id));
      let added = 0;
      incoming.forEach(s => {
        if (ids.has(s.id)) return;
        list.push({ id: s.id, game: s.game, name: cleanName(s.name), score: Math.max(0, Math.round(s.score)), ts: s.ts, day: s.day });
        added++;
      });
      Store.save(list);
      renderAdmin();
      await alertBox('Yedek yüklendi', `${added} yeni skor eklendi (${incoming.length - added} tanesi zaten vardı).`);
    } catch (err) {
      await alertBox('Yüklenemedi', 'Dosya geçerli bir yedek (JSON) değil.');
    }
  });

  $('#admReset').addEventListener('click', async () => {
    const today = Util.todayKey();
    const r = await modal({
      title: '♻ Günü sıfırla',
      html: `Bugünün (${today}) tüm skorları silinecek ve skor tabloları boşalacak.<br>Önce bugünün skorları CSV olarak indirilecek.<br><br>Onaylamak için <b>SIFIRLA</b> yaz.`,
      input: { placeholder: 'SIFIRLA' },
      buttons: [{ label: 'Vazgeç', value: false, cls: 'ghost' }, { label: 'Sıfırla', value: true, cls: 'red' }]
    });
    if (!r.value) return;
    if (r.input.trim().toLocaleUpperCase('tr-TR') !== 'SIFIRLA') { await alertBox('İptal edildi', 'Onay metni eşleşmedi, hiçbir şey silinmedi.'); return; }
    const todays = Store.all().filter(s => s.day === today);
    if (todays.length) download(`gdg-skorlar-${today}-sifirlama-oncesi.csv`, toCSV(todays), 'text/csv;charset=utf-8');
    Store.resetDay(today);
    renderAdmin();
    await alertBox('Gün sıfırlandı', `${todays.length} skor silindi. Skor tabloları artık boş.`);
  });

  $('#admWipe').addEventListener('click', async () => {
    const r = await modal({
      title: '🗑 Tüm verileri sil',
      html: 'Tüm günlere ait <b>bütün skorlar</b> kalıcı olarak silinecek. Önce tam yedek (JSON) indirilecek.<br><br>Onaylamak için <b>SIL</b> yaz.',
      input: { placeholder: 'SIL' },
      buttons: [{ label: 'Vazgeç', value: false, cls: 'ghost' }, { label: 'Hepsini sil', value: true, cls: 'red' }]
    });
    if (!r.value) return;
    const v = r.input.trim().toLocaleUpperCase('tr-TR');
    if (v !== 'SIL' && v !== 'SİL') { await alertBox('İptal edildi', 'Onay metni eşleşmedi, hiçbir şey silinmedi.'); return; }
    const all = Store.all();
    if (all.length) download(`gdg-yedek-silme-oncesi-${stamp()}.json`, JSON.stringify({ app: 'gdg-oyun-standi', version: 1, exportedAt: new Date().toISOString(), scores: all }, null, 2), 'application/json');
    Store.save([]);
    renderAdmin();
  });

  $('#admPin').addEventListener('click', async () => {
    const r = await modal({
      title: '🔑 Yeni PIN',
      html: '4–8 haneli yeni bir PIN gir.',
      input: { type: 'password', inputMode: 'numeric', placeholder: 'Yeni PIN' },
      buttons: [{ label: 'Vazgeç', value: false, cls: 'ghost' }, { label: 'Kaydet', value: true, cls: 'primary' }]
    });
    if (!r.value) return;
    if (!/^\d{4,8}$/.test(r.input)) { await alertBox('Geçersiz PIN', 'PIN yalnızca 4–8 rakamdan oluşmalı.'); return; }
    Store.set('pin', r.input);
    await alertBox('PIN güncellendi', 'Yeni PIN kaydedildi.');
  });

  $('#admExit').addEventListener('click', () => goHome(true));
  $('#btnAdmin').addEventListener('click', openAdmin);

  document.addEventListener('keydown', e => {
    if (modalOpen) return;
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyA') { e.preventDefault(); openAdmin(); return; }
    const k = e.key;
    switch (current) {
      case 'home': {
        const n = parseInt(k, 10);
        if (n >= 1 && n <= GAMES.length) pickGame(GAMES[n - 1]);
        break;
      }
      case 'name':
        if (k === 'Escape') goHome(false);
        break;
      case 'intro':
        if (k === 'Escape') { show('name'); $('#nameInput').focus(); }
        else if (k === 'Enter' && document.activeElement !== $('#introBack')) { e.preventDefault(); startGame(); }
        break;
      case 'play':
        if (S.phase === 'paused') {
          if (k === 'Enter' || k === ' ') { e.preventDefault(); resume(); }
        } else if (k === 'Escape' || k === 'p' || k === 'P') pause();
        break;
      case 'result':
        if (k === 'Escape') goHome(true);
        break;
      case 'boards':
        if (k === 'Escape') goHome(false);
        break;
    }
  });

  let lastAct = Date.now();
  ['pointerdown', 'pointermove', 'keydown'].forEach(ev => window.addEventListener(ev, () => { lastAct = Date.now(); }, { passive: true }));
  setInterval(() => {
    if (modalOpen) return;
    const idle = Date.now() - lastAct;
    if ((current === 'name' || current === 'intro') && idle > 90000) goHome(true);
    else if (current === 'result' && idle > 60000) goHome(true);
    else if (current === 'play' && S.phase === 'paused' && idle > 120000) goHome(true);
    else if (current === 'admin' && idle > 180000) goHome(true);
  }, 2000);

  let dayNow = Util.todayKey();
  setInterval(() => {
    const d = Util.todayKey();
    if (d !== dayNow) { dayNow = d; if (current === 'home') renderHome(); }
  }, 30000);

  window.addEventListener('storage', e => { if (e.key === Store.KEY && current === 'home') renderHome(); });

  document.addEventListener('contextmenu', e => { if (current !== 'admin') e.preventDefault(); });
  document.addEventListener('dragstart', e => e.preventDefault());

  renderSoundBtn();
  renderFullBtn();
  renderHome();
})();
