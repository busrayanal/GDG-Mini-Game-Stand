# 🎮 GDG on Campus Mini Game Stand

🇬🇧 **English** | [🇹🇷 Türkçe](README.tr.md)

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

An **offline platform with 5 mini games**, built for the GDG on Campus EBYÜ stand computer. No installation, server or libraries needed: it's written in plain HTML, CSS and JavaScript.

**▶️ Play in your browser:** https://busrayanal.github.io/gdg-oyun-standi/

> [!NOTE]
> The game's user interface is in Turkish.

## 🕹️ Games

| Game | Skill | Time | Controls |
|---|---|---|---|
| 🎈 Balon Patlat (*Balloon Pop*) | Reflexes | 30 s | Mouse / touch |
| 🎨 Renk Tuzağı (*Color Trap*) | Attention | 40 s | Touch / keys 1–4 |
| 🎯 Tam İsabet (*Bullseye*) | Timing | 40 s | Space / click / touch |
| 💡 Işık Hafızası (*Light Memory*) | Memory | 60 s, 3 lives | Touch / keys 1–4 |
| 🧺 Bug Avcısı (*Bug Hunter*) | Dexterity | 45 s, 3 lives | Mouse / finger / ← → |

Each game has its own **daily Top 10** leaderboard. Leaderboards reset automatically when the day changes; older scores are kept for export.

## ✨ Features

- **Works offline:** Even the sounds are generated in code with WebAudio, so nothing is downloaded.
- **Persistent scores:** Scores are kept in the browser's local storage (localStorage) and survive page reloads and restarts.
- **Built for a stand:** Fullscreen (kiosk) mode, automatic return to the home screen when nobody is around, auto-pause when the tab loses focus, and auto-rotating leaderboards.
- **Admin panel:** PIN-protected; CSV/JSON export, restore from backup and score deletion.
- **Keyboard, mouse and touchscreen** support.

## ▶️ Running at the Stand

- **Easiest:** Double-click `baslat.bat`. Chrome (or Edge if Chrome isn't installed) opens in fullscreen kiosk mode. Press **Alt+F4** to exit.
- **Alternative:** Open `index.html` in Chrome or Edge and press the **⛶ Fullscreen** button at the top right (or F11).

> [!IMPORTANT]
> Scores are tied to the browser and the folder path:
> - Always use **the same browser** and **the same folder path** during the event. If you move the folder, the scores stay with the old path.
> - Don't use a private/InPrivate window.
> - Take a backup from the admin panel at the end of the day.

## ⌨️ Shortcuts

| Screen | Key |
|---|---|
| Home | `1`–`5` to pick a game |
| Instructions | `Enter` to start |
| In game | `Esc` / `P` to pause, `Enter` to resume |
| Anywhere | `Ctrl+Shift+A` for the admin panel |

## 🔐 Admin Panel

Open it from the faint **Yönetici** (*Admin*) link at the bottom right or with `Ctrl+Shift+A`. **Default PIN: `2468`.** Change it first thing.

- Today's summary (plays and high score per game)
- CSV export (today or all; Excel-compatible, `;`-separated) and full backup (JSON)
- Restore from a JSON backup (when moving to another computer)
- Delete individual scores (for inappropriate nicknames)
- **Reset the day:** downloads today's scores as CSV first, then clears them
- Change the PIN, delete all data (downloads a JSON backup first)

## 📁 Project Structure

```
gdg-oyun-standi/
├── index.html        # All screens (home, nickname, game, result, leaderboards, admin)
├── baslat.bat        # Launches the stand computer in kiosk mode
├── css/style.css
└── js/
    ├── core.js       # Shared helpers, score store, sounds, canvas and effects
    ├── app.js        # Platform flow, leaderboards, admin panel
    └── games/        # One file per game
```

## ➕ Adding a New Game

1. Add a file under `js/games/` and register the game with `GAMES.push({...})`.
2. Add a `<script>` tag for that file in `index.html`.

A game defines these fields:

```js
GAMES.push({
  id, title, skill, icon, color, duration, tagline, rules, controls, scoring,
  create(stage, api) {
    // returns: { start?(), update(dt), draw?(), onEnd?(), destroy() }
  }
});
```

- `onEnd()` is optional and returns a bonus text shown on the result screen.
- `api`: `running()`, `addScore(n)`, `status(html)`, `end(reason)`, `shake()`, `sfx`

Platform flow: **Pick a game → nickname → instructions → 3 s countdown → play → result → home**

## 👩‍💻 Developer

**Büşra Amine Yanal** · [GitHub](https://github.com/busrayanal)
