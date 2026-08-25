import { Translations } from './en';

export const de: Translations = {
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
    startOver: 'Neu starten',
    scan: {
      seriesDetected: 'TV-Serien erkannt! Rezept "Jellyfin Serien" automatisch ausgewählt.',
      movieDetected: 'Filme erkannt! Rezept "Jellyfin Filme" automatisch ausgewählt.',
      titleExtracted: 'Möglicher Titel gefunden: '
    }
  },
  settings: {
    title: 'Einstellungen',
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
    done: 'Fertig',
    downloadZip: 'ZIP Herunterladen',
    downloadScript: 'Bash-Skript Herunterladen (Lokal)',
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
    size: 'Größe'
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
