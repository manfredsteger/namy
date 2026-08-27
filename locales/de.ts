import { Translations } from './en';

export const de: Translations = {
  upload: {
    title: 'Zum Server hochladen',
    selectRemote: 'Ziel-Server auswählen',
    scanning: 'Bibliothek wird gescannt...',
    localFile: 'Lokale Datei',
    targetPath: 'Zielpfad',
    status: 'Status',
    matchId: 'ID-Match',
    matchNameHigh: 'Sicherer Match',
    matchNameLow: 'Unsicherer Match',
    matchNew: 'Neu',
    skip: 'Überspringen',
    overwrite: 'Überschreiben',
    conflict: 'Datei existiert bereits',
    skipped: 'Übersprungen',
    noFiles: 'Keine Dateien zum Hochladen vorhanden.',
    done: 'hochgeladen',
    errors: 'Fehler',
    uploading: 'Lade hoch...',
    providerIdPlaceholder: 'Provider-ID (optional, z.B. tmdbid-123)',
    noIdWarning: 'Ohne ID kann Jellyfin die Serie falsch zuordnen',
    startBtn: 'Upload starten'
  },
  remotes: {
    title: 'Server (Remotes)',
    listTitle: 'Gespeicherte Server',
    addBtn: 'Remote hinzufügen',
    empty: 'Noch keine Server konfiguriert',
    scanBtn: 'Bibliothek scannen',
    confirmDelete: 'Möchten Sie diesen Server wirklich löschen?',
    step1: 'Verbindung',
    step2: 'Ordner wählen',
    step3: 'Zusammenfassung',
    name: 'Anzeigename',
    mediaType: 'Medientyp',
    protocol: 'Protokoll',
    host: 'Host & Port',
    username: 'Benutzername',
    password: 'Password',
    passwordUnchanged: '(Unverändert lassen, um beizubehalten)',
    basePath: 'Basis-Pfad',
    testBtn: 'Verbindung testen',
    testSuccess: 'Verbindung erfolgreich',
    testFailed: 'Verbindung fehlgeschlagen',
    useFolderBtn: 'Diesen Ordner verwenden',
    browseHint: 'Navigieren Sie zum Verzeichnis, das Ihre Dateien enthält, und klicken Sie auf "Diesen Ordner verwenden".',
    loadPath: 'Pfad laden',
    emptyFolder: 'Ordner ist leer',
    summary: 'Zusammenfassung',
    type: {
      series: 'Serien',
      movies: 'Filme',
      music: 'Musik',
      other: 'Sonstiges'
    },
    libraryResults: '{{count}} Einträge gefunden',
    seasons: 'Staffeln',
    noResults: 'Keine Elemente in diesem Verzeichnis gefunden.'
  },
  tmdb: {
    searchTitle: 'TMDB durchsuchen',
    placeholder: 'TMDB durchsuchen...',
    searching: 'Suche...',
    noResults: 'Keine Ergebnisse gefunden.'
  },
  app: {
    title: 'Datei-Umbenenner Pro',
    description: 'Dateien per Drag & Drop umbenennen, Konventionen anwenden und das Ergebnis herunterladen.',
    error: {
      title: 'Ein Fehler ist aufgetreten',
      zip: 'Die ZIP-Datei konnte nicht erstellt werden.',
      ai: 'Skript konnte nicht generiert werden.',
       conventions: {
        load: "Konventionen konnten nicht geladen werden. Der Speicher Ihres Browsers ist möglicherweise nicht zugänglich.",
        save: "Konventionen konnten nicht gespeichert werden. Der Speicher Ihres Browsers ist möglicherweise voll."
      },
      ignoreList: {
        save: "Ignorier-Liste konnte nicht gespeichert werden. Der Speicher Ihres Browsers ist möglicherweise voll."
      }
    },
    zipping: 'Zippe...',
    downloadZip: 'Als .zip herunterladen',
    renameDirectly: 'Jetzt direkt umbenennen',
    renaming: 'Benenne um...',
    startOver: 'Neu starten',
    scan: {
      seriesDetected: 'TV-Serien erkannt! Rezept "Jellyfin Serien" automatisch ausgewählt.',
      movieDetected: 'Filme erkannt! Rezept "Jellyfin Filme" automatisch ausgewählt.',
      titleExtracted: 'Möglicher Titel gefunden: '
    },
    directMode: {
      confirmTitle: 'Dateien direkt umbenennen',
      confirmMessage: 'Sind Sie sicher, dass Sie diese Dateien direkt auf Ihrer Festplatte umbenennen möchten? Dies kann nicht rückgängig gemacht werden und es werden keine Kopien erstellt.',
      confirmButton: 'Ja, jetzt umbenennen',
      cancelButton: 'Abbrechen',
      progressTitle: 'Dateien werden umbenannt...',
      successMessage: 'Erfolgreich {{count}} Dateien umbenannt. {{skipped}} übersprungen.',
      errorMessage: 'Beim Umbenennen von {{count}} Dateien sind Fehler aufgetreten.',
      close: 'Schließen',
      browserNotSupported: 'Nur in Chrome/Edge verfügbar',
      openFolder: 'Ordner öffnen – direkt umbenennen',
      undoButton: 'Letzte Umbenennung rückgängig machen',
      undoProgressTitle: 'Mache rückgängig...'
    }
  },
  settings: {
    title: 'Einstellungen',
    tmdb: {
      title: 'TMDB Integration',
      placeholder: 'TMDB API-Key (optional)',
      placeholderSet: 'API-Key ist gesetzt (neuen eingeben zum Ändern)',
      hint: 'Holen Sie sich einen API-Key auf themoviedb.org. Erforderlich für die TMDB-Suche.'
    },
    ignore: {
      title: 'Ignorier-Liste',
      description: 'Klicken Sie auf Vorschläge, um sie hinzuzufügen, oder fügen Sie eigene Regeln hinzu.',
      suggestions: 'Vorschläge',
      active: 'Aktive Regeln',
      addCustom: 'Eigene Regel hinzufügen',
      customPlaceholder: 'z.B. *.tmp',
      categories: {
        os: 'Betriebssystem',
        dev: 'Entwicklung',
        misc: 'Sonstiges'
      }
    }
  },
  common: {
    save: 'Speichern',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    done: 'Fertig',
    downloadZip: 'ZIP Herunterladen',
    downloadScript: 'Bash-Skript Herunterladen (Lokal)',
    next: 'Weiter',
    back: 'Zurück',
    cancel: 'Abbrechen',
    close: 'Schließen',
  },
  sidebar: {
    title: 'Umbenennungs-Rezepte',
    ai: {
      title: 'Mit KI generieren',
      placeholder: 'z.B. Dateinamen in Kleinbuchstaben und Leerzeichen durch Bindestriche ersetzen',
      button: {
        generating: 'Generiere...',
        generate: 'Skript generieren'
      }
    },
    script: {
      title: 'Rezept-Skript',
      description: 'Bearbeiten Sie den Funktionsrumpf unten. Er erhält `path` (String) und `isDirectory` (Boolean).',
      placeholder: `return path.toLowerCase();`
    },
    save: {
      title: 'Aktuelles Skript als Rezept speichern',
      placeholder: 'Name des neuen Rezepts'
    },
    templates: {
      title: 'Gespeicherte Rezepte',
      empty: 'Noch keine Rezepte gespeichert.'
    },
    tmdb: {
      title: 'TMDB Integration',
      placeholder: 'TMDB API-Key (optional)',
      placeholderSet: 'API-Key ist gesetzt (neuen eingeben zum Ändern)',
      hint: 'Holen Sie sich einen API-Key auf themoviedb.org. Erforderlich für die TMDB-Suche.'
    },
    ignore: {
      title: 'Ignorier-Liste',
      description: 'Dateinamen, die ignoriert werden sollen, zeilenweise eingeben. Groß-/Kleinschreibung wird ignoriert.'
    },
    visualBuilder: {
      trigger: 'Visuelles Rezept erstellen',
      title: 'Visueller Rezept-Baukasten',
      description: 'Ziehen Sie die Bausteine, um Ihre Umbenennungslogik aufzubauen.',
      availableBlocks: 'Verfügbare Bausteine',
      activeRules: 'Aktive Regel-Pipeline',
      dragHint: 'Bausteine hierher ziehen',
      namePlaceholder: 'Name des Rezepts (z.B. Aufräumen & Kleinbuchstaben)',
      save: 'Rezept speichern'
    },
    providerCode: {
      title: 'Provider-Code (IMDB/TMDB)',
      description: 'Optionale ID für Jellyfin (z.B. tmdbid-12345 oder imdbid-tt12345)',
      placeholder: 'z.B. tmdbid-12345'
    }
  },
  dropzone: {
    processing: 'Verarbeite Dateien...',
    processingHint: 'Bitte warten, bei großen Ordnern kann dies einen Moment dauern.',
    title: 'Dateien oder Ordner hierher ziehen',
    subtitle: 'oder klicken, um Dateien auszuwählen'
  },
  fileTable: {
    originalPath: 'Originalpfad',
    newPath: 'Vorschau neuer Pfad',
    size: 'Größe',
    collisionWarning: 'Warnung: Mehrere Dateien haben denselben neuen Pfad. Dies führt beim Zippen zum Überschreiben!'
  },
  conventions: {
    webSafe: 'Web-sicher (Kleinbuchstaben, Bindestriche)',
    removeSpaces: 'Leerzeichen entfernen',
    renameSeries: 'Serien umbenennen (SxxExx)',
    jellyfinMovies: 'Jellyfin Filme (TMDB/IMDB)',
    jellyfinSeries: 'Jellyfin Serien (TMDB/IMDB)'
  },
  languageSwitcher: {
    de: 'DE',
    en: 'EN'
  }
};
