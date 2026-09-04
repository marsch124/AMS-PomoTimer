/* AMS PomoTimer — languages
   English is written straight into index.html and the scripts. Other
   languages map each English string to its translation. Static text is
   swapped in place by apply(); text produced by scripts goes through t(). */

const I18N = (() => {
    let lang = 'en';

    const DE = {
        // ---- Tabs and screens ----
        'Timer': 'Timer', 'Templates': 'Vorlagen', 'History': 'Verlauf', 'Settings': 'Einstellungen',
        'Session in progress': 'Sitzung läuft', 'Continue': 'Weiter',
        'Quick start': 'Schnellstart',
        'Tap a template to start it right away. Hold it to adjust first.': 'Tippe auf eine Vorlage, um sofort zu starten. Halte sie gedrückt, um vorher etwas anzupassen.',
        'Quick timer': 'Schnell-Timer',
        'Bar': 'Balken',
        'The bar in each card is the session: one block per phase, in order, as long as the phase lasts.': 'Der Balken in jeder Karte ist die Sitzung: ein Block pro Phase, der Reihe nach, so lang wie die Phase dauert.',
        'One single Pomodoro, no other phases.': 'Ein einzelner Pomodoro, keine weiteren Phasen.',
        'Minutes': 'Minuten', 'Start': 'Start', 'Today': 'Heute', 'Yesterday': 'Gestern',
        'Pomodoros': 'Pomodoros', 'Focus': 'Fokus', 'Sessions': 'Sitzungen',
        'Untitled': 'Ohne Namen', '· last': '· zuletzt', 'New template': 'Neue Vorlage',
        'paused': 'pausiert', 'waiting for you': 'wartet auf dich', 'running': 'läuft',
        'A session is already running. Stop it and start a new one?': 'Es läuft bereits eine Sitzung. Beenden und eine neue starten?',
        'Start new': 'Neu starten',
        'This template has no phases with a duration.': 'Diese Vorlage hat keine Phase mit einer Dauer.',
        // ---- Goal ----
        'Daily goal reached: {a} of {b}': 'Tagesziel erreicht: {a} von {b}',
        '{a} of {b} Pomodoros today': '{a} von {b} Pomodoros heute',
        '{n}-day streak': '{n} Tage in Folge', '{n} to go': 'noch {n}', 'Nice work': 'Gut gemacht',
        'Daily goal reached': 'Tagesziel erreicht', 'Daily goal reached: {n} Pomodoros': 'Tagesziel erreicht: {n} Pomodoros',
        'Daily goal reached.': 'Tagesziel erreicht.',
        // ---- Timer screen ----
        'Phase {a} of {b}': 'Phase {a} von {b}', 'Pause': 'Pause', 'Resume': 'Weiter', 'Prev': 'Zurück', 'Skip': 'Weiter', 'min': 'Min',
        'Next: <b>{label}</b> · {dur}': 'Dann: <b>{label}</b> · {dur}',
        'Last phase — then you are done.': 'Letzte Phase – danach bist du fertig.',
        'Session {a}': 'Sitzung {a}', '{a} left · ends {b}': 'noch {a} · Ende {b}',
        'Tap a phase to jump to it.': 'Tippe auf eine Phase, um dorthin zu springen.',
        'Phase finished.': 'Phase beendet.', '{name} finished.': '{name} beendet.',
        '{name} finished. Not quite ready?': '{name} beendet. Noch nicht so weit?',
        'Phase': 'Phase', '1 min more': '1 Min mehr', '5 min more': '5 Min mehr', 'Start next phase': 'Nächste Phase starten',
        '{d} more for {label}': '{d} mehr für {label}',
        'What are you working on? Tap to note it': 'Woran arbeitest du? Tippen zum Notieren',
        'What are you working on?': 'Woran arbeitest du?', 'Save': 'Speichern',
        '1 interruption noted': '1 Unterbrechung notiert', '{n} interruptions noted': '{n} Unterbrechungen notiert',
        'Stop this session? Progress so far is kept in History.': 'Sitzung beenden? Der bisherige Fortschritt bleibt im Verlauf.',
        'Stop': 'Beenden',
        // ---- Done ----
        'Session complete': 'Sitzung abgeschlossen', 'Session stopped': 'Sitzung beendet',
        'Run again': 'Noch einmal', 'Back to home': 'Zur Startseite', 'Interruptions': 'Unterbrechungen', 'Phases': 'Phasen',
        // ---- Voice ----
        '{a}. {b}.': '{a}. {b}.', '{a} finished. Tap to start {b}.': '{a} beendet. Tippe, um {b} zu starten.',
        '{d} more.': '{d} mehr.', 'Session complete. Well done.': 'Sitzung abgeschlossen. Gut gemacht.',
        'Voice announcements on.': 'Sprachansagen sind eingeschaltet.',
        '{n} seconds': '{n} Sekunden', '1 minute': '1 Minute', '{n} minutes': '{n} Minuten',
        // ---- Templates / editor ----
        'Each template is a sequence of phases. Tap to edit, use the play button to start, hold play to adjust first.': 'Jede Vorlage ist eine Abfolge von Phasen. Tippen zum Bearbeiten, Play zum Starten, Play gedrückt halten zum Anpassen.',
        'No templates yet. Tap the plus button to create one, or restore the built-ins in Settings.': 'Noch keine Vorlagen. Tippe auf Plus, um eine anzulegen, oder stelle die mitgelieferten in den Einstellungen wieder her.',
        'Edit template': 'Vorlage bearbeiten', 'Name': 'Name', 'e.g. Morning deep work': 'z. B. Deep Work am Morgen',
        'Icon': 'Symbol', 'Colour': 'Farbe', 'Tags': 'Tags', 'custom': 'eigener', 'New tag': 'Neuer Tag', 'Add': 'Hinzufügen',
        'Auto-start next phase': 'Nächste Phase automatisch starten', 'Use app setting': 'Wie in den Einstellungen', 'Always': 'Immer', 'Wait for tap': 'Auf Tippen warten',
        'Add phase': 'Phase hinzufügen', 'No phases yet. Add some below.': 'Noch keine Phasen. Füge unten welche hinzu.',
        'Move up': 'Nach oben', 'Move down': 'Nach unten', 'Duplicate': 'Duplizieren', 'Remove': 'Entfernen',
        'Add a Pomodoro block': 'Pomodoro-Block hinzufügen', 'Appends N Pomodoros with a pause between each.': 'Hängt N Pomodoros mit je einer Pause dazwischen an.',
        'Focus min': 'Fokus Min', 'Pause min': 'Pause Min', 'Add block': 'Block hinzufügen', 'Added {n} Pomodoros': '{n} Pomodoros hinzugefügt',
        'Duplicate template': 'Vorlage duplizieren', 'Delete template': 'Vorlage löschen', 'Share template': 'Vorlage teilen',
        'Add at least one phase with a duration.': 'Füge mindestens eine Phase mit einer Dauer hinzu.',
        'Template created': 'Vorlage angelegt', 'Template saved': 'Vorlage gespeichert', 'Duplicated': 'Dupliziert',
        'Delete “{name}”?': '„{name}“ löschen?', 'Delete': 'Löschen', 'Template deleted': 'Vorlage gelöscht',
        ' copy': ' Kopie',
        'Start-up': 'Ankommen', 'Preparation': 'Vorbereitung', 'Pomodoro': 'Pomodoro', 'Long break': 'Lange Pause', 'Cool-down': 'Ausklang',
        // ---- Sheet ----
        'Wait for a tap between phases': 'Zwischen den Phasen auf Tippen warten',
        'What will you work on?': 'Woran wirst du arbeiten?', '(optional)': '(optional)', 'e.g. Draft the status report': 'z. B. Statusbericht entwerfen',
        'Cancel': 'Abbrechen', '{n} phases · {d} · ends {t}': '{n} Phasen · {d} · Ende {t}',
        // ---- History ----
        'Clear': 'Leeren', 'This week': 'Diese Woche', 'All-time focus': 'Fokus gesamt',
        'Last 4 weeks': 'Letzte 4 Wochen', 'Day streak': 'Tage in Folge', 'Longest streak': 'Längste Serie', 'Best hour': 'Beste Stunde',
        'Focus minutes per day': 'Fokusminuten pro Tag', 'Focus by hour of day': 'Fokus nach Tageszeit', '· all time': '· gesamt',
        'Tap a bar for details.': 'Tippe auf einen Balken für Details.',
        '{n} session': '{n} Sitzung', '{n} sessions': '{n} Sitzungen', '{d} of focus, all time': '{d} Fokus insgesamt',
        'Focus by tag · this week': 'Fokus nach Tag · diese Woche',
        'No sessions yet. Finish a session and it shows up here.': 'Noch keine Sitzungen. Schließe eine ab, dann erscheint sie hier.',
        '· stopped': '· abgebrochen', 'phases': 'Phasen',
        'Clear the whole history? This cannot be undone.': 'Den gesamten Verlauf löschen? Das kann nicht rückgängig gemacht werden.',
        // ---- Settings ----
        'Keep screen awake while running': 'Bildschirm während der Sitzung wach halten',
        'Countdown ticks in last 3 seconds': 'Ticken in den letzten 3 Sekunden',
        'Daily goal': 'Tagesziel', 'Pomodoros per day, 0 = off': 'Pomodoros pro Tag, 0 = aus',
        'Daily goal: {n} Pomodoros': 'Tagesziel: {n} Pomodoros', 'Daily goal off': 'Tagesziel aus',
        'Alerts': 'Hinweise', 'Sound': 'Ton', 'Vibration': 'Vibration', 'Notifications': 'Mitteilungen',
        'Keep alerts working when locked': 'Hinweise auch bei gesperrtem Bildschirm',
        'Plays an inaudible track while a session runs': 'Spielt während einer Sitzung eine unhörbare Tonspur',
        'Voice announcements': 'Sprachansagen', 'Speaks each phase change': 'Sagt jeden Phasenwechsel an',
        'Test alert': 'Hinweis testen', 'Play': 'Abspielen',
        'Notifications are not supported here.': 'Mitteilungen werden hier nicht unterstützt.',
        'Notifications on': 'Mitteilungen ein',
        'Permission not granted. On iOS, install the app to the Home Screen first.': 'Keine Berechtigung. Auf dem iPhone die App zuerst zum Home-Bildschirm hinzufügen.',
        'Appearance': 'Darstellung', 'Theme': 'Design', 'System': 'System', 'Dark': 'Dunkel', 'Light': 'Hell',
        'Language': 'Sprache', 'Text size': 'Textgröße', 'Normal': 'Normal', 'Large': 'Groß', 'Extra large': 'Sehr groß',
        'Data': 'Daten', 'Export templates & history': 'Vorlagen & Verlauf exportieren', 'Export': 'Exportieren',
        'Share backup file': 'Sicherung teilen', 'Share': 'Teilen',
        'Import from file': 'Aus Datei importieren', 'Import': 'Importieren',
        'Import template from link or code': 'Vorlage aus Link oder Code importieren', 'Paste': 'Einfügen',
        'Paste a PomoTimer template link or code': 'Füge einen PomoTimer-Vorlagenlink oder -Code ein',
        'Restore built-in templates': 'Mitgelieferte Vorlagen wiederherstellen', 'Restore': 'Wiederherstellen',
        'Imported {a} templates, {b} sessions': '{a} Vorlagen und {b} Sitzungen importiert',
        'Import failed: ': 'Import fehlgeschlagen: ',
        'Restored {n} built-in templates': '{n} mitgelieferte Vorlagen wiederhergestellt',
        'All built-ins are already there': 'Alle mitgelieferten Vorlagen sind bereits da',
        'How this works': 'So funktioniert es', 'Version': 'Version', 'Install': 'Installieren',
        'Backup exported': 'Sicherung exportiert', 'Sharing is not available here; the file was downloaded instead.': 'Teilen ist hier nicht verfügbar; die Datei wurde stattdessen heruntergeladen.',
        'It has been a while since your last backup. Settings → Export keeps your templates and history safe.': 'Deine letzte Sicherung liegt eine Weile zurück. Einstellungen → Exportieren sichert Vorlagen und Verlauf.',
        'Not a PomoTimer template link': 'Kein PomoTimer-Vorlagenlink',
        'Add template “{name}”?': 'Vorlage „{name}“ hinzufügen?',
        'Template “{name}” added': 'Vorlage „{name}“ hinzugefügt',
        'Link copied': 'Link kopiert', 'Copy link': 'Link kopieren', 'Share link': 'Link teilen',
        'Scan with the phone camera, or share the link. Importing works in the app under Settings → Paste.': 'Mit der Handykamera scannen oder den Link teilen. Importieren geht in der App unter Einstellungen → Einfügen.',
        'Template not found': 'Vorlage nicht gefunden', 'Close': 'Schließen', 'Deutsch': 'Deutsch', 'English': 'Englisch',
        'Start {name}': '{name} starten', 'Edit intention': 'Vorhaben bearbeiten', 'Log an interruption': 'Unterbrechung notieren',
        'Fewer': 'Weniger', 'More': 'Mehr', 'Back': 'Zurück', 'Stop session': 'Sitzung beenden', 'Start options': 'Startoptionen',
        'Focus minutes per day, last 28 days': 'Fokusminuten pro Tag, letzte 28 Tage', 'Focus minutes by hour of day': 'Fokusminuten nach Tageszeit',
        'Enter a number of minutes.': 'Gib eine Anzahl Minuten ein.',
        'Tap to start': 'Tippen zum Starten', '{label} finished': '{label} beendet', 'Phase finished': 'Phase beendet',
        'Next: {label} · {status}': 'Dann: {label} · {status}',
        '{name}: {p} Pomodoros, {f} focus': '{name}: {p} Pomodoros, {f} Fokus',
        '{n} min Pomodoro': '{n} Min Pomodoro',
        'install.text': 'iPhone: Teilen → Zum Home-Bildschirm<br>Android: Menü → App installieren',

        // ---- Help (HTML blocks) ----
        'help.1.title': 'Eine Sitzung ist eine Kette von Phasen',
        'help.1': 'Statt eines einzelnen 25-Minuten-Countdowns führt dich eine Sitzung durch den ganzen Bogen: <b>Ankommen</b> (zur Ruhe kommen, Handy weglegen), <b>Vorbereitung</b> (entscheiden, was du tun wirst), ein oder mehrere <b>Pomodoros</b> (konzentrierte Arbeit) mit <b>Pausen</b> dazwischen, optional eine <b>lange Pause</b> und zum Schluss ein <b>Ausklang</b> (notieren, was geschafft ist, aufräumen). Jede Phase hat ihre eigene Farbe, ein Blick auf den Bildschirm genügt.',
        'help.2': 'Eine Vorlage ist eine gespeicherte Abfolge von Phasen. Im Tab <b>Vorlagen</b> kannst du Phasen hinzufügen, umbenennen, umsortieren und ihre Dauer setzen sowie Symbol und Farbe wählen. <b>Pomodoro-Block hinzufügen</b> hängt mehrere Pomodoros mit Pausen auf einmal an. Mitgelieferte Vorlagen lassen sich bearbeiten oder löschen; <b>Mitgelieferte Vorlagen wiederherstellen</b> oben bringt sie zurück.',
        'help.3': 'Im Tab <b>Timer</b> startet jede Vorlage sofort, sobald du auf ihre Karte tippst. Die zuletzt benutzte steht vorne. <b>Halte</b> eine Karte (oder den Play-Knopf unter Vorlagen) gedrückt, um vor dem Start etwas anzupassen: Anzahl der Pomodoros, ob zwischen den Phasen auf ein Tippen gewartet wird, und woran du arbeiten willst. Das Blatt zeigt die Phasen und die Endzeit. Die <b>Schnell-Timer</b> starten einen einzelnen Pomodoro dieser Länge ohne weitere Phasen.',
        'help.4': 'Der große Knopf pausiert und setzt fort. <b>Weiter</b> springt zur nächsten Phase, <b>Zurück</b> startet die aktuelle neu (oder geht zurück, wenn sie gerade erst begonnen hat). <b>+1 / −1 Min</b> verändert die laufende Phase. Wenn eine Phase abläuft und du noch nicht so weit bist, öffnet <b>1 Min mehr</b> oder <b>5 Min mehr</b> diese Phase für die zusätzliche Zeit; die nächste Phase beginnt danach frisch. Das Angebot bleibt, solange der Timer auf dein Tippen wartet, oder zwei Minuten nach einem automatischen Wechsel. Die Liste unter den Knöpfen zeigt alle Phasen; tippe auf eine, um direkt dorthin zu springen. Der Balken zeigt, wie weit die Sitzung ist und wann sie endet. Den Bildschirm zu verlassen stoppt den Timer nicht; die Karte <b>Weiter</b> im Tab Timer bringt dich zurück.',
        'help.5': 'Unter dem Ring notierst du über die Stiftzeile, <b>woran du arbeitest</b>; das bleibt die ganze Sitzung sichtbar und wird mit ihr gespeichert. Der <b>Blitz-Knopf</b> daneben zählt mit einem Tippen eine Unterbrechung (Anruf, Kollegin, Gedankensprung), und der Verlauf zeigt, wie viele es pro Sitzung waren. <b>Tags</b> wie Arbeit, Studium oder Admin kannst du einer Vorlage geben oder beim Halten einer Karte wählen; der Verlauf zeigt dann die Fokusminuten pro Tag der Woche.',
        'help.6': 'Mit <b>Nächste Phase automatisch starten</b> gehen die Phasen ineinander über und bei jedem Wechsel klingt ein Ton (aufsteigend für Fokus, sanfter absteigend für Pausen). Ohne wartet der Timer am Ende jeder Phase, bis du auf <b>Nächste Phase starten</b> tippst. Das lässt sich pro Vorlage festlegen. Vibration und Mitteilungen sind optional, und die letzten drei Sekunden können ticken.',
        'help.7': 'Der Countdown basiert auf der Uhr, er bleibt also richtig, wenn das Handy schläft oder du die App wechselst. Handys frieren Web-Apps im Hintergrund normalerweise ein; mit <b>Hinweise auch bei gesperrtem Bildschirm</b> spielt die App während einer Sitzung eine unhörbare Tonspur. So kommen die Töne auch bei gesperrtem Bildschirm, und der Sperrbildschirm zeigt Play, Pause und Weiter wie bei einer Musik-App. Die Töne laufen über den Medienkanal und sind daher auch bei stummgeschaltetem Klingelschalter zu hören. Mit <b>Sprachansagen</b> wird jede Phase angesagt. <b>Bildschirm wach halten</b> ist weiterhin praktisch, wenn du auf den Ring schauen willst.',
        'help.8': 'Jede abgeschlossene oder abgebrochene Sitzung landet im <b>Verlauf</b> mit den geschafften Pomodoros und den Fokusminuten. Ein Pomodoro zählt, sobald mindestens 80 % davon vergangen sind. Setze oben ein <b>Tagesziel</b>, dann zeigt der Tab Timer einen Ring, der sich über den Tag füllt, samt deiner Serie an aufeinanderfolgenden Tagen. Der Verlauf zeigt die letzten vier Wochen Tag für Tag und deinen Fokus nach Tageszeit; tippe auf einen Balken für die Zahlen. Alles wird nur auf diesem Gerät gespeichert. <b>Exportieren</b> schreibt Vorlagen, Verlauf und Einstellungen in eine Datei; <b>Importieren</b> liest sie zurück, etwa auf einem neuen Handy.',
        'help.9': 'Unter Vorlagen öffnet <b>Vorlage teilen</b> einen QR-Code und einen Link. Wer den Code mit der Handykamera scannt oder den Link öffnet, bekommt die Vorlage angeboten. Da eine installierte App auf dem iPhone ihren eigenen Speicher hat, gibt es außerdem <b>Einfügen</b> in den Einstellungen: Link oder Code einfügen, fertig. <b>Sicherung teilen</b> schickt die Exportdatei direkt an Dateien, Mail oder AirDrop. Wenn die letzte Sicherung länger zurückliegt, erinnert dich die App etwa einmal im Monat. Für Kurzbefehle und Automationen: <code>?action=start&amp;template=Name</code> startet eine Vorlage, <code>?action=quick&amp;min=25</code> einen Schnell-Timer, <code>?action=last</code> die zuletzt benutzte Vorlage.',
        'help.9.title': 'Teilen, sichern, Kurzbefehle',
        'help.2.title': 'Vorlagen', 'help.3.title': 'Schnellstart', 'help.4.title': 'Während eine Sitzung läuft',
        'help.5.title': 'Vorhaben, Unterbrechungen und Tags', 'help.6.title': 'Automatischer Start und Hinweise',
        'help.7.title': 'Handy in der Tasche?', 'help.8.title': 'Verlauf, Tagesziel und deine Daten',

        // ---- Version blocks (HTML) ----
        'ver.1.6.5': '<li><b>Updates kommen von selbst.</b> Sobald eine neue Version geladen ist, lädt die App sich selbst neu (oder, wenn eine Sitzung läuft, gleich nach deren Ende). Unter Einstellungen → Daten gibt es außerdem <b>Jetzt aktualisieren</b>.</li>',
        'Update the app': 'App aktualisieren', 'Fetches the newest version': 'Holt die neueste Version', 'Update now': 'Jetzt aktualisieren',
        'Update ready. It is applied when the session ends.': 'Update bereit. Es wird nach Ende der Sitzung angewendet.',
        'Checking for an update…': 'Suche nach einem Update …',
        'ver.1.6.4': '<li><b>Aufgeräumte Einstellungen.</b> „So funktioniert es“ und „Version“ sind standardmäßig eingeklappt; tippe auf die Überschrift, um sie zu öffnen. Die Farblegende unter den Schnellstart-Karten ist jetzt eine kleine Zeile.</li>',
        'ver.1.6.2': '<li><b>Farblegende.</b> Unter den Schnellstart-Karten erklärt eine Legende den farbigen Balken in jeder Karte: die Phasen der Reihe nach, jedes Stück so lang wie die Phase, in den Phasenfarben (Cyan Ankommen, Gelb Vorbereitung, Pink Pomodoro, Grün Pause, Türkis lange Pause, Violett Ausklang).</li>',
        'ver.1.6.1': '<li><b>Nur fürs Handy.</b> AMS PomoTimer ist für ein aufrecht gehaltenes Handy gemacht. Das Tablet- und Querformat-Layout aus 1.6.0 wurde entfernt; auf einem breiteren Bildschirm wird das Handy-Layout einfach zentriert.</li>',
        'ver.1.6.0': '<li><b>Teilen und sichern.</b> Vorlagen als QR-Code oder Link teilen; Empfänger scannen mit der Kamera oder fügen den Link unter Einstellungen → Einfügen ein. Die Sicherungsdatei lässt sich direkt über das Teilen-Menü an Dateien, Mail oder AirDrop geben. Eine sanfte Erinnerung, wenn die letzte Sicherung über einen Monat zurückliegt.</li><li><b>Deutsch.</b> Die ganze App auf Deutsch, umschaltbar unter Darstellung. Sprachansagen sprechen die gewählte Sprache.</li><li><b>Größerer Text.</b> Zwei größere Textstufen für Leute, die nicht nach der Brille suchen wollen.</li><li><b>Kurzbefehl-Links.</b> <code>?action=start&amp;template=Name</code>, <code>?action=quick&amp;min=25</code> und <code>?action=last</code> starten Sitzungen aus Kurzbefehlen, Automationen oder Lesezeichen.</li>',
        'ver.1.5.0': '<li><b>Tagesziel.</b> Lege in den Einstellungen eine Anzahl Pomodoros pro Tag fest. Der Tab Timer zeigt einen Ring, der sich über den Tag füllt, wie viele noch fehlen und deine Serie an Tagen mit mindestens einem Pomodoro. Das Erreichen wird auf der Zusammenfassung gefeiert.</li><li><b>Verlaufsdiagramme.</b> Fokusminuten pro Tag der letzten vier Wochen, Fokus nach Tageszeit, aktuelle und längste Serie sowie deine beste Stunde. Tippe auf einen Balken für die genauen Zahlen.</li>',
        'ver.1.4.0': '<li><b>Vorhaben.</b> Notiere beim Halten einer Karte, woran du arbeitest, oder tippe während der Sitzung auf die Stiftzeile unter dem Ring. Es bleibt auf dem Timer-Bildschirm und wird mit der Sitzung im Verlauf gespeichert.</li><li><b>Unterbrechungszähler.</b> Ein Tippen auf den Blitz-Knopf zählt eine Ablenkung. Zusammenfassung und Verlauf zeigen die Anzahl.</li><li><b>Tags.</b> Gib Vorlagen Tags (Arbeit, Studium, Admin oder eigene) oder wähle sie auf dem Startblatt. Der Verlauf zeigt Fokusminuten und Pomodoros pro Tag für die laufende Woche.</li>',
        'ver.1.3.0': '<li><b>Hinweise bei gesperrtem Bildschirm.</b> Während einer Sitzung hält die App eine unhörbare Tonspur am Laufen, damit Timer und Töne auch bei gesperrtem Handy oder in der Tasche weiterlaufen. Der Sperrbildschirm zeigt Play, Pause und Weiter mit Phase und Vorlage. Die Töne sind jetzt auch bei stummgeschaltetem Klingelschalter zu hören.</li><li><b>Sprachansagen.</b> Optionale gesprochene Ansage bei jedem Phasenwechsel („Pomodoro. 25 Minuten.“) mit der Stimme des Handys.</li><li><b>Halten zum Anpassen.</b> Halte eine Schnellstart-Karte (oder den Play-Knopf unter Vorlagen) gedrückt, um ein Startblatt zu öffnen: Anzahl der Pomodoros ändern, zwischen den Phasen auf Tippen warten und notieren, woran du arbeiten willst. Das Blatt zeigt Phasen und Endzeit.</li>',
        'ver.1.2.0': '<li><b>Mehr Zeit nach dem Ende einer Phase.</b> Wenn eine Phase abläuft, bietet der Timer <b>1 Min mehr</b> und <b>5 Min mehr</b> an. Ein Tippen öffnet die Phase für die zusätzliche Zeit, danach beginnt die nächste frisch. Praktisch, wenn der Pomodoro vorbei ist, der Gedanke aber nicht.</li><li>Das Angebot bleibt, solange der Timer auf dein Tippen wartet, oder zwei Minuten nach einem automatischen Wechsel. Zusatzzeit zählt zu den Fokusminuten, ohne den Pomodoro doppelt zu zählen.</li>',
        'ver.1.1.0': '<li><b>Überall handgezeichnete Symbole.</b> Jedes Symbol in der App, in der Tab-Leiste, bei den Timer-Knöpfen und den Vorlagen, ist von Hand mit einfachen Strichen gezeichnet. Keine Emojis, keine Icon-Schrift, kein Stock-Set. Das App-Symbol auf dem Home-Bildschirm ist eine handgezeichnete Tomaten-Uhr.</li><li><b>Neues Farbschema.</b> Tiefes Indigo als Grund mit Pink, Sonnengelb, Cyan, Limette, Türkis und Violett als Phasenfarben. Karten und Knöpfe leuchten in der Vorlagenfarbe. Der helle Modus nutzt warmes Creme mit denselben kräftigen Akzenten.</li><li><b>So funktioniert es.</b> Diese Einstellungsseite erklärt jetzt Sitzungen, Vorlagen, Schnellstart, die Timer-Knöpfe, Hinweise und das Verhalten im Hintergrund.</li><li><b>Versionsanzeige.</b> Eine dezente Versionsangabe unten im Tab Timer und diese ausführliche Beschreibung hier.</li><li><b>Phasensymbole.</b> Jede Phasenart hat ihre eigene kleine Zeichnung: Sonnenaufgang fürs Ankommen, Checkliste für die Vorbereitung, Tomate für den Pomodoro, Kaffeetasse für die Pause, Lotus für die lange Pause, Mond für den Ausklang.</li><li><b>Fünfzehn Vorlagensymbole</b> zur Auswahl: Tomate, Uhr, Zielscheibe, Buch, Laptop, Stift, Lotus, Kaffee, Mond, Flamme, Gehirn, Stern, Herz, Musik und Läufer. Alte Vorlagen behalten ihre Bedeutung; ihr Bild wird der nächstliegenden Zeichnung zugeordnet.</li>',
        'ver.1.0.0': '<li><b>Sitzungen in Phasen:</b> Ankommen, Vorbereitung, Pomodoro, Pause, lange Pause, Ausklang, in beliebiger Reihenfolge und Anzahl.</li><li><b>Vorlagen:</b> anlegen, bearbeiten, duplizieren, löschen; Name und Dauer pro Phase; umsortieren; Pomodoro-Block-Helfer; fünf mitgelieferte Vorlagen.</li><li><b>Schnellstart</b> von der Startseite, zuletzt benutzte Vorlage vorne, plus Schnell-Timer beliebiger Länge.</li><li><b>Timer-Bildschirm</b> mit Fortschrittsring, Phasenliste, Sitzungsfortschritt und Endzeit, Pause, Weiter, Zurück, +1 / −1 Minute.</li><li><b>Automatisch weiter oder auf Tippen warten</b>, global oder pro Vorlage.</li><li><b>Hinweise:</b> Töne, Vibration, Mitteilungen, Ticken in den letzten drei Sekunden; Bildschirm wach halten.</li><li><b>Verlauf</b> mit Statistiken für heute, diese Woche und gesamt.</li><li><b>Export und Import</b> von Vorlagen, Verlauf und Einstellungen als eine JSON-Datei.</li><li><b>Offline-PWA:</b> installierbar auf iPhone und Android, alle Daten auf dem Gerät, die Zeitmessung übersteht App-Neustarts.</li>'
    };

    const DICT = { de: DE };

    function t(key, vars) {
        let s = (lang !== 'en' && DICT[lang] && DICT[lang][key] !== undefined) ? DICT[lang][key] : key;
        if (vars) Object.keys(vars).forEach(k => { s = s.split('{' + k + '}').join(String(vars[k])); });
        return s;
    }

    function translate(text) {
        if (lang === 'en') return text;
        const d = DICT[lang];
        return d && d[text] !== undefined ? d[text] : text;
    }

    function setLang(l) {
        lang = DICT[l] ? l : 'en';
        document.documentElement.lang = lang;
    }

    function getLang() { return lang; }

    /* Locale for dates and numbers. */
    function locale() { return lang === 'de' ? 'de-AT' : undefined; }

    /* Speech language for the voice announcements. */
    function speechLang() { return lang === 'de' ? 'de-DE' : 'en-US'; }

    /* Swap every static string on the page. Safe to call repeatedly: the
       English original of each node is remembered the first time. */
    function apply() {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: n => {
                const p = n.parentNode;
                if (!p || p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE') return NodeFilter.FILTER_REJECT;
                if (p.closest && p.closest('svg')) return NodeFilter.FILTER_REJECT;
                return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            }
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(n => {
            if (n.__orig === undefined) n.__orig = n.nodeValue;
            const orig = n.__orig, key = orig.trim();
            const tr = translate(key);
            const val = tr === key ? orig : orig.replace(key, tr);
            if (n.nodeValue !== val) n.nodeValue = val;
        });
        ['placeholder', 'aria-label', 'title'].forEach(attr => {
            document.querySelectorAll('[' + attr + ']').forEach(el => {
                const store = '__orig_' + attr;
                if (el[store] === undefined) el[store] = el.getAttribute(attr);
                const val = translate(el[store]);
                if (el.getAttribute(attr) !== val) el.setAttribute(attr, val);
            });
        });
        document.querySelectorAll('[data-i18n-html]').forEach(el => {
            if (el.__orig === undefined) el.__orig = el.innerHTML;
            const key = el.dataset.i18nHtml;
            const tr = lang !== 'en' && DICT[lang] && DICT[lang][key];
            const val = tr || el.__orig;
            if (el.innerHTML !== val) el.innerHTML = val;
        });
    }

    return { t, translate, setLang, getLang, locale, speechLang, apply, languages: ['en', 'de'] };
})();

const t = I18N.t;
