/* AMS PomoTimer — timer engine
   Time is tracked with wall-clock timestamps, never by counting ticks, so the
   countdown stays correct when the phone sleeps or the tab is in the background.
   The whole state is written to localStorage after every change so a reload
   (or the OS killing the tab) picks up exactly where it left off. */

const Timer = (() => {
    let run = null;
    let interval = null;
    let lastTickSecond = null;
    const listeners = { change: [], phase: [], done: [], tick: [] };

    function on(evt, fn) { listeners[evt].push(fn); }
    function emit(evt, payload) { listeners[evt].forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } }); }

    function now() { return Date.now(); }

    function persist() {
        Store.saveRun(run && run.status !== 'done' ? run : null);
        emit('change', run);
    }

    function ensureTicking() {
        if (interval) return;
        interval = setInterval(tick, 250);
    }

    function stopTicking() {
        if (interval) clearInterval(interval);
        interval = null;
    }

    /* ---------- Session lifecycle ---------- */
    function start(template, opts) {
        const settings = Store.getSettings();
        const auto = template.autoAdvance === true ? true
            : template.autoAdvance === false ? false
            : settings.autoAdvance;
        const steps = (template.steps || []).filter(s => s.seconds > 0).map(s => ({
            id: s.id, type: s.type, label: s.label, seconds: s.seconds
        }));
        if (!steps.length) return null;

        run = {
            id: Store.uid('r'),
            templateId: template.id,
            name: template.name,
            icon: Store.iconFor(template),
            color: template.color,
            quick: !!template.quick,
            autoAdvance: auto,
            intention: (opts && opts.intention) ? String(opts.intention).slice(0, 120) : '',
            tags: Store.cleanTags((opts && opts.tags) || template.tags),
            interruptions: 0,
            steps,
            index: 0,
            status: 'running',
            startedAt: now(),
            phaseStartedAt: now(),
            phaseTotalMs: steps[0].seconds * 1000,
            endsAt: now() + steps[0].seconds * 1000,
            remainingMs: null,
            focusSec: 0,
            pomodoros: 0,
            phasesDone: 0
        };
        if (!template.quick) Store.setLastTemplateId(template.id);
        persist();
        ensureTicking();
        emit('phase', { run, step: steps[0], index: 0, reason: 'start' });
        return run;
    }

    function restore() {
        const saved = Store.getRun();
        if (saved && saved.status && saved.status !== 'done' && Array.isArray(saved.steps) && saved.steps.length) {
            run = saved;
            ensureTicking();
            tick();
            emit('change', run);
            return run;
        }
        return null;
    }

    function currentStep() { return run ? run.steps[run.index] : null; }

    function remainingMs() {
        if (!run) return 0;
        if (run.status === 'running') return Math.max(0, run.endsAt - now());
        return Math.max(0, run.remainingMs || 0);
    }

    function elapsedInPhaseMs() {
        return Math.max(0, run.phaseTotalMs - remainingMs());
    }

    /* Credit the time spent in the phase that is ending. Only Pomodoro phases
       count as focus time; a Pomodoro counts as completed once at least 80% of
       it was actually spent (so skipping the last 30 seconds still counts, but
       skipping right after starting does not). */
    function creditPhase(completed) {
        const step = currentStep();
        if (!step) return;
        const elapsedSec = Math.round(elapsedInPhaseMs() / 1000);
        if (step.type === 'focus') run.focusSec += elapsedSec;
        // A phase that was extended with "1 / 5 min more" has already been
        // counted; the extra time adds focus minutes but not a second Pomodoro.
        if (step.credited) return;
        if (completed || elapsedSec >= step.seconds * 0.8) {
            step.credited = true;
            run.phasesDone++;
            if (step.type === 'focus') run.pomodoros++;
        }
    }

    function enterPhase(index, startNow, anchorTs) {
        run.index = index;
        const step = run.steps[index];
        run.phaseTotalMs = step.seconds * 1000;
        if (startNow) {
            const base = anchorTs != null ? anchorTs : now();
            run.status = 'running';
            run.phaseStartedAt = base;
            run.endsAt = base + run.phaseTotalMs;
            run.remainingMs = null;
            run.idleSince = null;
        } else {
            run.status = 'waiting';
            run.remainingMs = run.phaseTotalMs;
            run.endsAt = null;
            // The clock stands still from here until the user taps.
            run.idleSince = now();
        }
        lastTickSecond = null;
    }

    function completeCurrentPhase() {
        const finished = currentStep();
        const finishedIndex = run.index;
        const finishedAt = run.endsAt;
        // Timer shows 0:00 — the whole phase was spent.
        run.remainingMs = 0;
        run.status = 'paused';
        creditPhase(true);
        // Remembered so the user can still add a minute or five to this phase
        // after it has rung out ("not quite ready yet").
        run.lastFinished = { index: finishedIndex, at: now() };

        if (run.index + 1 < run.steps.length) {
            // When auto-advancing, anchor the next phase to the moment this one
            // ended, not to "now": if the phone slept through the transition the
            // next phase has already been running for a while.
            enterPhase(run.index + 1, run.autoAdvance, run.autoAdvance ? finishedAt : null);
            persist();
            emit('phase', { run, step: currentStep(), index: run.index, finished, finishedIndex, reason: 'complete' });
        } else {
            finish(true);
        }
    }

    function tick() {
        if (!run) { stopTicking(); return; }
        if (run.status !== 'running') return;
        let guard = 0;
        while (run && run.status === 'running' && run.endsAt - now() <= 0 && guard < 100) {
            guard++;
            completeCurrentPhase();
        }
        if (!run || run.status !== 'running') return;
        const rem = run.endsAt - now();
        const sec = Math.ceil(rem / 1000);
        if (sec !== lastTickSecond) {
            lastTickSecond = sec;
            if (sec > 0 && sec <= 3) emit('tick', { secondsLeft: sec });
        }
    }

    function finish(completed, keepAnyway) {
        if (!run) return;
        if (!completed) {
            // Stopped mid-phase: credit what was actually spent.
            creditPhase(false);
        }
        run.status = 'done';
        run.endedAt = now();
        run.completed = !!completed;
        stopTicking();
        const entry = {
            id: run.id,
            templateId: run.templateId,
            name: run.name,
            icon: Store.iconFor(run),
            color: run.color,
            startedAt: run.startedAt,
            endedAt: run.endedAt,
            focusSec: run.focusSec,
            pomodoros: run.pomodoros,
            phasesDone: run.phasesDone,
            phasesTotal: run.steps.length,
            completed: !!completed,
            intention: run.intention || '',
            tags: Store.cleanTags(run.tags),
            interruptions: run.interruptions || 0
        };
        // Do not clutter history with quick timers that were stopped at once,
        // unless the user explicitly asked for this one to be kept.
        if (entry.focusSec >= 60 || entry.completed || keepAnyway) Store.addHistory(entry);
        const finishedRun = run;
        persist();
        run = null;
        Store.saveRun(null);
        emit('done', { run: finishedRun, entry });
    }

    /* ---------- Controls ---------- */
    function pause() {
        if (!run || run.status !== 'running') return;
        run.remainingMs = Math.max(0, run.endsAt - now());
        run.status = 'paused';
        run.endsAt = null;
        // When the standing still began, so the app can nudge and, after a
        // long while, offer to resume, finish or discard the session.
        run.idleSince = now();
        persist();
    }

    function resume() {
        if (!run || (run.status !== 'paused' && run.status !== 'waiting')) return;
        run.endsAt = now() + (run.remainingMs || 0);
        run.phaseStartedAt = run.endsAt - run.phaseTotalMs;
        run.status = 'running';
        run.remainingMs = null;
        run.idleSince = null;
        lastTickSecond = null;
        persist();
        ensureTicking();
        tick();
    }

    function toggle() {
        if (!run) return;
        if (run.status === 'running') pause(); else resume();
    }

    /* Start the phase we are waiting on (manual advance mode). */
    function startWaiting() {
        if (!run || run.status !== 'waiting') return;
        run.lastFinished = null;
        resume();
        emit('phase', { run, step: currentStep(), index: run.index, reason: 'manual' });
    }

    function jumpTo(index) {
        if (!run) return;
        if (index < 0 || index >= run.steps.length) return;
        creditPhase(false);
        run.lastFinished = null;
        enterPhase(index, true);
        persist();
        emit('phase', { run, step: currentStep(), index, reason: 'jump' });
    }

    /* Reopen the phase that just rang out and run it for `sec` more seconds.
       Works while the timer waits for a tap and, for a short grace period,
       after an automatic advance. The next phase then starts fresh afterwards. */
    function extendFinished(sec) {
        if (!run || !run.lastFinished) return false;
        const index = run.lastFinished.index;
        if (index < 0 || index >= run.steps.length) return false;
        run.index = index;
        run.phaseTotalMs = sec * 1000;
        run.status = 'running';
        run.phaseStartedAt = now();
        run.endsAt = now() + run.phaseTotalMs;
        run.remainingMs = null;
        run.lastFinished = null;
        lastTickSecond = null;
        persist();
        ensureTicking();
        emit('phase', { run, step: currentStep(), index, reason: 'extend', extraSec: sec });
        return true;
    }

    function next() {
        if (!run) return;
        if (run.index + 1 < run.steps.length) jumpTo(run.index + 1);
        else finish(true);
    }

    /* Like a music player: within the first few seconds go to the previous
       phase, otherwise restart the current one. */
    function prev() {
        if (!run) return;
        if (elapsedInPhaseMs() > 3000 || run.index === 0) jumpTo(run.index);
        else jumpTo(run.index - 1);
    }

    function adjust(deltaSec) {
        if (!run) return;
        const delta = deltaSec * 1000;
        if (run.status === 'running') {
            const rem = run.endsAt - now();
            const newRem = Math.max(0, rem + delta);
            run.endsAt = now() + newRem;
            run.phaseTotalMs = Math.max(1000, run.phaseTotalMs + (newRem - rem));
        } else {
            const rem = run.remainingMs || 0;
            const newRem = Math.max(0, rem + delta);
            run.phaseTotalMs = Math.max(1000, run.phaseTotalMs + (newRem - rem));
            run.remainingMs = newRem;
        }
        lastTickSecond = null;
        persist();
    }

    function stop(keepAnyway) {
        if (!run) return;
        finish(false, !!keepAnyway);
    }

    /* Throw the session away without writing it to History. */
    function discard() {
        if (!run) return null;
        const dropped = run;
        stopTicking();
        run = null;
        Store.saveRun(null);
        emit('change', null);
        return dropped;
    }

    function setIntention(text) {
        if (!run) return;
        run.intention = String(text || '').slice(0, 120);
        persist();
    }

    /* One tap per distraction; kept with the session in History. */
    function logInterruption() {
        if (!run) return 0;
        run.interruptions = (run.interruptions || 0) + 1;
        persist();
        return run.interruptions;
    }

    function setTags(tags) {
        if (!run) return;
        run.tags = Store.cleanTags(tags);
        persist();
    }

    /* ---------- Derived state for the UI ---------- */
    function snapshot() {
        if (!run) return null;
        const rem = remainingMs();
        const step = currentStep();
        const sessionTotal = run.steps.reduce((a, s) => a + s.seconds * 1000, 0);
        let sessionRemaining = rem;
        for (let i = run.index + 1; i < run.steps.length; i++) sessionRemaining += run.steps[i].seconds * 1000;
        return {
            run,
            step,
            index: run.index,
            count: run.steps.length,
            status: run.status,
            remainingMs: rem,
            phaseTotalMs: run.phaseTotalMs,
            phaseFraction: run.phaseTotalMs > 0 ? Math.min(1, Math.max(0, rem / run.phaseTotalMs)) : 0,
            sessionTotalMs: sessionTotal,
            sessionRemainingMs: sessionRemaining,
            nextStep: run.steps[run.index + 1] || null,
            lastFinished: run.lastFinished || null,
            idleMs: run.idleSince ? Math.max(0, now() - run.idleSince) : 0
        };
    }

    function isActive() { return !!run; }

    return { on, start, restore, pause, resume, toggle, startWaiting, jumpTo, extendFinished, next, prev, adjust, stop, discard, setIntention, logInterruption, setTags, tick, snapshot, isActive };
})();
