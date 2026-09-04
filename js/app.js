/* AMS PomoTimer — UI and app wiring */

const APP_VERSION = '1.6.3';

// After an automatic advance, the "1 / 5 min more" offer for the phase that
// just rang out stays on screen for this long.
const EXTEND_GRACE_MS = 2 * 60 * 1000;

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

/* ================= Helpers ================= */
function pad(n) { return String(n).padStart(2, '0'); }

function fmtClock(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function fmtDuration(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${pad(m)}m`;
    if (sec < 60) return `${s}s`;
    if (s) return `${m}m ${s}s`;
    return `${m} min`;
}

function fmtTime(ts) {
    const d = new Date(ts);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function fmtDay(ts) {
    const today = Store.dayKey(Date.now());
    const yesterday = Store.dayKey(Date.now() - 86400000);
    const key = Store.dayKey(ts);
    if (key === today) return t('Today');
    if (key === yesterday) return t('Yesterday');
    return new Date(ts).toLocaleDateString(I18N.locale(), { weekday: 'short', day: 'numeric', month: 'short' });
}

function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function phaseInfo(type) { return Store.PHASE_TYPES[type] || Store.PHASE_TYPES.focus; }

/* Inline hand-drawn icon from the sprite in index.html. */
function icon(name, cls) {
    return `<svg class="ic ${cls || ''}" aria-hidden="true"><use href="#i-${esc(name)}"/></svg>`;
}

function setIcon(useEl, name) {
    useEl.setAttribute('href', '#i-' + name);
}

function segmentsHtml(steps) {
    const total = steps.reduce((a, s) => a + s.seconds, 0) || 1;
    return '<span class="segments">' + steps.map(s =>
        `<span style="width:${(s.seconds / total * 100).toFixed(2)}%;background:${phaseInfo(s.type).color}"></span>`
    ).join('') + '</span>';
}

/* Returns HTML (already escaped). */
function templateMeta(tpl) {
    const total = Store.templateTotalSec(tpl);
    const pomos = tpl.steps.filter(s => s.type === 'focus').length;
    return `${esc(fmtDuration(total))} · ${tpl.steps.length} ${esc(t('phases'))} · ${pomos} ${icon('tomato', 'ic-xs')}`;
}

let toastTimer = null;
function toast(msg, ms) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, ms || 2200);
}

function confirmDialog(text, okLabel) {
    return new Promise(resolve => {
        const modal = $('#modal');
        $('#modal-text').textContent = text;
        $('#modal-ok').textContent = okLabel || 'OK';
        modal.hidden = false;
        const done = (v) => { modal.hidden = true; ok.removeEventListener('click', onOk); cancel.removeEventListener('click', onCancel); resolve(v); };
        const ok = $('#modal-ok'), cancel = $('#modal-cancel');
        const onOk = () => done(true), onCancel = () => done(false);
        ok.addEventListener('click', onOk);
        cancel.addEventListener('click', onCancel);
    });
}

/* ================= Sound / vibration / notifications ================= */
const Sound = (() => {
    let ctx = null;
    function unlock() {
        try {
            if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume();
        } catch (e) { /* no audio available */ }
        // The media elements must be started inside a tap as well.
        BgAudio.prime();
        syncKeepAlive();
    }
    function tone(freq, at, dur, vol, type) {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + at;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur + 0.05);
    }
    function chime(kind) {
        if (!Store.getSettings().sound) return;
        // Media elements keep working with the screen locked; Web Audio is the fallback.
        if (BgAudio.playChime(kind)) return;
        unlock();
        if (!ctx) return;
        switch (kind) {
            case 'focus':
                tone(523.25, 0, 0.35, 0.3); tone(659.25, 0.15, 0.35, 0.3); tone(783.99, 0.3, 0.5, 0.3);
                break;
            case 'break':
                tone(659.25, 0, 0.4, 0.22); tone(523.25, 0.2, 0.55, 0.22);
                break;
            case 'done':
                tone(523.25, 0, 0.4, 0.3); tone(659.25, 0.18, 0.4, 0.3); tone(783.99, 0.36, 0.4, 0.3); tone(1046.5, 0.54, 0.8, 0.3);
                break;
            case 'tick':
                tone(880, 0, 0.07, 0.15, 'square');
                break;
            default:
                tone(660, 0, 0.3, 0.25); tone(880, 0.15, 0.4, 0.25);
        }
    }
    return { unlock, chime };
})();

/* The inaudible keep-alive loop runs whenever a session exists (paused or
   not) and the setting allows it. */
function syncKeepAlive() {
    BgAudio.setKeepAlive(Store.getSettings().bgAudio && Timer.isActive());
}

/* Lock-screen / control-centre transport controls. They appear as soon as
   the keep-alive track plays, and show the phase and template. */
const MediaCtl = (() => {
    const ok = 'mediaSession' in navigator;
    function bind() {
        if (!ok) return;
        const set = (a, fn) => { try { navigator.mediaSession.setActionHandler(a, fn); } catch (e) { /* unsupported action */ } };
        set('play', () => { const s = Timer.snapshot(); if (!s) return; if (s.status === 'waiting') Timer.startWaiting(); else Timer.resume(); renderTimer(true); });
        set('pause', () => { Timer.pause(); renderTimer(true); });
        set('nexttrack', () => Timer.next());
        set('previoustrack', () => Timer.prev());
        set('stop', () => Timer.stop());
    }
    function update() {
        if (!ok) return;
        const s = Timer.snapshot();
        try {
            if (!s) { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; return; }
            navigator.mediaSession.metadata = new MediaMetadata({
                title: `${s.step.label} · ${fmtDuration(s.step.seconds)}`,
                artist: s.run.name,
                album: 'AMS PomoTimer',
                artwork: [{ src: new URL('icons/icon-512.png', location.href).href, sizes: '512x512', type: 'image/png' }]
            });
            navigator.mediaSession.playbackState = s.status === 'running' ? 'playing' : 'paused';
        } catch (e) { /* ignore */ }
    }
    return { bind, update };
})();

/* Spoken announcements, if enabled. */
function announce(text) {
    if (!Store.getSettings().voice) return;
    Voice.say(text, I18N.speechLang());
}

function vibrate(pattern) {
    if (!Store.getSettings().vibrate) return;
    // Browsers ignore vibration before the first tap (e.g. a session restored on reload).
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* ignore */ }
}

async function notify(title, body) {
    const s = Store.getSettings();
    if (!s.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    if (!document.hidden) return; // the screen itself is the alert while visible
    try {
        const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
        if (reg && reg.showNotification) {
            reg.showNotification(title, { body, tag: 'pomo-phase', renotify: true, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' });
        } else {
            new Notification(title, { body, tag: 'pomo-phase', icon: 'icons/icon-192.png' });
        }
    } catch (e) { console.warn('notify failed', e); }
}

/* ================= Wake lock ================= */
const Wake = (() => {
    let sentinel = null;
    async function acquire() {
        if (!('wakeLock' in navigator) || sentinel) return;
        try {
            sentinel = await navigator.wakeLock.request('screen');
            sentinel.addEventListener('release', () => { sentinel = null; });
        } catch (e) { sentinel = null; }
    }
    function release() {
        if (sentinel) { sentinel.release().catch(() => {}); sentinel = null; }
    }
    function sync() {
        const snap = Timer.snapshot();
        const want = Store.getSettings().wakeLock && snap && snap.status === 'running' && currentScreen === 'timer' && !document.hidden;
        if (want) acquire(); else release();
    }
    return { sync, release };
})();

/* ================= Theme ================= */
function applyTheme() {
    const s = Store.getSettings();
    const th = s.theme;
    if (th === 'dark' || th === 'light') document.documentElement.setAttribute('data-theme', th);
    else document.documentElement.removeAttribute('data-theme');
    const dark = th === 'dark' || (th !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    $('meta[name="theme-color"]').setAttribute('content', dark ? '#120f2e' : '#fff6ea');
    document.documentElement.style.fontSize = { large: '112.5%', xlarge: '125%' }[s.textSize] || '';
}

function applyLanguage() {
    const s = Store.getSettings();
    const detected = (navigator.language || '').toLowerCase().startsWith('de') ? 'de' : 'en';
    I18N.setLang(s.lang || detected);
    I18N.apply();
}

/* ================= Screens ================= */
let currentScreen = 'home';
const NO_TABBAR = new Set(['timer', 'done', 'editor']);
const TAB_OF = { home: 'home', timer: 'home', done: 'home', templates: 'templates', editor: 'templates', history: 'history', settings: 'settings' };

function showScreen(name) {
    currentScreen = name;
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
    document.body.classList.toggle('no-tabbar', NO_TABBAR.has(name));
    document.body.dataset.tab = TAB_OF[name];
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === TAB_OF[name]));
    const screen = $('#screen-' + name);
    if (screen) { const c = $('.content', screen); if (c) c.scrollTop = 0; }
    if (name === 'home') renderHome();
    if (name === 'templates') renderTemplates();
    if (name === 'history') renderHistory();
    if (name === 'settings') renderSettings();
    if (name === 'timer') renderTimer(true);
    Wake.sync();
}

/* ================= Home ================= */
function statsHtml(list) {
    return list.map(s => `<div class="stat"><div class="stat-value">${esc(s.value)}</div><div class="stat-label">${esc(s.label)}</div></div>`).join('');
}

function renderHome() {
    const snap = Timer.snapshot();
    const resume = $('#home-resume');
    if (snap) {
        resume.hidden = false;
        const st = t(snap.status === 'paused' ? 'paused' : snap.status === 'waiting' ? 'waiting for you' : 'running');
        $('#resume-sub').innerHTML = `${icon(Store.iconFor(snap.run), 'ic-xs')} ${esc(snap.run.name)} · ${esc(snap.step.label)} · ${fmtClock(snap.remainingMs)} (${st})`;
    } else {
        resume.hidden = true;
    }

    const templates = Store.getTemplates();
    const lastId = Store.getLastTemplateId();
    const ordered = templates.slice().sort((a, b) => (a.id === lastId ? -1 : b.id === lastId ? 1 : 0));
    $('#quick-grid').innerHTML = ordered.map(t => `
        <button class="quick-card" data-id="${esc(t.id)}" style="--tpl-color:${esc(t.color || '#FF2E63')}">
            <span class="quick-icon">${icon(Store.iconFor(t))}</span>
            <span class="quick-name">${esc(t.name || I18N.t('Untitled'))}${t.id === lastId ? ` <span class="muted">${esc(I18N.t('· last'))}</span>` : ''}</span>
            <span class="quick-meta">${templateMeta(t)}</span>
            ${segmentsHtml(t.steps)}
        </button>`).join('') +
        `<button class="quick-card add-card" data-action="new">${icon('plus')} ${esc(I18N.t('New template'))}</button>`;

    renderPhaseLegend();

    const s = Store.stats();
    $('#home-stats').innerHTML = statsHtml([
        { value: s.today.pomodoros, label: t('Pomodoros') },
        { value: fmtDuration(s.today.focusSec), label: t('Focus') },
        { value: s.today.sessions, label: t('Sessions') }
    ]);
    renderGoalCard(s);
    $('#home-version').textContent = 'AMS PomoTimer v' + APP_VERSION;
    maybeBackupReminder();
}

/* What the coloured bar in each card means: one segment per phase, in
   order, as long as the phase, in the phase colour. */
function renderPhaseLegend() {
    const items = Object.entries(Store.PHASE_TYPES).map(([type, info]) =>
        `<span class="legend-item"><span class="legend-swatch" style="background:${info.color}"></span>${esc(t(info.label))}</span>`).join('');
    $('#phase-legend').innerHTML = `<span class="legend-key" title="${esc(t('The bar in each card is the session: one block per phase, in order, as long as the phase lasts.'))}">${esc(t('Bar'))}:</span>${items}`;
}

/* About once a month, if there is something worth keeping and no export for a while. */
function maybeBackupReminder() {
    const DAY = 86400000;
    if (Store.getHistory().length < 8) return;
    if (Date.now() - Store.getLastExport() < 30 * DAY) return;
    if (Date.now() - Store.getLastBackupNag() < 7 * DAY) return;
    Store.setLastBackupNag();
    setTimeout(() => toast(t('It has been a while since your last backup. Settings → Export keeps your templates and history safe.'), 5000), 800);
}

const GOAL_C = 2 * Math.PI * 26;
function renderGoalCard(s) {
    const goal = Store.getSettings().dailyGoal;
    const card = $('#goal-card');
    if (!goal) { card.hidden = true; return; }
    card.hidden = false;
    const done = s.today.pomodoros;
    const frac = Math.min(1, done / goal);
    $('#goal-fg').style.strokeDashoffset = (GOAL_C * (1 - frac)).toFixed(2);
    $('#goal-num').textContent = done;
    card.classList.toggle('reached', done >= goal);
    $('#goal-title').textContent = done >= goal ? t('Daily goal reached: {a} of {b}', { a: done, b: goal }) : t('{a} of {b} Pomodoros today', { a: done, b: goal });
    const ins = Store.insights(1);
    const parts = [];
    if (ins.streak > 0) parts.push(`${icon('flame', 'ic-xs')} ${esc(t('{n}-day streak', { n: ins.streak }))}`);
    if (done < goal) parts.push(esc(t('{n} to go', { n: goal - done })));
    else parts.push(esc(t('Nice work')));
    $('#goal-sub').innerHTML = parts.join(' · ');
}

function startTemplate(tpl, opts) {
    if (!tpl) return;
    if (Timer.isActive()) {
        // Starting a new one replaces the current session; ask first.
        confirmDialog(t('A session is already running. Stop it and start a new one?'), t('Start new')).then(ok => {
            if (!ok) return;
            suppressDoneScreen = true;
            Timer.stop();
            suppressDoneScreen = false;
            beginRun(tpl, opts);
        });
        return;
    }
    beginRun(tpl, opts);
}

let lastStartedTemplate = null;
let suppressDoneScreen = false;
let goalJustReached = false;

function beginRun(tpl, opts) {
    Sound.unlock();
    const run = Timer.start(tpl, opts || {});
    if (!run) { toast(t('This template has no phases with a duration.')); return; }
    lastStartedTemplate = tpl;
    syncKeepAlive();
    MediaCtl.update();
    showScreen('timer');
}

/* ================= Start sheet (long-press a template) ================= */
let sheet = null; // { tpl, count, wait, steps, hasFocus }
let suppressClickUntil = 0;

/* Rebuild a template's phases for a different number of Pomodoros. Phases
   before the first Pomodoro and after the last one are kept as they are; in
   between, the template's own pattern of breaks is repeated. */
function rebuildSteps(steps, count) {
    const first = steps.findIndex(s => s.type === 'focus');
    if (first < 0) return steps.map(s => ({ ...s }));
    let last = first;
    steps.forEach((s, i) => { if (s.type === 'focus') last = i; });
    const prefix = steps.slice(0, first);
    const suffix = steps.slice(last + 1);
    const focusStep = steps[first];
    const breaks = [];
    let cur = [];
    for (let i = first + 1; i <= last; i++) {
        if (steps[i].type === 'focus') { breaks.push(cur); cur = []; }
        else cur.push(steps[i]);
    }
    const core = [];
    for (let i = 0; i < count; i++) {
        core.push({ ...focusStep, id: Store.uid('s') });
        if (i < count - 1) {
            const pattern = breaks.length ? breaks[i % breaks.length] : [Store.step('pause', 5)];
            pattern.forEach(b => core.push({ ...b, id: Store.uid('s') }));
        }
    }
    return [...prefix, ...core, ...suffix].map(s => ({ ...s }));
}

function openStartSheet(tpl) {
    if (!tpl) return;
    const settings = Store.getSettings();
    const count = tpl.steps.filter(s => s.type === 'focus').length;
    sheet = {
        tpl,
        count,
        hasFocus: count > 0,
        wait: tpl.autoAdvance === false ? true : tpl.autoAdvance === true ? false : !settings.autoAdvance,
        steps: tpl.steps.map(s => ({ ...s }))
    };
    $('#sheet-icon').innerHTML = icon(Store.iconFor(tpl));
    $('#sheet-icon').style.background = tpl.color || '#FF2E63';
    $('#sheet-title').textContent = tpl.name || t('Untitled');
    $('#sheet-pomo-row').hidden = !sheet.hasFocus;
    $('#sheet-wait').checked = sheet.wait;
    $('#sheet-intention').value = '';
    sheet.tags = Store.cleanTags(tpl.tags);
    renderSheetTags();
    renderSheet();
    $('#sheet').hidden = false;
}

function renderSheetTags() {
    const all = Store.allTags().slice(0, 10);
    sheet.tags.forEach(t => { if (!all.includes(t)) all.unshift(t); });
    $('#sheet-tags').innerHTML = all.map(t =>
        `<button class="chip tag-choice ${sheet.tags.includes(t) ? 'selected' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('');
}

function renderSheet() {
    if (!sheet) return;
    sheet.steps = sheet.hasFocus ? rebuildSteps(sheet.tpl.steps, sheet.count) : sheet.tpl.steps.map(s => ({ ...s }));
    $('#sheet-pomo-count').textContent = sheet.count;
    $('#sheet-pomo-minus').disabled = sheet.count <= 1;
    $('#sheet-pomo-plus').disabled = sheet.count >= 12;
    $('#sheet-segments').innerHTML = segmentsHtml(sheet.steps);
    $('#sheet-phases').innerHTML = sheet.steps.map(s =>
        `<span class="mini-phase" style="--c:${phaseInfo(s.type).color}">${icon(phaseInfo(s.type).icon, 'ic-xs')} ${esc(fmtDuration(s.seconds))}</span>`).join('');
    const total = sheet.steps.reduce((a, s) => a + s.seconds, 0);
    $('#sheet-summary').textContent = t('{n} phases · {d} · ends {t}', { n: sheet.steps.length, d: fmtDuration(total), t: fmtTime(Date.now() + total * 1000) });
}

function closeSheet() {
    $('#sheet').hidden = true;
    sheet = null;
}

function startFromSheet() {
    if (!sheet) return;
    const tpl = { ...sheet.tpl, steps: sheet.steps, autoAdvance: sheet.wait ? false : true };
    const intention = $('#sheet-intention').value.trim();
    const tags = sheet.tags.slice();
    closeSheet();
    startTemplate(tpl, { intention, tags });
}

/* Long-press detection for pointer devices and touch alike. */
function bindLongPress(container, selector, onLong) {
    let timer = null, startX = 0, startY = 0;
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
    container.addEventListener('pointerdown', e => {
        const el = e.target.closest(selector);
        if (!el) return;
        startX = e.clientX; startY = e.clientY;
        cancel();
        timer = setTimeout(() => {
            timer = null;
            suppressClickUntil = Date.now() + 700;
            vibrate([25]);
            onLong(el);
        }, 450);
    });
    container.addEventListener('pointermove', e => {
        if (timer && (Math.abs(e.clientX - startX) > 12 || Math.abs(e.clientY - startY) > 12)) cancel();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => container.addEventListener(ev, cancel));
    container.addEventListener('contextmenu', e => { if (e.target.closest(selector)) e.preventDefault(); });
}

/* ================= Timer screen ================= */
const RING_C = 2 * Math.PI * 90;
let uiInterval = null;
let lastRenderedIndex = -1;
let lastRenderedStatus = null;

function renderTimer(full) {
    const snap = Timer.snapshot();
    if (!snap) return;
    const { run, step, status } = snap;
    const info = phaseInfo(step.type);
    const screen = $('#screen-timer');

    if (full || snap.index !== lastRenderedIndex || status !== lastRenderedStatus) {
        screen.style.setProperty('--phase', info.color);
        $('#timer-template-name').innerHTML = `${icon(Store.iconFor(run), 'ic-sm')} ${esc(run.name)}`;
        setIcon($('#phase-badge-icon use'), info.icon);
        $('#phase-type-label').textContent = t(info.label);
        $('#phase-name').textContent = step.label;
        $('#phase-count').textContent = t('Phase {a} of {b}', { a: snap.index + 1, b: snap.count });
        renderIntention(run);
        const paused = status === 'paused';
        setIcon($('#pause-icon'), status === 'running' ? 'pause' : 'play');
        $('#pause-label').textContent = t(status === 'running' ? 'Pause' : (status === 'waiting' ? 'Start' : 'Resume'));
        $('#time-big').classList.toggle('paused', paused);
        $('#btn-prev').disabled = false;
        $('#btn-next').disabled = false;
        $('#next-up').innerHTML = snap.nextStep
            ? t('Next: <b>{label}</b> · {dur}', { label: esc(snap.nextStep.label), dur: fmtDuration(snap.nextStep.seconds) })
            : esc(t('Last phase — then you are done.'));
        $('#phase-list').innerHTML = run.steps.map((s, i) => {
            const cls = i < snap.index ? 'done' : i === snap.index ? 'current' : '';
            return `<li class="phase-item ${cls}" data-index="${i}" style="--item-color:${phaseInfo(s.type).color}">
                <span class="phase-item-idx">${i < snap.index ? icon('check', 'ic-xs') : i + 1}</span>
                <span class="phase-item-ic">${icon(phaseInfo(s.type).icon, 'ic-sm')}</span>
                <span class="phase-item-name">${esc(s.label)}</span>
                <span class="phase-item-dur">${fmtDuration(s.seconds)}</span>
            </li>`;
        }).join('');
        lastRenderedIndex = snap.index;
        lastRenderedStatus = status;
        Wake.sync();
    }

    renderExtendBanner(snap);
    $('#time-big').textContent = fmtClock(snap.remainingMs);
    $('#ring-fg').style.strokeDashoffset = (RING_C * (1 - snap.phaseFraction)).toFixed(2);
    const doneMs = snap.sessionTotalMs - snap.sessionRemainingMs;
    $('#session-fill').style.width = (snap.sessionTotalMs ? doneMs / snap.sessionTotalMs * 100 : 0).toFixed(2) + '%';
    $('#session-text').innerHTML = `<span>${esc(t('Session {a}', { a: fmtClock(doneMs) }))}</span><span>${esc(t('{a} left · ends {b}', { a: fmtClock(snap.sessionRemainingMs), b: fmtTime(Date.now() + snap.sessionRemainingMs) }))}</span>`;
    document.title = status === 'running' ? `${fmtClock(snap.remainingMs)} · ${step.label} — AMS PomoTimer` : 'AMS PomoTimer';
}

/* Intention line under the ring: tap to edit. Interruption counter next to it. */
function renderIntention(run) {
    const el = $('#intention-text');
    if (run.intention) { el.textContent = run.intention; el.classList.remove('empty'); }
    else { el.textContent = t('What are you working on? Tap to note it'); el.classList.add('empty'); }
    const n = run.interruptions || 0;
    $('#interrupt-count').textContent = n;
    $('#btn-interrupt').classList.toggle('has-some', n > 0);
    $('#timer-tags').innerHTML = (run.tags || []).map(t => `<span class="tag-chip small">${esc(t)}</span>`).join('');
}

function editIntention() {
    const snap = Timer.snapshot();
    if (!snap) return;
    promptDialog(t('What are you working on?'), snap.run.intention || '', t('Save')).then(v => {
        if (v === null) return;
        Timer.setIntention(v);
        renderIntention(Timer.snapshot().run);
    });
}

/* Small text prompt built on the confirm modal. Resolves null on cancel. */
function promptDialog(text, value, okLabel) {
    return new Promise(resolve => {
        const modal = $('#modal');
        $('#modal-text').textContent = text;
        const input = $('#modal-input');
        input.hidden = false;
        input.value = value || '';
        $('#modal-ok').textContent = okLabel || 'OK';
        modal.hidden = false;
        setTimeout(() => input.focus(), 50);
        const ok = $('#modal-ok'), cancel = $('#modal-cancel');
        const done = (v) => { modal.hidden = true; input.hidden = true; ok.removeEventListener('click', onOk); cancel.removeEventListener('click', onCancel); input.removeEventListener('keydown', onKey); resolve(v); };
        const onOk = () => done(input.value.trim());
        const onCancel = () => done(null);
        const onKey = e => { if (e.key === 'Enter') onOk(); };
        ok.addEventListener('click', onOk);
        cancel.addEventListener('click', onCancel);
        input.addEventListener('keydown', onKey);
    });
}

/* The "phase finished" banner: while waiting for a tap it offers the next
   phase plus a bit more time for the one that ended; after an automatic
   advance it offers just the extra time, for a couple of minutes. */
let lastBannerKey = null;
function renderExtendBanner(snap) {
    const { run, status } = snap;
    const lf = snap.lastFinished;
    const inGrace = !!lf && (Date.now() - lf.at) < EXTEND_GRACE_MS;
    const show = status === 'waiting' || (inGrace && status === 'running');
    const key = show ? `${status}:${lf ? lf.index : '-'}` : 'hidden';
    if (key === lastBannerKey) return;
    lastBannerKey = key;
    const banner = $('#waiting-banner');
    banner.hidden = !show;
    if (!show) return;
    const finishedStep = lf ? run.steps[lf.index] : null;
    const name = finishedStep ? finishedStep.label : t('Phase');
    $('#waiting-text').textContent = t(status === 'waiting' ? '{name} finished.' : '{name} finished. Not quite ready?', { name });
    $('#ext-row').hidden = !lf;
    $('#btn-start-next').hidden = status !== 'waiting';
}

function startUiLoop() {
    if (uiInterval) return;
    uiInterval = setInterval(() => {
        if (currentScreen === 'timer' && Timer.isActive()) renderTimer(false);
    }, 250);
}

/* Timer engine events */
Timer.on('phase', ({ run, step, reason, finished, extraSec }) => {
    lastRenderedIndex = -1;
    const isBreak = step.type === 'pause' || step.type === 'longbreak' || step.type === 'cooldown';
    if (reason === 'complete') {
        Sound.chime(isBreak ? 'break' : 'focus');
        vibrate(isBreak ? [150, 80, 150] : [250, 100, 250, 100, 250]);
        const status = run.status === 'waiting' ? t('Tap to start') : fmtDuration(step.seconds);
        notify(finished ? t('{label} finished', { label: finished.label }) : t('Phase finished'), t('Next: {label} · {status}', { label: step.label, status }));
    } else if (reason === 'start') {
        Sound.chime(isBreak ? 'break' : 'focus');
        vibrate([120]);
    } else if (reason === 'extend') {
        toast(t('{d} more for {label}', { d: fmtDuration(extraSec), label: step.label }));
    }
    if (reason === 'complete' && run.status === 'waiting') announce(t('{a} finished. Tap to start {b}.', { a: finished ? finished.label : t('Phase'), b: step.label }));
    else if (reason === 'complete' || reason === 'start' || reason === 'manual') announce(t('{a}. {b}.', { a: step.label, b: voiceDuration(step.seconds) }));
    else if (reason === 'extend') announce(t('{d} more.', { d: voiceDuration(extraSec) }));
    MediaCtl.update();
    if (currentScreen === 'timer') renderTimer(true);
    else if (currentScreen === 'home') renderHome();
});

function voiceDuration(sec) {
    const m = Math.round(sec / 60);
    if (sec < 60) return t('{n} seconds', { n: sec });
    return m === 1 ? t('1 minute') : t('{n} minutes', { n: m });
}

Timer.on('tick', ({ secondsLeft }) => {
    if (Store.getSettings().ticks) Sound.chime('tick');
});

Timer.on('done', ({ run, entry }) => {
    lastRenderedIndex = -1;
    Wake.release();
    syncKeepAlive();
    MediaCtl.update();
    document.title = 'AMS PomoTimer';
    if (suppressDoneScreen) return;
    if (run.completed) {
        Sound.chime('done');
        vibrate([300, 100, 300, 100, 500]);
        notify(t('Session complete'), t('{name}: {p} Pomodoros, {f} focus', { name: run.name, p: run.pomodoros, f: fmtDuration(run.focusSec) }));
        announce(t('Session complete. Well done.'));
    }
    // Daily goal crossed with this session?
    const goal = Store.getSettings().dailyGoal;
    const after = Store.stats().today.pomodoros;
    const before = after - (entry.pomodoros || 0);
    goalJustReached = goal > 0 && before < goal && after >= goal;
    if (goalJustReached) { setTimeout(() => { toast(t('Daily goal reached: {n} Pomodoros', { n: after }), 3000); announce(t('Daily goal reached.')); }, 600); }
    showDone(run);
});

Timer.on('change', () => {
    MediaCtl.update();
    if (currentScreen === 'timer') renderTimer(false);
});

function showDone(run) {
    setIcon($('#done-icon use'), run.completed ? 'party' : 'stop');
    $('.done-icon').classList.toggle('stopped', !run.completed);
    $('.done-title').textContent = t(run.completed ? 'Session complete' : 'Session stopped');
    const mins = Math.round((run.endedAt - run.startedAt) / 60000);
    $('#done-sub').innerHTML = `${icon(Store.iconFor(run), 'ic-sm')} ${esc(run.name)} · ${fmtTime(run.startedAt)}–${fmtTime(run.endedAt)} (${mins} min)`;
    $('#done-stats').innerHTML = statsHtml([
        { value: run.pomodoros, label: t('Pomodoros') },
        { value: fmtDuration(run.focusSec), label: t('Focus') },
        { value: run.interruptions || 0, label: t('Interruptions') }
    ]);
    const extra = [];
    if (goalJustReached) extra.push(`<div class="done-goal">${icon('target', 'ic-sm')} ${esc(t('Daily goal reached'))}</div>`);
    if (run.intention) extra.push(`<div class="done-intention">“${esc(run.intention)}”</div>`);
    if (run.tags && run.tags.length) extra.push(`<div class="tag-row">${run.tags.map(t => `<span class="tag-chip">${esc(t)}</span>`).join('')}</div>`);
    $('#done-extra').innerHTML = extra.join('');
    showScreen('done');
}

/* ================= Templates list ================= */
function renderTemplates() {
    const templates = Store.getTemplates();
    const el = $('#template-list');
    if (!templates.length) {
        el.innerHTML = `<div class="empty">${esc(t('No templates yet. Tap the plus button to create one, or restore the built-ins in Settings.'))}</div>`;
        return;
    }
    el.innerHTML = templates.map(t => `
        <div class="template-row" style="--tpl-color:${esc(t.color || '#FF2E63')}">
            <button class="tpl-edit-area" data-edit="${esc(t.id)}">
                <span class="tpl-icon">${icon(Store.iconFor(t))}</span>
                <span class="tpl-body">
                    <span class="tpl-name">${esc(t.name || I18N.t('Untitled'))}</span>
                    <span class="tpl-meta">${templateMeta(t)}${(t.tags || []).length ? ' · ' + t.tags.map(x => `<span class="tag-chip small">${esc(x)}</span>`).join(' ') : ''}</span>
                    ${segmentsHtml(t.steps)}
                </span>
            </button>
            <button class="tpl-play" data-start="${esc(t.id)}" aria-label="${esc(I18N.t('Start {name}', { name: t.name }))}">${icon('play')}</button>
        </div>`).join('');
}

/* ================= Editor ================= */
let ed = null; // working copy of the template being edited
let edIsNew = false;

function openEditor(tpl, isNew) {
    ed = JSON.parse(JSON.stringify(tpl));
    edIsNew = !!isNew;
    $('#editor-title').textContent = t(isNew ? 'New template' : 'Edit template');
    $('#ed-name').value = ed.name || '';
    $('#ed-auto').value = ed.autoAdvance === true ? '1' : ed.autoAdvance === false ? '0' : '';
    $('#btn-editor-delete').hidden = isNew;
    $('#btn-editor-duplicate').hidden = isNew;
    ed.icon = Store.iconFor(ed);
    delete ed.emoji;
    ed.tags = Store.cleanTags(ed.tags);
    renderIconRow();
    renderColorRow();
    renderTagRow();
    renderAddRow();
    renderSteps();
    showScreen('editor');
}

function renderTagRow() {
    const all = Store.allTags();
    ed.tags.forEach(t => { if (!all.includes(t)) all.unshift(t); });
    $('#ed-tag-row').innerHTML = all.map(t =>
        `<button class="chip tag-choice ${ed.tags.includes(t) ? 'selected' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('') +
        `<button class="chip tag-choice add" data-tag-new="1">${icon('plus', 'ic-xs')} ${esc(t('custom'))}</button>`;
}

function renderIconRow() {
    $('#ed-icon-row').innerHTML = Store.ICONS.map(n =>
        `<button class="chip icon-chip ${n === ed.icon ? 'selected' : ''}" data-icon="${n}" aria-label="${n}" style="--c:${esc(ed.color || '#FF2E63')}">${icon(n)}</button>`).join('');
}

function renderColorRow() {
    $('#ed-color-row').innerHTML = Store.COLORS.map(c =>
        `<button class="chip color-chip ${c === ed.color ? 'selected' : ''}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
}

function renderAddRow() {
    $('#ed-add-row').innerHTML = Object.entries(Store.PHASE_TYPES).map(([type, info]) =>
        `<button class="chip phase-chip" data-add="${type}" style="--chip-color:${info.color}">${icon(info.icon, 'ic-sm')} ${esc(t(info.label))}</button>`).join('');
}

function renderSteps() {
    const el = $('#ed-steps');
    if (!ed.steps.length) {
        el.innerHTML = `<li class="step-empty">${esc(t('No phases yet. Add some below.'))}</li>`;
    } else {
        const typeOptions = Object.entries(Store.PHASE_TYPES).map(([ty, i]) => `<option value="${ty}">${esc(t(i.label))}</option>`).join('');
        el.innerHTML = ed.steps.map((s, i) => {
            const m = Math.floor(s.seconds / 60), sec = s.seconds % 60;
            return `<li class="step-row" data-index="${i}" style="--item-color:${phaseInfo(s.type).color}">
                <span class="step-idx">${i + 1}</span>
                <input class="step-label" type="text" maxlength="30" value="${esc(s.label)}" placeholder="${esc(t(phaseInfo(s.type).label))}" data-field="label">
                <select class="step-type" data-field="type">${typeOptions}</select>
                <span class="step-dur">
                    <input type="number" inputmode="numeric" min="0" max="600" value="${m}" data-field="min"><span>min</span>
                    <input type="number" inputmode="numeric" min="0" max="59" value="${sec}" data-field="sec"><span>sec</span>
                </span>
                <span class="step-actions">
                    <button data-op="up" ${i === 0 ? 'disabled' : ''} aria-label="${esc(t('Move up'))}">${icon('up', 'ic-sm')}</button>
                    <button data-op="down" ${i === ed.steps.length - 1 ? 'disabled' : ''} aria-label="${esc(t('Move down'))}">${icon('down', 'ic-sm')}</button>
                    <button data-op="dup" aria-label="${esc(t('Duplicate'))}">${icon('copy', 'ic-sm')}</button>
                    <button data-op="del" class="del" aria-label="${esc(t('Remove'))}">${icon('trash', 'ic-sm')}</button>
                </span>
            </li>`;
        }).join('');
        $$('.step-row', el).forEach(row => { $('.step-type', row).value = ed.steps[+row.dataset.index].type; });
    }
    updateEdTotal();
}

function updateEdTotal() {
    $('#ed-total').textContent = ed.steps.length ? `· ${fmtDuration(Store.templateTotalSec(ed))}` : '';
}

function saveEditor() {
    ed.name = $('#ed-name').value.trim() || t('Untitled');
    const auto = $('#ed-auto').value;
    ed.autoAdvance = auto === '1' ? true : auto === '0' ? false : null;
    ed.steps = ed.steps.map(s => ({ ...s, label: (s.label || '').trim() || t(phaseInfo(s.type).label), seconds: Math.max(0, Math.round(s.seconds)) }));
    if (!ed.steps.some(s => s.seconds > 0)) { toast(t('Add at least one phase with a duration.')); return; }
    ed.tags = Store.cleanTags(ed.tags);
    ed.builtin = false;
    Store.saveTemplate(ed);
    toast(t(edIsNew ? 'Template created' : 'Template saved'));
    ed = null;
    showScreen('templates');
}

/* ================= History ================= */
function renderHistory() {
    const s = Store.stats();
    $('#history-stats').innerHTML = statsHtml([
        { value: s.today.pomodoros, label: t('Today') },
        { value: s.week.pomodoros, label: t('This week') },
        { value: fmtDuration(s.all.focusSec), label: t('All-time focus') }
    ]);
    renderTagStats(s);
    renderInsights();
    const list = Store.getHistory();
    const el = $('#history-list');
    if (!list.length) { el.innerHTML = `<div class="empty">${esc(t('No sessions yet. Finish a session and it shows up here.'))}</div>`; return; }
    let html = '', lastDay = null;
    list.forEach(h => {
        const day = fmtDay(h.endedAt);
        if (day !== lastDay) { html += `<div class="history-day">${esc(day)}</div>`; lastDay = day; }
        const tags = (h.tags || []).map(t => `<span class="tag-chip small">${esc(t)}</span>`).join(' ');
        const intr = h.interruptions ? ` · ${h.interruptions} ${icon('bolt', 'ic-xs')}` : '';
        html += `<div class="history-row ${h.completed ? '' : 'stopped'}" data-id="${esc(h.id)}" style="--tpl-color:${esc(h.color || '#FF2E63')}">
            <span class="h-icon">${icon(Store.iconFor(h))}</span>
            <span class="h-body">
                <div class="h-name">${esc(h.name)}${h.completed ? '' : ` <span class="muted">${esc(t('· stopped'))}</span>`}</div>
                ${h.intention ? `<div class="h-intention">“${esc(h.intention)}”</div>` : ''}
                <div class="h-meta">${fmtTime(h.startedAt)}–${fmtTime(h.endedAt)} · ${h.pomodoros} ${icon('tomato', 'ic-xs')} · ${h.phasesDone}/${h.phasesTotal} ${esc(t('phases'))}${intr}${tags ? ' · ' + tags : ''}</div>
            </span>
            <span class="h-focus">${fmtDuration(h.focusSec)}</span>
            <button class="h-del" data-del="${esc(h.id)}" aria-label="Delete">${icon('close', 'ic-sm')}</button>
        </div>`;
    });
    el.innerHTML = html;
}

/* ---------- Charts (inline SVG, single series each) ---------- */
function renderInsights() {
    const ins = Store.insights(28);
    const wrap = $('#insights');
    const any = ins.series.some(d => d.focusSec > 0);
    wrap.hidden = !any;
    if (!any) return;
    $('#insight-stats').innerHTML = statsHtml([
        { value: ins.streak, label: t('Day streak') },
        { value: ins.longest, label: t('Longest streak') },
        { value: ins.bestHour >= 0 ? `${pad(ins.bestHour)}–${pad((ins.bestHour + 1) % 24)}` : '–', label: t('Best hour') }
    ]);
    $('#chart-days').innerHTML = dayBarChart(ins.series);
    $('#chart-hours').innerHTML = hourBarChart(ins.byHour, ins.bestHour);
    $('#chart-tip').textContent = t('Tap a bar for details.');
}

/* 28 days of focus minutes. Bars are thin, rounded at the data end, sit on a
   recessive baseline, 2px apart. Today is highlighted; only today and the
   best day carry a value label. */
function dayBarChart(series) {
    const n = series.length, W = 336, H = 120, top = 18, bottom = 22;
    const slot = W / n, bw = slot - 3;
    const max = Math.max(1, ...series.map(d => d.focusSec));
    const maxIdx = series.reduce((m, d, i) => d.focusSec > series[m].focusSec ? i : m, 0);
    const y = v => top + (H - top - bottom) * (1 - v / max);
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(t('Focus minutes per day, last 28 days'))}">`;
    // three light guide lines
    [0.5, 1].forEach(f => { svg += `<line class="grid" x1="0" x2="${W}" y1="${y(max * f).toFixed(1)}" y2="${y(max * f).toFixed(1)}"/>`; });
    series.forEach((d, i) => {
        const x = i * slot + 1.5;
        const h = d.focusSec > 0 ? Math.max(3, (H - bottom) - y(d.focusSec)) : 0;
        const cls = i === n - 1 ? 'bar today' : 'bar';
        svg += `<g class="hit" data-i="${i}">`;
        svg += `<rect class="hitbox" x="${(i * slot).toFixed(1)}" y="0" width="${slot.toFixed(1)}" height="${H}"/>`;
        if (h > 0) svg += `<rect class="${cls}" x="${x.toFixed(1)}" y="${(H - bottom - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3"/>`;
        else svg += `<rect class="bar empty" x="${x.toFixed(1)}" y="${H - bottom - 2}" width="${bw.toFixed(1)}" height="2" rx="1"/>`;
        if ((i === maxIdx || i === n - 1) && d.focusSec > 0) {
            svg += `<text class="val" x="${(x + bw / 2).toFixed(1)}" y="${(H - bottom - h - 4).toFixed(1)}" text-anchor="middle">${Math.round(d.focusSec / 60)}</text>`;
        }
        svg += '</g>';
    });
    svg += `<line class="axis" x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}"/>`;
    // week labels
    series.forEach((d, i) => {
        if (i % 7 === 0) {
            const dt = new Date(d.ts);
            svg += `<text class="lbl" x="${(i * slot + 1.5).toFixed(1)}" y="${H - 6}">${dt.getDate()} ${esc(dt.toLocaleDateString(I18N.locale(), { month: 'short' }))}</text>`;
        }
    });
    svg += '</svg>';
    return svg;
}

/* Focus minutes by hour of day. */
function hourBarChart(byHour, best) {
    const W = 336, H = 80, top = 10, bottom = 18, slot = W / 24, bw = slot - 3;
    const max = Math.max(1, ...byHour);
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="chart hours" role="img" aria-label="${esc(t('Focus minutes by hour of day'))}">`;
    byHour.forEach((v, i) => {
        const h = v > 0 ? Math.max(3, (H - top - bottom) * (v / max)) : 0;
        const x = i * slot + 1.5;
        svg += `<g class="hit" data-h="${i}"><rect class="hitbox" x="${(i * slot).toFixed(1)}" y="0" width="${slot.toFixed(1)}" height="${H}"/>`;
        if (h > 0) svg += `<rect class="bar ${i === best ? 'today' : ''}" x="${x.toFixed(1)}" y="${(H - bottom - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="3"/>`;
        else svg += `<rect class="bar empty" x="${x.toFixed(1)}" y="${H - bottom - 2}" width="${bw.toFixed(1)}" height="2" rx="1"/>`;
        svg += '</g>';
    });
    svg += `<line class="axis" x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}"/>`;
    [0, 6, 12, 18].forEach(hh => { svg += `<text class="lbl" x="${(hh * slot + 1.5).toFixed(1)}" y="${H - 5}">${pad(hh)}</text>`; });
    svg += `<text class="lbl" x="${W - 2}" y="${H - 5}" text-anchor="end">24</text>`;
    svg += '</svg>';
    return svg;
}

function chartTap(e) {
    const g = e.target.closest('.hit');
    if (!g) return;
    const ins = Store.insights(28);
    $$('.chart .hit.sel').forEach(el => el.classList.remove('sel'));
    g.classList.add('sel');
    if (g.dataset.i !== undefined) {
        const d = ins.series[+g.dataset.i];
        const dt = new Date(d.ts).toLocaleDateString(I18N.locale(), { weekday: 'short', day: 'numeric', month: 'short' });
        $('#chart-tip').innerHTML = `<b>${esc(dt)}</b> · ${esc(fmtDuration(d.focusSec))} · ${d.pomodoros} ${icon('tomato', 'ic-xs')} · ${esc(t(d.sessions === 1 ? '{n} session' : '{n} sessions', { n: d.sessions }))}`;
    } else if (g.dataset.h !== undefined) {
        const h = +g.dataset.h;
        $('#chart-tip').innerHTML = `<b>${pad(h)}:00–${pad((h + 1) % 24)}:00</b> · ${esc(t('{d} of focus, all time', { d: fmtDuration(ins.byHour[h]) }))}`;
    }
}

/* Focus per tag, this week, as a small ranked list. */
function renderTagStats(s) {
    const el = $('#tag-stats');
    const entries = Object.entries(s.tagsWeek).sort((a, b) => b[1].focusSec - a[1].focusSec);
    if (!entries.length) { el.innerHTML = ''; $('#tag-stats-title').hidden = true; return; }
    $('#tag-stats-title').hidden = false;
    const max = entries[0][1].focusSec || 1;
    el.innerHTML = entries.map(([tag, v]) => `
        <div class="tag-stat">
            <span class="tag-chip">${esc(tag)}</span>
            <span class="tag-bar"><span style="width:${(v.focusSec / max * 100).toFixed(1)}%"></span></span>
            <span class="tag-val">${esc(fmtDuration(v.focusSec))} · ${v.pomodoros} ${icon('tomato', 'ic-xs')}</span>
        </div>`).join('');
}

/* ================= Settings ================= */
function renderSettings() {
    const s = Store.getSettings();
    $('#set-auto').checked = s.autoAdvance;
    $('#set-wake').checked = s.wakeLock;
    $('#set-ticks').checked = s.ticks;
    $('#set-sound').checked = s.sound;
    $('#set-vibrate').checked = s.vibrate;
    $('#set-notify').checked = s.notify && ('Notification' in window) && Notification.permission === 'granted';
    $('#set-theme').value = s.theme;
    $('#set-lang').value = I18N.getLang();
    $('#set-textsize').value = s.textSize || 'normal';
    $('#btn-share-backup').hidden = !(navigator.share && navigator.canShare);
    $('#set-goal').value = s.dailyGoal;
    $('#set-bgaudio').checked = s.bgAudio;
    $('#set-voice').checked = s.voice && Voice.supported();
    $('#set-voice').disabled = !Voice.supported();
    $('#about-version').textContent = 'v' + APP_VERSION;
    $('#set-wake').disabled = !('wakeLock' in navigator);
    $('#set-vibrate').disabled = !('vibrate' in navigator);
    $('#set-notify').disabled = !('Notification' in window);
}

function backupFile() {
    const data = Store.exportData();
    return new File([JSON.stringify(data, null, 2)], 'ams-pomotimer-' + Store.dayKey(Date.now()) + '.json', { type: 'application/json' });
}

function exportData() {
    const file = backupFile();
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    Store.setLastExport();
    toast(t('Backup exported'));
}

/* Hand the backup to the phone's share sheet (Files, Mail, AirDrop, ...). */
async function shareBackup() {
    const file = backupFile();
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: 'AMS PomoTimer backup' });
            Store.setLastExport();
        } catch (e) { /* cancelled */ }
        return;
    }
    toast(t('Sharing is not available here; the file was downloaded instead.'), 3000);
    exportData();
}

/* ================= Sharing templates ================= */
function shareLink(tpl) {
    const base = location.origin + location.pathname;
    return base + '?t=' + Store.encodeShare(tpl);
}

function openShare(tpl) {
    if (!tpl) return;
    const link = shareLink(tpl);
    $('#share-title').textContent = t('Share template') + ': ' + (tpl.name || t('Untitled'));
    try {
        $('#share-qr').innerHTML = QR.toSvg(link, { level: 'L', dark: '#120f2e', light: '#ffffff' });
    } catch (e) {
        $('#share-qr').innerHTML = `<div class="empty">${esc(e.message)}</div>`;
    }
    $('#share-link').textContent = link;
    $('#btn-share-native').hidden = !navigator.share;
    $('#share-modal').hidden = false;
}

function importFromLink(text) {
    let payload = String(text || '').trim();
    const m = payload.match(/[?&]t=([A-Za-z0-9_-]+)/);
    if (m) payload = m[1];
    let tpl;
    try { tpl = Store.decodeShare(payload); }
    catch (e) { toast(t('Not a PomoTimer template link'), 3000); return; }
    showScreen('templates');
    confirmDialog(t('Add template “{name}”?', { name: tpl.name }), t('Add')).then(ok => {
        if (!ok) return;
        Store.saveTemplate(tpl);
        toast(t('Template “{name}” added', { name: tpl.name }));
        renderTemplates();
    });
}

/* ================= Wiring ================= */
function bind() {
    // Unlock audio on the first touch anywhere (iOS requirement)
    document.addEventListener('touchend', Sound.unlock, { passive: true });
    document.addEventListener('click', Sound.unlock);

    // Tabs
    $('#tabbar').addEventListener('click', e => {
        const tab = e.target.closest('.tab');
        if (!tab) return;
        if (tab.dataset.tab === 'home' && Timer.isActive() && currentScreen !== 'timer') showScreen('timer');
        else showScreen(tab.dataset.tab);
    });

    // Home
    $('#btn-home-settings').addEventListener('click', () => showScreen('settings'));
    $('#btn-resume').addEventListener('click', () => showScreen('timer'));
    $('#quick-grid').addEventListener('click', e => {
        if (Date.now() < suppressClickUntil) return; // a long-press just opened the sheet
        const card = e.target.closest('.quick-card');
        if (!card) return;
        if (card.dataset.action === 'new') { openEditor(Store.newTemplate(), true); return; }
        startTemplate(Store.getTemplate(card.dataset.id));
    });
    bindLongPress($('#quick-grid'), '.quick-card[data-id]', card => openStartSheet(Store.getTemplate(card.dataset.id)));
    bindLongPress($('#template-list'), '.tpl-play', btn => openStartSheet(Store.getTemplate(btn.dataset.start)));

    // Start sheet
    $('#sheet').addEventListener('click', e => { if (e.target === $('#sheet')) closeSheet(); });
    $('#sheet-cancel').addEventListener('click', closeSheet);
    $('#sheet-start').addEventListener('click', startFromSheet);
    $('#sheet-pomo-minus').addEventListener('click', () => { if (sheet && sheet.count > 1) { sheet.count--; renderSheet(); } });
    $('#sheet-pomo-plus').addEventListener('click', () => { if (sheet && sheet.count < 12) { sheet.count++; renderSheet(); } });
    $('#sheet-wait').addEventListener('change', e => { if (sheet) sheet.wait = e.target.checked; });
    $('#sheet-tags').addEventListener('click', e => {
        const b = e.target.closest('[data-tag]');
        if (!b || !sheet) return;
        const t = b.dataset.tag;
        sheet.tags = sheet.tags.includes(t) ? sheet.tags.filter(x => x !== t) : Store.cleanTags([...sheet.tags, t]);
        renderSheetTags();
    });
    $('#sheet-intention').addEventListener('keydown', e => { if (e.key === 'Enter') startFromSheet(); });
    $('#quick-chips').addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (chip) startTemplate(Store.quickTemplate(+chip.dataset.min));
    });
    $('#btn-quick-custom').addEventListener('click', () => {
        const m = parseInt($('#quick-custom-min').value, 10);
        if (!m || m < 1) { toast(t('Enter a number of minutes.')); return; }
        $('#quick-custom-min').value = '';
        startTemplate(Store.quickTemplate(Math.min(600, m)));
    });
    $('#quick-custom-min').addEventListener('keydown', e => { if (e.key === 'Enter') $('#btn-quick-custom').click(); });

    // Timer
    $('#btn-timer-back').addEventListener('click', () => showScreen('home'));
    $('#btn-timer-stop').addEventListener('click', async () => {
        if (await confirmDialog(t('Stop this session? Progress so far is kept in History.'), t('Stop'))) Timer.stop();
    });
    $('#btn-pause').addEventListener('click', () => {
        const snap = Timer.snapshot();
        if (!snap) return;
        if (snap.status === 'waiting') Timer.startWaiting(); else Timer.toggle();
        renderTimer(true);
    });
    $('#btn-start-next').addEventListener('click', () => { Timer.startWaiting(); renderTimer(true); });
    $('#intention-line').addEventListener('click', editIntention);
    $('#btn-interrupt').addEventListener('click', () => {
        const n = Timer.logInterruption();
        vibrate([20]);
        renderIntention(Timer.snapshot().run);
        toast(n === 1 ? t('1 interruption noted') : t('{n} interruptions noted', { n }), 1200);
    });
    $('#btn-ext-1').addEventListener('click', () => { if (Timer.extendFinished(60)) renderTimer(true); });
    $('#btn-ext-5').addEventListener('click', () => { if (Timer.extendFinished(300)) renderTimer(true); });
    $('#btn-next').addEventListener('click', () => Timer.next());
    $('#btn-prev').addEventListener('click', () => Timer.prev());
    $('#btn-plus').addEventListener('click', () => { Timer.adjust(60); renderTimer(false); });
    $('#btn-minus').addEventListener('click', () => { Timer.adjust(-60); renderTimer(false); });
    $('#phase-list').addEventListener('click', e => {
        const li = e.target.closest('.phase-item');
        if (!li) return;
        const i = +li.dataset.index;
        const snap = Timer.snapshot();
        if (!snap || i === snap.index) return;
        Timer.jumpTo(i);
    });

    // Done
    $('#btn-done-home').addEventListener('click', () => showScreen('home'));
    $('#btn-done-again').addEventListener('click', () => {
        if (lastStartedTemplate) { startTemplate(lastStartedTemplate); return; }
        showScreen('home');
    });

    // Templates
    $('#btn-new-template').addEventListener('click', () => openEditor(Store.newTemplate(), true));
    $('#template-list').addEventListener('click', e => {
        if (Date.now() < suppressClickUntil) return;
        const play = e.target.closest('[data-start]');
        if (play) { startTemplate(Store.getTemplate(play.dataset.start)); return; }
        const edit = e.target.closest('[data-edit]');
        if (edit) openEditor(Store.getTemplate(edit.dataset.edit), false);
    });

    // Editor
    $('#btn-editor-cancel').addEventListener('click', () => { ed = null; showScreen('templates'); });
    $('#btn-editor-save').addEventListener('click', saveEditor);
    $('#ed-icon-row').addEventListener('click', e => {
        const b = e.target.closest('[data-icon]');
        if (b) { ed.icon = b.dataset.icon; renderIconRow(); }
    });
    $('#ed-color-row').addEventListener('click', e => {
        const b = e.target.closest('[data-color]');
        if (b) { ed.color = b.dataset.color; renderColorRow(); renderIconRow(); }
    });
    $('#ed-tag-row').addEventListener('click', async e => {
        const nb = e.target.closest('[data-tag-new]');
        if (nb) {
            const v = await promptDialog(t('New tag'), '', t('Add'));
            if (v) { ed.tags = Store.cleanTags([...ed.tags, v]); renderTagRow(); }
            return;
        }
        const b = e.target.closest('[data-tag]');
        if (!b) return;
        const t = b.dataset.tag;
        ed.tags = ed.tags.includes(t) ? ed.tags.filter(x => x !== t) : Store.cleanTags([...ed.tags, t]);
        renderTagRow();
    });
    $('#ed-add-row').addEventListener('click', e => {
        const b = e.target.closest('[data-add]');
        if (!b) return;
        const info = phaseInfo(b.dataset.add);
        ed.steps.push(Store.step(b.dataset.add, info.defaultSec / 60));
        renderSteps();
    });
    $('#btn-add-block').addEventListener('click', () => {
        const count = Math.max(1, Math.min(12, parseInt($('#blk-count').value, 10) || 4));
        const focus = Math.max(1, parseInt($('#blk-focus').value, 10) || 25);
        const pause = Math.max(0, parseInt($('#blk-pause').value, 10) || 0);
        for (let i = 0; i < count; i++) {
            ed.steps.push(Store.step('focus', focus));
            if (pause > 0 && i < count - 1) ed.steps.push(Store.step('pause', pause));
        }
        renderSteps();
        toast(t('Added {n} Pomodoros', { n: count }));
    });
    $('#ed-steps').addEventListener('input', e => {
        const row = e.target.closest('.step-row');
        if (!row) return;
        const s = ed.steps[+row.dataset.index];
        const field = e.target.dataset.field;
        if (field === 'label') s.label = e.target.value;
        if (field === 'min' || field === 'sec') {
            const m = Math.max(0, parseInt($('[data-field="min"]', row).value, 10) || 0);
            const sec = Math.max(0, Math.min(59, parseInt($('[data-field="sec"]', row).value, 10) || 0));
            s.seconds = m * 60 + sec;
            updateEdTotal();
        }
    });
    $('#ed-steps').addEventListener('change', e => {
        const row = e.target.closest('.step-row');
        if (!row || e.target.dataset.field !== 'type') return;
        const s = ed.steps[+row.dataset.index];
        const oldDefault = phaseInfo(s.type).label;
        s.type = e.target.value;
        if (!s.label || s.label === oldDefault) s.label = phaseInfo(s.type).label;
        renderSteps();
    });
    $('#ed-steps').addEventListener('click', e => {
        const b = e.target.closest('[data-op]');
        if (!b) return;
        const row = b.closest('.step-row');
        const i = +row.dataset.index;
        const op = b.dataset.op;
        if (op === 'del') ed.steps.splice(i, 1);
        if (op === 'dup') ed.steps.splice(i + 1, 0, { ...ed.steps[i], id: Store.uid('s') });
        if (op === 'up' && i > 0) { const t = ed.steps[i - 1]; ed.steps[i - 1] = ed.steps[i]; ed.steps[i] = t; }
        if (op === 'down' && i < ed.steps.length - 1) { const t = ed.steps[i + 1]; ed.steps[i + 1] = ed.steps[i]; ed.steps[i] = t; }
        renderSteps();
    });
    $('#btn-editor-duplicate').addEventListener('click', () => {
        ed.name = $('#ed-name').value.trim() || ed.name;
        const copy = Store.duplicateTemplate(ed);
        Store.saveTemplate(copy);
        toast(t('Duplicated'));
        openEditor(copy, false);
    });
    $('#btn-editor-delete').addEventListener('click', async () => {
        if (await confirmDialog(t('Delete “{name}”?', { name: ed.name || t('Untitled') }), t('Delete'))) {
            Store.deleteTemplate(ed.id);
            ed = null;
            toast(t('Template deleted'));
            showScreen('templates');
        }
    });

    // History
    $('#history-list').addEventListener('click', async e => {
        const del = e.target.closest('[data-del]');
        if (!del) return;
        Store.deleteHistory(del.dataset.del);
        renderHistory();
    });
    $('#btn-clear-history').addEventListener('click', async () => {
        if (await confirmDialog(t('Clear the whole history? This cannot be undone.'), t('Clear'))) { Store.clearHistory(); renderHistory(); }
    });

    // Settings
    const bindSwitch = (id, key, after) => $(id).addEventListener('change', e => { Store.saveSettings({ [key]: e.target.checked }); if (after) after(e.target.checked); });
    bindSwitch('#set-auto', 'autoAdvance');
    bindSwitch('#set-wake', 'wakeLock', () => Wake.sync());
    bindSwitch('#set-ticks', 'ticks');
    bindSwitch('#set-sound', 'sound', on => { if (on) Sound.chime('focus'); });
    bindSwitch('#set-vibrate', 'vibrate', on => { if (on) vibrate([100]); });
    bindSwitch('#set-bgaudio', 'bgAudio', () => syncKeepAlive());
    $('#set-goal').addEventListener('change', e => {
        const v = Math.max(0, Math.min(30, parseInt(e.target.value, 10) || 0));
        e.target.value = v;
        Store.saveSettings({ dailyGoal: v });
        toast(v ? t('Daily goal: {n} Pomodoros', { n: v }) : t('Daily goal off'));
    });
    $('#chart-days').addEventListener('click', chartTap);
    $('#chart-hours').addEventListener('click', chartTap);
    bindSwitch('#set-voice', 'voice', on => { if (on) Voice.say(t('Voice announcements on.'), I18N.speechLang()); });
    $('#set-notify').addEventListener('change', async e => {
        if (!e.target.checked) { Store.saveSettings({ notify: false }); return; }
        if (!('Notification' in window)) { e.target.checked = false; toast(t('Notifications are not supported here.')); return; }
        let perm = Notification.permission;
        if (perm !== 'granted') perm = await Notification.requestPermission();
        if (perm === 'granted') { Store.saveSettings({ notify: true }); toast(t('Notifications on')); }
        else { e.target.checked = false; Store.saveSettings({ notify: false }); toast(t('Permission not granted. On iOS, install the app to the Home Screen first.'), 3500); }
    });
    $('#btn-test-alert').addEventListener('click', () => { Sound.chime('focus'); vibrate([250, 100, 250]); });
    $('#set-theme').addEventListener('change', e => { Store.saveSettings({ theme: e.target.value }); applyTheme(); });
    $('#set-lang').addEventListener('change', e => {
        Store.saveSettings({ lang: e.target.value });
        applyLanguage();
        showScreen('settings');
        MediaCtl.update();
    });
    $('#set-textsize').addEventListener('change', e => { Store.saveSettings({ textSize: e.target.value }); applyTheme(); });
    $('#btn-export').addEventListener('click', exportData);
    $('#btn-share-backup').addEventListener('click', shareBackup);
    $('#btn-paste-import').addEventListener('click', async () => {
        const v = await promptDialog(t('Paste a PomoTimer template link or code'), '', t('Import'));
        if (v) importFromLink(v);
    });
    // Share sheet (template QR + link)
    $('#btn-editor-share').addEventListener('click', () => openShare(ed));
    $('#btn-share-close').addEventListener('click', () => { $('#share-modal').hidden = true; });
    $('#share-modal').addEventListener('click', e => { if (e.target === $('#share-modal')) $('#share-modal').hidden = true; });
    $('#btn-share-copy').addEventListener('click', async () => {
        const link = $('#share-link').textContent;
        try { await navigator.clipboard.writeText(link); toast(t('Link copied')); }
        catch (e) { promptDialog(t('Copy link'), link, t('Close')); }
    });
    $('#btn-share-native').addEventListener('click', async () => {
        const link = $('#share-link').textContent;
        try { await navigator.share({ title: 'AMS PomoTimer', text: $('#share-title').textContent, url: link }); }
        catch (e) { /* cancelled */ }
    });
    $('#btn-import').addEventListener('click', () => $('#import-file').click());
    $('#import-file').addEventListener('change', e => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const res = Store.importData(JSON.parse(reader.result));
                applyTheme();
                applyLanguage();
                renderSettings();
                toast(t('Imported {a} templates, {b} sessions', { a: res.templates, b: res.history }));
            } catch (err) { toast(t('Import failed: ') + err.message, 3500); }
            e.target.value = '';
        };
        reader.readAsText(file);
    });
    $('#btn-restore-builtin').addEventListener('click', () => {
        const n = Store.restoreBuiltins();
        toast(n ? t('Restored {n} built-in templates', { n }) : t('All built-ins are already there'));
    });

    // Keep the countdown honest when the phone wakes up
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) { Timer.tick(); if (currentScreen === 'timer') renderTimer(true); if (currentScreen === 'home') renderHome(); }
        Wake.sync();
    });
    window.addEventListener('pageshow', () => { Timer.tick(); if (currentScreen === 'timer') renderTimer(true); });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
}

/* Launch links, usable from Shortcuts, automations or bookmarks:
     ?action=start&template=<id or name>   start a template
     ?action=quick&min=25                  one single Pomodoro
     ?action=last                          the template used last
     ?action=templates                     open the Templates tab
     ?t=<code>                             offer a shared template */
function handleLaunchAction() {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    const shared = params.get('t');
    if (!action && !shared) return false;
    history.replaceState(null, '', location.pathname);
    if (shared) { importFromLink(shared); return true; }
    if (action === 'templates') { showScreen('templates'); return true; }
    if (action === 'last') {
        const tpl = Store.getTemplate(Store.getLastTemplateId()) || Store.getTemplates()[0];
        if (tpl && !Timer.isActive()) { beginRun(tpl); return true; }
    }
    if (action === 'start') {
        const key = params.get('template') || '';
        const tpl = Store.getTemplate(key) || Store.findTemplateByName(key);
        if (!tpl) { setTimeout(() => toast(t('Template not found')), 300); return false; }
        if (!Timer.isActive()) { beginRun(tpl); return true; }
    }
    if (action === 'quick') {
        const m = parseInt(params.get('min'), 10);
        if (m > 0 && !Timer.isActive()) { beginRun(Store.quickTemplate(Math.min(600, m))); return true; }
    }
    return false;
}

function init() {
    applyTheme();
    applyLanguage();
    bind();
    MediaCtl.bind();
    startUiLoop();
    const restored = Timer.restore();
    if (restored) {
        lastStartedTemplate = Store.getTemplate(restored.templateId) || (restored.quick ? Store.quickTemplate(Math.round(restored.steps[0].seconds / 60)) : null);
    }
    // Restoring can finish a session that ran out while the app was closed;
    // in that case the 'done' handler has already put the summary on screen.
    if (!handleLaunchAction() && currentScreen !== 'done') {
        showScreen(Timer.isActive() ? 'timer' : 'home');
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW registration failed', e));
    }
}

document.addEventListener('DOMContentLoaded', init);
