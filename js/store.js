/* AMS PomoTimer — data layer (templates, settings, history, running session)
   Everything lives in localStorage. No servers, no accounts. */

const Store = (() => {
    const KEYS = {
        templates: 'pomo.templates',
        settings: 'pomo.settings',
        history: 'pomo.history',
        run: 'pomo.run',
        lastTemplate: 'pomo.lastTemplate',
        lastExport: 'pomo.lastExport',
        lastBackupNag: 'pomo.lastBackupNag'
    };

    /* Share links carry a template in a compact form: type letters instead of
       names, labels only when they differ from the default. */
    const TYPE_CODE = { startup: 's', prep: 'p', focus: 'f', pause: 'b', longbreak: 'l', cooldown: 'c' };
    const CODE_TYPE = Object.fromEntries(Object.entries(TYPE_CODE).map(([k, v]) => [v, k]));

    /* The phase vocabulary. Order here is the order of the "Add phase" chips.
       Each phase type has a colour and a hand-drawn symbol (see the sprite in
       index.html). */
    const PHASE_TYPES = {
        startup:   { label: 'Start-up',    color: 'var(--phase-startup)',   hex: '#22D3EE', icon: 'sunrise', defaultSec: 120  },
        prep:      { label: 'Preparation', color: 'var(--phase-prep)',      hex: '#FFB800', icon: 'notes',   defaultSec: 180  },
        focus:     { label: 'Pomodoro',    color: 'var(--phase-focus)',     hex: '#FF2E63', icon: 'tomato',  defaultSec: 1500 },
        pause:     { label: 'Pause',       color: 'var(--phase-pause)',     hex: '#2EE86B', icon: 'coffee',  defaultSec: 300  },
        longbreak: { label: 'Long break',  color: 'var(--phase-longbreak)', hex: '#00D9C0', icon: 'lotus',   defaultSec: 900  },
        cooldown:  { label: 'Cool-down',   color: 'var(--phase-cooldown)',  hex: '#B44CFF', icon: 'moon',    defaultSec: 300  }
    };

    /* Template icons — all hand-drawn symbols from the sprite. */
    const ICONS = ['tomato', 'clock', 'target', 'book', 'laptop', 'pen', 'lotus', 'coffee', 'moon', 'flame', 'brain', 'star', 'heart', 'music', 'run'];

    /* Templates saved by the 1.0 build carried an emoji; map each to the
       closest drawing so nothing looks broken after the update. */
    const EMOJI_TO_ICON = {
        '🍅': 'tomato', '⏱': 'clock', '⏲': 'clock', '🎯': 'target', '📚': 'book', '💻': 'laptop', '✍️': 'pen', '📝': 'pen',
        '🧘': 'lotus', '🏃': 'run', '🎨': 'star', '🎧': 'music', '🧹': 'star', '☕': 'coffee', '🌙': 'moon', '🔥': 'flame', '🧠': 'brain'
    };

    const COLORS = ['#FF2E63', '#FF7A00', '#FFB800', '#2EE86B', '#22D3EE', '#3B82F6', '#B44CFF', '#FF4FD8'];

    /* Suggested tags; any custom word works too. */
    const TAG_PRESETS = ['work', 'study', 'admin', 'writing', 'reading', 'planning', 'creative', 'health'];

    function cleanTags(list) {
        if (!Array.isArray(list)) return [];
        const out = [];
        list.forEach(t => {
            const v = String(t || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 20);
            if (v && !out.includes(v)) out.push(v);
        });
        return out.slice(0, 6);
    }

    /* Every tag ever used on a template or a session, most used first. */
    function allTags() {
        const count = {};
        getTemplates().forEach(t => cleanTags(t.tags).forEach(x => { count[x] = (count[x] || 0) + 1; }));
        getHistory().forEach(h => cleanTags(h.tags).forEach(x => { count[x] = (count[x] || 0) + 1; }));
        const list = Object.keys(count).sort((a, b) => count[b] - count[a] || a.localeCompare(b));
        TAG_PRESETS.forEach(p => { if (!list.includes(p)) list.push(p); });
        return list;
    }

    const DEFAULT_SETTINGS = {
        autoAdvance: true,
        wakeLock: true,
        ticks: true,
        sound: true,
        vibrate: true,
        notify: false,
        theme: 'system',
        bgAudio: true,   // keep an inaudible track playing so alerts work when locked
        voice: false,    // spoken announcements at each phase change
        dailyGoal: 4,    // Pomodoros per day; 0 switches the goal off
        lang: '',        // '' = follow the phone's language
        textSize: 'normal'
    };

    function uid(prefix) {
        return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    }

    function step(type, minutes, label) {
        const def = (typeof I18N !== 'undefined') ? I18N.t(PHASE_TYPES[type].label) : PHASE_TYPES[type].label;
        return { id: uid('s'), type, label: label || def, seconds: Math.round(minutes * 60) };
    }

    function b64url(str) {
        const bytes = new TextEncoder().encode(str);
        let bin = '';
        bytes.forEach(b => { bin += String.fromCharCode(b); });
        return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function unb64url(s) {
        s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';
        const bin = atob(s);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return new TextDecoder().decode(bytes);
    }

    function encodeShare(tpl) {
        const obj = {
            n: String(tpl.name || '').slice(0, 40),
            i: iconFor(tpl),
            c: tpl.color || '#FF2E63',
            s: (tpl.steps || []).map(s => {
                const def = PHASE_TYPES[s.type] ? PHASE_TYPES[s.type].label : '';
                const arr = [TYPE_CODE[s.type] || 'f', s.seconds];
                if (s.label && s.label !== def && (typeof I18N === 'undefined' || s.label !== I18N.t(def))) arr.push(String(s.label).slice(0, 30));
                return arr;
            })
        };
        if (tpl.autoAdvance === true) obj.a = 1;
        if (tpl.autoAdvance === false) obj.a = 0;
        const tags = cleanTags(tpl.tags);
        if (tags.length) obj.g = tags;
        return b64url(JSON.stringify(obj));
    }

    function decodeShare(payload) {
        let obj;
        try { obj = JSON.parse(unb64url(payload)); } catch (e) { throw new Error('Not a PomoTimer template link'); }
        if (!obj || !Array.isArray(obj.s) || !obj.s.length) throw new Error('Not a PomoTimer template link');
        const tpl = {
            id: uid('t'),
            name: String(obj.n || 'Shared template').slice(0, 40),
            icon: ICONS.includes(obj.i) ? obj.i : 'tomato',
            color: /^#[0-9a-fA-F]{6}$/.test(obj.c || '') ? obj.c : '#FF2E63',
            autoAdvance: obj.a === 1 ? true : obj.a === 0 ? false : null,
            tags: cleanTags(obj.g),
            steps: obj.s.map(a => {
                const type = CODE_TYPE[a[0]] || 'focus';
                const sec = Math.max(0, Math.min(36000, Math.round(Number(a[1]) || 0)));
                return step(type, sec / 60, a[2] ? String(a[2]).slice(0, 30) : null);
            }).filter(s => s.seconds > 0)
        };
        if (!tpl.steps.length) throw new Error('Not a PomoTimer template link');
        return tpl;
    }

    function findTemplateByName(name) {
        const key = String(name || '').trim().toLowerCase();
        if (!key) return null;
        return getTemplates().find(t => (t.name || '').trim().toLowerCase() === key) || null;
    }

    function getLastExport() { return read(KEYS.lastExport, 0); }
    function setLastExport() { write(KEYS.lastExport, Date.now()); }
    function getLastBackupNag() { return read(KEYS.lastBackupNag, 0); }
    function setLastBackupNag() { write(KEYS.lastBackupNag, Date.now()); }

    function iconFor(obj) {
        if (!obj) return 'tomato';
        if (obj.icon && ICONS.includes(obj.icon)) return obj.icon;
        if (obj.emoji && EMOJI_TO_ICON[obj.emoji]) return EMOJI_TO_ICON[obj.emoji];
        return 'tomato';
    }

    /* Built-in templates. IDs are stable so "Restore built-ins" can put them
       back without creating duplicates. The first one is exactly the sequence
       the app was asked for. */
    function builtinTemplates() {
        return [
            {
                id: 'builtin-classic', builtin: true, name: 'Classic Pomodoro', icon: 'tomato', color: '#FF2E63', autoAdvance: null,
                steps: [
                    step('startup', 2), step('prep', 3), step('focus', 25), step('pause', 5), step('focus', 25), step('cooldown', 5)
                ]
            },
            {
                id: 'builtin-four', builtin: true, name: 'Four Pomodoros', icon: 'target', color: '#FFB800', autoAdvance: null,
                steps: [
                    step('startup', 2), step('prep', 3),
                    step('focus', 25), step('pause', 5),
                    step('focus', 25), step('pause', 5),
                    step('focus', 25), step('longbreak', 15),
                    step('focus', 25), step('cooldown', 5)
                ]
            },
            {
                id: 'builtin-deep', builtin: true, name: 'Deep Work 50/10', icon: 'brain', color: '#22D3EE', autoAdvance: null,
                steps: [
                    step('startup', 2), step('prep', 5), step('focus', 50), step('pause', 10), step('focus', 50), step('cooldown', 10)
                ]
            },
            {
                id: 'builtin-short', builtin: true, name: 'Short Burst', icon: 'flame', color: '#FF7A00', autoAdvance: null,
                steps: [
                    step('prep', 1), step('focus', 15), step('pause', 3), step('focus', 15), step('cooldown', 2)
                ]
            },
            {
                id: 'builtin-single', builtin: true, name: 'Single Pomodoro', icon: 'clock', color: '#B44CFF', autoAdvance: null,
                steps: [
                    step('prep', 1), step('focus', 25), step('cooldown', 2)
                ]
            }
        ];
    }

    function read(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            console.warn('Store read failed', key, e);
            return fallback;
        }
    }

    function write(key, value) {
        try {
            if (value === null || value === undefined) localStorage.removeItem(key);
            else localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('Store write failed', key, e);
        }
    }

    /* ---------- Templates ---------- */
    function getTemplates() {
        let list = read(KEYS.templates, null);
        if (!Array.isArray(list)) {
            list = builtinTemplates();
            write(KEYS.templates, list);
            return list;
        }
        // Migrate 1.0 templates (emoji) to icons, once.
        let changed = false;
        list.forEach(t => {
            if (!t.icon) { t.icon = iconFor(t); delete t.emoji; changed = true; }
        });
        if (changed) write(KEYS.templates, list);
        return list;
    }

    function saveTemplates(list) {
        write(KEYS.templates, list);
    }

    function getTemplate(id) {
        return getTemplates().find(t => t.id === id) || null;
    }

    function saveTemplate(tpl) {
        const list = getTemplates();
        const idx = list.findIndex(t => t.id === tpl.id);
        tpl.updatedAt = Date.now();
        if (idx >= 0) list[idx] = tpl;
        else { tpl.createdAt = tpl.createdAt || Date.now(); list.push(tpl); }
        saveTemplates(list);
        return tpl;
    }

    /* Move a template within the list; the list order is the order shown. */
    function reorderTemplates(from, to) {
        const list = getTemplates();
        if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return false;
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        saveTemplates(list);
        return true;
    }

    function deleteTemplate(id) {
        saveTemplates(getTemplates().filter(t => t.id !== id));
    }

    function newTemplate() {
        return {
            id: uid('t'), name: '', icon: 'tomato', color: '#FF2E63', autoAdvance: null,
            steps: [step('startup', 2), step('prep', 3), step('focus', 25), step('pause', 5), step('focus', 25), step('cooldown', 5)]
        };
    }

    function duplicateTemplate(tpl) {
        const copy = JSON.parse(JSON.stringify(tpl));
        copy.id = uid('t');
        copy.builtin = false;
        copy.name = (tpl.name || 'Template') + ((typeof I18N !== 'undefined') ? I18N.t(' copy') : ' copy');
        copy.steps = copy.steps.map(s => ({ ...s, id: uid('s') }));
        delete copy.createdAt;
        return copy;
    }

    function restoreBuiltins() {
        const list = getTemplates();
        const existing = new Set(list.map(t => t.id));
        let added = 0;
        builtinTemplates().forEach(b => {
            if (!existing.has(b.id)) { list.push(b); added++; }
        });
        saveTemplates(list);
        return added;
    }

    /* A throw-away template for the quick timer chips: a single focus phase. */
    function quickTemplate(minutes) {
        return {
            id: 'quick-' + minutes, name: (typeof I18N !== 'undefined') ? I18N.t('{n} min Pomodoro', { n: minutes }) : minutes + ' min Pomodoro', icon: 'clock', color: '#FF2E63', autoAdvance: null, quick: true,
            steps: [step('focus', minutes)]
        };
    }

    function templateTotalSec(tpl) {
        return (tpl.steps || []).reduce((a, s) => a + (s.seconds || 0), 0);
    }

    /* ---------- Settings ---------- */
    function getSettings() {
        return { ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) };
    }

    function saveSettings(patch) {
        const merged = { ...getSettings(), ...patch };
        write(KEYS.settings, merged);
        return merged;
    }

    /* ---------- History ---------- */
    function getHistory() {
        const h = read(KEYS.history, []);
        return Array.isArray(h) ? h : [];
    }

    function addHistory(entry) {
        const list = getHistory();
        list.unshift(entry);
        if (list.length > 500) list.length = 500;
        write(KEYS.history, list);
    }

    /* Change one saved session, e.g. to add the note written afterwards. */
    function updateHistory(id, patch) {
        const list = getHistory();
        const i = list.findIndex(h => h.id === id);
        if (i < 0) return null;
        if (patch && typeof patch.note === 'string') patch = { ...patch, note: patch.note.trim().slice(0, 140) };
        list[i] = { ...list[i], ...patch };
        write(KEYS.history, list);
        return list[i];
    }

    function deleteHistory(id) {
        write(KEYS.history, getHistory().filter(h => h.id !== id));
    }

    function clearHistory() {
        write(KEYS.history, []);
    }

    function dayKey(ts) {
        const d = new Date(ts);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function stats() {
        const now = Date.now();
        const today = dayKey(now);
        const weekStart = new Date();
        weekStart.setHours(0, 0, 0, 0);
        // Week starts on Monday
        const dow = (weekStart.getDay() + 6) % 7;
        weekStart.setDate(weekStart.getDate() - dow);
        const weekTs = weekStart.getTime();

        const out = {
            today: { sessions: 0, pomodoros: 0, focusSec: 0, interruptions: 0 },
            week: { sessions: 0, pomodoros: 0, focusSec: 0, interruptions: 0 },
            all: { sessions: 0, pomodoros: 0, focusSec: 0, interruptions: 0 },
            tagsWeek: {},
            tagsAll: {}
        };
        const bumpTag = (bucket, tag, h) => {
            const b = bucket[tag] || (bucket[tag] = { sessions: 0, pomodoros: 0, focusSec: 0 });
            b.sessions++; b.pomodoros += h.pomodoros || 0; b.focusSec += h.focusSec || 0;
        };
        getHistory().forEach(h => {
            const bump = b => { b.sessions++; b.pomodoros += h.pomodoros || 0; b.focusSec += h.focusSec || 0; b.interruptions += h.interruptions || 0; };
            bump(out.all);
            if (h.endedAt >= weekTs) bump(out.week);
            if (dayKey(h.endedAt) === today) bump(out.today);
            cleanTags(h.tags).forEach(tag => {
                bumpTag(out.tagsAll, tag, h);
                if (h.endedAt >= weekTs) bumpTag(out.tagsWeek, tag, h);
            });
        });
        return out;
    }

    /* Per-day and per-hour figures for the charts, plus streaks.
       A "day with focus" is a day with at least one completed Pomodoro. */
    function insights(days) {
        days = days || 28;
        const hist = getHistory();
        const byDay = {};
        const byHour = new Array(24).fill(0);
        hist.forEach(h => {
            const k = dayKey(h.endedAt);
            const d = byDay[k] || (byDay[k] = { pomodoros: 0, focusSec: 0, sessions: 0 });
            d.pomodoros += h.pomodoros || 0;
            d.focusSec += h.focusSec || 0;
            d.sessions++;
            // Spread the focus time over the hours the session covered.
            const start = h.startedAt || h.endedAt, end = h.endedAt || start;
            const span = Math.max(1, end - start);
            const focus = h.focusSec || 0;
            let t = start;
            while (t < end) {
                const hourEnd = new Date(t); hourEnd.setMinutes(60, 0, 0);
                const slice = Math.min(hourEnd.getTime(), end) - t;
                byHour[new Date(t).getHours()] += focus * (slice / span);
                t += slice;
            }
        });
        // Series for the last N days, oldest first
        const series = [];
        const today = new Date(); today.setHours(0, 0, 0, 0);
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today); d.setDate(today.getDate() - i);
            const k = dayKey(d.getTime());
            const v = byDay[k] || { pomodoros: 0, focusSec: 0, sessions: 0 };
            series.push({ key: k, ts: d.getTime(), ...v });
        }
        // Streaks: consecutive days with a Pomodoro, counting back from today (or yesterday if today is still empty)
        let streak = 0;
        const cursor = new Date(today);
        if (!(byDay[dayKey(cursor.getTime())] || {}).pomodoros) cursor.setDate(cursor.getDate() - 1);
        while ((byDay[dayKey(cursor.getTime())] || {}).pomodoros > 0) { streak++; cursor.setDate(cursor.getDate() - 1); }
        let longest = 0, run = 0, prev = null;
        Object.keys(byDay).filter(k => byDay[k].pomodoros > 0).sort().forEach(k => {
            const t = new Date(k + 'T00:00:00').getTime();
            run = (prev !== null && Math.round((t - prev) / 86400000) === 1) ? run + 1 : 1;
            prev = t;
            if (run > longest) longest = run;
        });
        let bestHour = -1, bestVal = 0;
        byHour.forEach((v, i) => { if (v > bestVal) { bestVal = v; bestHour = i; } });
        return { series, byHour, streak, longest, bestHour, bestHourSec: bestVal };
    }

    /* ---------- Running session ---------- */
    function getRun() { return read(KEYS.run, null); }
    function saveRun(run) { write(KEYS.run, run); }

    function getLastTemplateId() { return read(KEYS.lastTemplate, null); }
    function setLastTemplateId(id) { write(KEYS.lastTemplate, id); }

    /* ---------- Import / export ---------- */
    function exportData() {
        return {
            app: 'AMS PomoTimer',
            version: 2,
            exportedAt: new Date().toISOString(),
            templates: getTemplates(),
            history: getHistory(),
            settings: getSettings()
        };
    }

    function importData(data) {
        if (!data || typeof data !== 'object') throw new Error('Not a PomoTimer file');
        let templates = 0, history = 0;
        if (Array.isArray(data.templates)) {
            const list = getTemplates();
            data.templates.forEach(t => {
                if (!t || !Array.isArray(t.steps)) return;
                const clean = {
                    id: t.id || uid('t'),
                    name: String(t.name || 'Imported'),
                    icon: iconFor(t),
                    color: t.color || '#FF2E63',
                    autoAdvance: t.autoAdvance === true ? true : (t.autoAdvance === false ? false : null),
                    builtin: !!t.builtin,
                    tags: cleanTags(t.tags),
                    steps: t.steps.filter(s => s && PHASE_TYPES[s.type]).map(s => ({
                        id: s.id || uid('s'),
                        type: s.type,
                        label: String(s.label || PHASE_TYPES[s.type].label),
                        seconds: Math.max(0, Math.round(Number(s.seconds) || 0))
                    }))
                };
                const idx = list.findIndex(x => x.id === clean.id);
                if (idx >= 0) list[idx] = clean; else list.push(clean);
                templates++;
            });
            saveTemplates(list);
        }
        if (Array.isArray(data.history)) {
            const list = getHistory();
            const ids = new Set(list.map(h => h.id));
            data.history.forEach(h => {
                if (!h || !h.id || ids.has(h.id)) return;
                list.push({ ...h, icon: iconFor(h) });
                history++;
            });
            list.sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
            write(KEYS.history, list);
        }
        if (data.settings && typeof data.settings === 'object') {
            saveSettings(data.settings);
        }
        return { templates, history };
    }

    return {
        PHASE_TYPES, ICONS, COLORS, TAG_PRESETS, uid, step, iconFor, cleanTags, allTags,
        getTemplates, getTemplate, saveTemplate, reorderTemplates, deleteTemplate, newTemplate, duplicateTemplate, restoreBuiltins, quickTemplate, templateTotalSec,
        getSettings, saveSettings,
        getHistory, addHistory, updateHistory, deleteHistory, clearHistory, stats, insights, dayKey,
        getRun, saveRun, getLastTemplateId, setLastTemplateId,
        exportData, importData, encodeShare, decodeShare, findTemplateByName,
        getLastExport, setLastExport, getLastBackupNag, setLastBackupNag
    };
})();
