# AMS PomoTimer

A Pomodoro timer for the phone, with **phases**, not just a 25-minute countdown. A session walks you through start-up, preparation, one or more Pomodoros with pauses, and a cool-down. It is a PWA: install it to your phone's home screen and it works offline.

**Live:** https://marsch124.github.io/AMS-PomoTimer/

## What it does

- **Phased sessions** — Start-up → Preparation → Pomodoro → Pause → Pomodoro → Cool-down (plus Long break, or any order you like).
- **Templates** — Save as many sequences as you want. Each phase has its own name and duration. Reorder, duplicate, delete. A "Pomodoro block" helper adds N Pomodoros with pauses in one tap.
- **Quick start** — Tap a template on the home screen and it starts immediately. The last-used template is listed first. There is also a one-phase quick timer (5 / 10 / 15 / 25 / 45 / 60 minutes, or any number).
- **Timer screen** — Big countdown with a progress ring in the phase colour, phase list you can jump around in, session progress bar with the expected end time, and controls for pause, skip, previous, +1 / −1 minute.
- **Auto-advance or wait** — Phases can start automatically or wait for a tap. Set it globally or per template.
- **Not quite ready?** — When a phase rings out, tap *1 min more* or *5 min more* to reopen it for the extra time. The next phase starts fresh afterwards.
- **Alerts** — Chimes (different for focus and break), vibration, optional notifications, and countdown ticks in the last three seconds.
- **Works with the screen locked** — An inaudible track keeps the timer and the chimes alive in the background, and the lock screen shows play / pause / skip with the current phase. Chimes play even with the ring switch on silent.
- **Voice announcements** — Optional spoken cue at every phase change.
- **Hold to adjust** — Hold a quick-start card to change the number of Pomodoros, wait-for-tap, tags, and note what you intend to work on before starting.
- **Intention, interruptions, tags** — The intention stays on the timer screen and in History; one tap logs an interruption; tags give you focus minutes per topic each week.
- **Keep screen awake** — Uses the Wake Lock API while a session is running.
- **History** — Every session is logged with Pomodoros completed and focus minutes. Today, this week, and all-time stats. Charts for the last four weeks and by hour of day; current and longest streak.
- **Daily goal** — Pomodoros per day; the Timer tab shows a ring filling up, what's left, and your streak.
- **Export / import** — Templates, history and settings as one JSON file; share the backup straight to Files, Mail or AirDrop; a gentle reminder when the last backup is old.
- **Share templates** — As a QR code (scan with the camera) or a link; paste a link or code under Settings to import.
- **German** — Full German translation, switchable in Settings; voice announcements follow.
- **Larger text** — Two larger text sizes for reading without glasses.
- **Phone only** — Designed for a phone held upright; no tablet or desktop layout.
- **Shortcut links** — `?action=start&template=Name`, `?action=quick&min=25`, `?action=last` for Shortcuts, automations and bookmarks.
- **Dark / light** — Follows the system, or pick one. Deep indigo with hot pink, sunshine, cyan, lime, turquoise and violet; warm cream in light mode.
- **Hand-drawn icons** — Every icon in the app, including the app icon, is drawn by hand as a few SVG strokes. No emoji, no icon font, no stock set.
- **How this works** — Settings has a built-in explanation of sessions, templates, controls, alerts and background behaviour, plus a full version description.
- **Offline** — All data stays on the device in localStorage. No accounts, no servers.

## Install on your phone

- **iPhone:** open the live link in Safari → Share → *Add to Home Screen*.
- **Android:** open in Chrome → Menu → *Install app*.

Home-screen shortcuts (long-press the icon on Android) let you start the last template or jump to Templates.

## Good to know

- The countdown is based on the clock, so it stays correct when the phone sleeps or you switch apps.
- Phones stop running web apps in the background, so **chimes only play while the app is on screen**. Turn on *Keep screen awake* in Settings for the intended experience. Notifications help on Android when the app is in the background; on iOS they only work once the app is installed to the home screen.

## Built-in templates

| Template | Phases |
| --- | --- |
| Classic Pomodoro | Start-up 2 · Preparation 3 · Pomodoro 25 · Pause 5 · Pomodoro 25 · Cool-down 5 |
| Four Pomodoros | Start-up 2 · Preparation 3 · 4 × Pomodoro 25 with pauses 5 / 5 / long break 15 · Cool-down 5 |
| Deep Work 50/10 | Start-up 2 · Preparation 5 · Focus 50 · Pause 10 · Focus 50 · Cool-down 10 |
| Short Burst | Preparation 1 · Pomodoro 15 · Pause 3 · Pomodoro 15 · Cool-down 2 |
| Single Pomodoro | Preparation 1 · Pomodoro 25 · Cool-down 2 |

All of them can be edited or deleted. *Settings → Restore built-in templates* brings back any you removed.

## For developers

Plain HTML, CSS and JavaScript. No build step, no dependencies.

```
AMS-PomoTimer/
├── index.html        # App shell (all screens)
├── manifest.json     # PWA manifest (relative paths, works in any folder)
├── sw.js             # Service worker: offline cache
├── css/style.css
├── js/
│   ├── store.js      # Templates, settings, history (localStorage)
│   ├── timer.js      # Timer engine (timestamp based, survives reloads)
│   ├── audio.js      # Synthesised chimes, keep-alive track, voice
│   ├── i18n.js       # Languages (English in the markup, German dictionary)
│   ├── qr.js         # QR code encoder for template sharing
│   └── app.js        # Screens and UI wiring
└── icons/
    ├── icon.svg      # Hand-drawn app icon (source)
    └── *.png         # Rasterised from icon.svg (192, 512, 512 maskable, 180 Apple, 64 favicon)
```

The in-app icons live as an SVG sprite at the top of `index.html`; add a `<symbol>` there and reference it with `icon('name')` in `app.js`.

Run locally:

```bash
cd AMS-PomoTimer
python3 -m http.server 7794
```

Then open http://localhost:7794.


## Version history

**v1.8.0 (2026-09-04)**
- A closing note on the summary screen, kept with the session; tap a session in History to write or change it later.

**v1.7.0 (2026-09-04)**
- A paused or waiting session nudges after ten minutes and, after 45, asks whether to carry on, finish and keep it, or discard it.

**v1.6.8 (2026-09-04)**
- Tabs sit at the bottom edge; the strip below them takes the bar colour.

**v1.6.5 (2026-09-04)**
- Updates apply themselves after download; "Update now" button in Settings.

**v1.6.4 (2026-09-03)**
- "How this works" and "Version" in Settings fold away; compact one-line colour legend.

**v1.6.2 (2026-09-03)**
- Colour legend under the quick-start cards explaining the phase bar.

**v1.6.1 (2026-09-03)**
- Phone only: the tablet and landscape layout was removed.

**v1.6.0 (2026-09-03)**
- Share templates as QR code or link (own QR encoder, no dependencies); paste-to-import; share backup via the system share sheet; monthly backup reminder.
- German language, larger text sizes, shortcut links.

**v1.5.0 (2026-09-03)**
- Daily goal ring with streak on the Timer tab; celebration on reaching it.
- History charts: focus per day (4 weeks), focus by hour, streaks, best hour.

**v1.4.0 (2026-09-03)**
- Intention shown under the ring (tap to edit) and saved with the session.
- Interruption counter on the timer screen; count in the summary and History.
- Tags on templates and sessions; History shows focus per tag for the week.

**v1.3.0 (2026-09-03)**
- Alerts with the screen locked: inaudible keep-alive track while a session runs, lock-screen transport controls, chimes through the media channel.
- Voice announcements (optional).
- Hold a template to open the start sheet: Pomodoro count, wait-for-tap, intention, phase preview and end time.

**v1.2.0 (2026-09-03)**
- "1 min more" / "5 min more" after a phase ends: reopens the finished phase for the extra time, while waiting for a tap or for two minutes after an automatic advance. Extra time counts as focus minutes without counting the Pomodoro twice.

**v1.1.0 (2026-09-03)**
- Hand-drawn SVG icons throughout: tab bar, timer controls, editor, template icons (15 to choose from), phase symbols (sunrise, checklist, tomato, coffee, lotus, moon) and a hand-drawn app icon.
- New colour scheme: deep indigo ground with bright phase colours; cards, buttons and the progress ring glow in the template or phase colour. Warm cream light mode.
- "How this works" and a full version description in Settings.
- Faint version tag at the bottom of the Timer tab.
- Templates saved by 1.0 are migrated automatically (emoji mapped to the closest drawing).

**v1.0.0 (2026-09-03)** — Initial release: phased sessions, templates, quick start, history, alerts, offline support.
