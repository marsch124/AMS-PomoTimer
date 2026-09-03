/* AMS PomoTimer — audio that survives the lock screen

   Phones freeze a web app's JavaScript as soon as the screen locks, unless
   the page is playing audio. So while a session runs we loop an inaudible
   track through a normal <audio> element; that keeps the timer engine and
   the chimes alive, and it makes the phone show play/pause on the lock
   screen (see MediaCtl in app.js).

   The chimes themselves are also played through <audio> elements rather
   than the Web Audio API, because those keep working in the background and
   play through the phone's media channel, which ignores the ring/silent
   switch the way a music app does. Every sound is synthesised here at start
   time; there are no audio files to ship. */

const BgAudio = (() => {
    const SR = 22050;
    let primed = false;
    let keep = null;
    const els = {};
    const urls = {};
    let silentUrl = null;

    /* 16-bit mono PCM WAV from float samples, as an object URL. */
    function wavUrl(samples) {
        const n = samples.length;
        const buf = new ArrayBuffer(44 + n * 2);
        const v = new DataView(buf);
        const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
        str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
        str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
        v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
        str(36, 'data'); v.setUint32(40, n * 2, true);
        for (let i = 0; i < n; i++) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            v.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true);
        }
        return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
    }

    /* Mix a list of notes {f, at, dur, vol, type} into one sample buffer. */
    function renderNotes(notes) {
        const total = notes.reduce((m, n) => Math.max(m, n.at + n.dur), 0) + 0.12;
        const len = Math.ceil(total * SR);
        const out = new Float32Array(len);
        notes.forEach(n => {
            const start = Math.floor(n.at * SR), count = Math.floor(n.dur * SR);
            for (let i = 0; i < count; i++) {
                const t = i / SR;
                const attack = Math.min(1, t / 0.015);
                const decay = Math.exp(-4.5 * (t / n.dur));
                const ph = 2 * Math.PI * n.f * t;
                let w = Math.sin(ph);
                if (n.type === 'square') w = w >= 0 ? 0.6 : -0.6;
                if (n.type === 'soft') w = Math.sin(ph) * 0.8 + Math.sin(2 * ph) * 0.2;
                const idx = start + i;
                if (idx < len) out[idx] += w * n.vol * attack * decay;
            }
        });
        return out;
    }

    /* Two seconds of noise a few bits above digital silence: inaudible, but
       not literally zero, so the phone treats it as real playback. */
    function renderSilence() {
        const len = SR * 2;
        const out = new Float32Array(len);
        for (let i = 0; i < len; i++) out[i] = (Math.random() * 2 - 1) * (3 / 32768);
        return out;
    }

    const DEFS = {
        focus: [{ f: 523.25, at: 0, dur: 0.4, vol: 0.55, type: 'soft' }, { f: 659.25, at: 0.16, dur: 0.4, vol: 0.55, type: 'soft' }, { f: 783.99, at: 0.32, dur: 0.7, vol: 0.55, type: 'soft' }],
        break: [{ f: 659.25, at: 0, dur: 0.45, vol: 0.4, type: 'soft' }, { f: 523.25, at: 0.22, dur: 0.7, vol: 0.4, type: 'soft' }],
        done: [{ f: 523.25, at: 0, dur: 0.45, vol: 0.5, type: 'soft' }, { f: 659.25, at: 0.18, dur: 0.45, vol: 0.5, type: 'soft' }, { f: 783.99, at: 0.36, dur: 0.45, vol: 0.5, type: 'soft' }, { f: 1046.5, at: 0.54, dur: 1.0, vol: 0.5, type: 'soft' }],
        tick: [{ f: 880, at: 0, dur: 0.08, vol: 0.3, type: 'square' }],
        ping: [{ f: 660, at: 0, dur: 0.3, vol: 0.45, type: 'soft' }, { f: 880, at: 0.15, dur: 0.45, vol: 0.45, type: 'soft' }]
    };

    function makeEl(src, loop) {
        const el = new Audio(src);
        el.preload = 'auto';
        el.loop = !!loop;
        el.setAttribute('playsinline', '');
        el.setAttribute('webkit-playsinline', '');
        return el;
    }

    /* Must run inside a user gesture (tap). Each element is started once
       with the silent track so the phone lets it play later on its own;
       then it is switched to its real chime. */
    function prime() {
        if (primed) return;
        primed = true;
        try {
            silentUrl = wavUrl(renderSilence());
            Object.keys(DEFS).forEach(kind => { urls[kind] = wavUrl(renderNotes(DEFS[kind])); });
            Object.keys(DEFS).forEach(kind => {
                const el = makeEl(silentUrl, false);
                els[kind] = el;
                const p = el.play();
                const swap = () => { try { el.pause(); el.src = urls[kind]; el.load(); el.dataset.ready = '1'; } catch (e) { /* ignore */ } };
                if (p && p.then) p.then(swap).catch(swap); else swap();
            });
            keep = makeEl(silentUrl, true);
            keep.dataset.keep = '1';
            const kp = keep.play();
            if (kp && kp.catch) kp.catch(() => {});
        } catch (e) {
            console.warn('BgAudio prime failed', e);
        }
    }

    function isPrimed() { return primed; }

    /* Play a chime through its media element. Returns false when the
       elements are not ready yet, so the caller can fall back to Web Audio. */
    function playChime(kind) {
        const el = els[kind];
        if (!primed || !el || el.dataset.ready !== '1') return false;
        try {
            el.currentTime = 0;
            const p = el.play();
            if (p && p.catch) p.catch(() => {});
            return true;
        } catch (e) { return false; }
    }

    /* Keep-alive loop on while a session exists and the setting allows it. */
    function setKeepAlive(on) {
        if (!keep) return;
        try {
            if (on) { if (keep.paused) { const p = keep.play(); if (p && p.catch) p.catch(() => {}); } }
            else if (!keep.paused) keep.pause();
        } catch (e) { /* ignore */ }
    }

    function keepAliveActive() { return !!keep && !keep.paused; }

    return { prime, isPrimed, playChime, setKeepAlive, keepAliveActive };
})();

/* ================= Voice announcements ================= */
const Voice = (() => {
    function supported() { return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window; }
    let queued = null;
    function say(text, lang) {
        if (!supported() || !text) return;
        try {
            clearTimeout(queued);
            // A short delay lets the chime finish before the voice starts.
            queued = setTimeout(() => {
                window.speechSynthesis.cancel();
                const u = new SpeechSynthesisUtterance(text);
                u.lang = lang || document.documentElement.lang || 'en';
                u.rate = 1;
                u.pitch = 1;
                u.volume = 1;
                window.speechSynthesis.speak(u);
            }, 900);
        } catch (e) { /* ignore */ }
    }
    function stop() {
        clearTimeout(queued);
        if (supported()) window.speechSynthesis.cancel();
    }
    return { supported, say, stop };
})();
