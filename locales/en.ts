export const en = {
  upload: {
    tmdbUndo: 'discard',
    mismatchTitle: '{{count}} file(s) do not fit this server',
    mismatchHintSeries: 'A series server only takes episodes (SxxEyy). Pick the movie server above.',
    mismatchHintMovies: 'A movie server only takes movies. Pick the series server above.',
    mismatchRow: 'Does not match the media type of the target server - upload blocked.',
    badgeMovie: 'Movie',
    badgeEpisode: 'Episode',
    kindMovie: 'Movie',
    kindSeries: 'Series',
    tmdbApplied: 'applied automatically',
    tmdbApply: 'apply',
    title: 'Upload to Server',
    selectRemote: 'Select Target Server',
    scanning: 'Scanning library...',
    localFile: 'Local File',
    targetPath: 'Target Path',
    status: 'Status',
    matchId: 'ID Match',
    matchNameHigh: 'High Confidence',
    matchNameLow: 'Low Confidence',
    matchNew: 'New',
    skip: 'Skip',
    overwrite: 'Overwrite',
    conflict: 'File already exists',
    skipped: 'Skipped',
    noFiles: 'No files to upload.',
    done: 'uploaded',
    errors: 'errors',
    uploading: 'Uploading...',
    providerIdPlaceholder: 'Provider-ID (optional, e.g. tmdbid-123)',
    noIdWarning: 'Without an ID, Jellyfin might mismatch the series',
    startBtn: 'Start Upload'
  },
  remotes: {
    title: 'Servers (Remotes)',
    listTitle: 'Saved Servers',
    addBtn: 'Add Remote',
    empty: 'No servers configured yet',
    scanBtn: 'Scan Library',
    cloneBtn: 'Clone remote',
    copySuffix: '{{name}} (copy)',
    cloneHint: 'Credentials were taken over from the original. Only change what differs — e.g. display name, media type and base path.',
    passwordInherited: '(Leave empty – password is taken from the original)',
    credentialsInherited: 'Password is taken from the original',
    confirmDelete: 'Are you sure you want to delete this server?',
    step1: 'Connection',
    step2: 'Select Folder',
    step3: 'Summary',
    name: 'Display Name',
    mediaType: 'Media Type',
    protocol: 'Protocol',
    host: 'Host & Port',
    username: 'Username',
    password: 'Password',
    passwordUnchanged: '(Leave empty to keep unchanged)',
    basePath: 'Base Path',
    testBtn: 'Test Connection',
    testSuccess: 'Connection successful',
    testFailed: 'Connection failed',
    useFolderBtn: 'Use this folder',
    browseHint: 'Navigate to the directory containing your files and click "Use this folder".',
    loadPath: 'Load Path',
    emptyFolder: 'Folder is empty',
    summary: 'Summary',
    type: {
      series: 'Series',
      movies: 'Movies',
      music: 'Music',
      other: 'Other'
    },
    libraryResults: 'Found {{count}} items',
    seasons: 'seasons',
    noResults: 'No items found in this directory.'
  },
  tmdb: {
    searchTitle: 'Search TMDB',
    placeholder: 'Search TMDB...',
    searching: 'Searching...',
    noResults: 'No results found.'
  },
  app: {
    title: 'File Renamer Pro',
    description: 'Drag and drop files, apply conventions, and download the result.',
    error: {
      title: 'An Error Occurred',
      zip: 'Failed to create the zip file.',
      ai: 'Failed to generate script.',
      conventions: {
        load: "Failed to load conventions. Your browser's storage might be inaccessible.",
        save: "Could not save conventions. Your browser's storage might be full."
      },
      ignoreList: {
        save: "Could not save ignore list. Your browser's storage might be full."
      }
    },
    zipping: 'Zipping...',
    downloadZip: 'Download as .zip',
    renameDirectly: 'Rename Directly (In-Place)',
    renaming: 'Renaming...',
    startOver: 'Start Over',
    scan: {
      seriesDetected: 'TV Series detected! Auto-selected "Jellyfin Series" recipe.',
      movieDetected: 'Movies detected! Auto-selected "Jellyfin Movies" recipe.',
      titleExtracted: 'Found potential title: '
    },
    directMode: {
      confirmTitle: 'Rename Files Directly',
      confirmMessage: 'Are you sure you want to rename these files directly on your hard drive? This action cannot be undone and no copies will be created.',
      confirmButton: 'Yes, Rename Now',
      cancelButton: 'Cancel',
      progressTitle: 'Renaming Files...',
      successMessage: 'Successfully renamed {{count}} files. {{skipped}} skipped.',
      errorMessage: 'Errors occurred while renaming {{count}} files.',
      close: 'Close',
      browserNotSupported: 'Only available in Chrome/Edge',
      openFolder: 'Open Folder & Rename Directly',
      undoButton: 'Undo Last Rename',
      undoProgressTitle: 'Undoing...'
    }
  },
  settings: {
    title: 'Settings',
    tmdb: {
      title: 'TMDB Integration',
      placeholder: 'TMDB API-Key (optional)',
      placeholderSet: 'API-Key is set (enter new to update)',
      hint: 'Get an API key at themoviedb.org. Required for TMDB search.'
    },
    ignore: {
      title: 'Ignore List',
      description: 'Click on suggestions to add them, or add custom rules.',
      suggestions: 'Suggestions',
      active: 'Active Rules',
      addCustom: 'Add Custom Rule',
      customPlaceholder: 'e.g. *.tmp',
      categories: {
        os: 'Operating System',
        dev: 'Development',
        misc: 'Miscellaneous'
      }
    }
  },
  common: {
    save: 'Save',
    edit: 'Edit',
    delete: 'Delete',
    done: 'Done',
    downloadZip: 'Download ZIP',
    downloadScript: 'Download Bash Script (Local)',
    next: 'Next',
    back: 'Back',
    cancel: 'Cancel',
    close: 'Close',
  },
  sidebar: {
    title: 'Renaming Conventions',
    ai: {
      title: 'Generate with AI',
      placeholder: 'e.g., make filenames lowercase and replace spaces with dashes',
      button: {
        generating: 'Generating...',
        generate: 'Generate Script'
      }
    },
    script: {
      title: 'Convention Script',
      description: 'Edit the function body below. It receives `path` (string) and `isDirectory` (boolean).',
      placeholder: `return path.toLowerCase();`
    },
    save: {
      title: 'Save Current Script',
      placeholder: 'New convention name'
    },
    templates: {
      title: 'Saved Templates',
      empty: 'No saved conventions yet.'
    },
    tmdb: {
      title: 'TMDB Integration',
      placeholder: 'TMDB API-Key (optional)',
      placeholderSet: 'API-Key is set (enter new to update)',
      hint: 'Get an API key at themoviedb.org. Required for TMDB search.'
    },
    ignore: {
      title: 'Ignore List',
      description: 'Enter filenames to ignore, one per line. Case-insensitive.'
    },
    visualBuilder: {
      trigger: 'Create Visual Recipe',
      title: 'Visual Recipe Builder',
      description: 'Drag and drop blocks to build your renaming logic.',
      availableBlocks: 'Available Blocks',
      activeRules: 'Active Rules Pipeline',
      dragHint: 'Drag & drop blocks here',
      namePlaceholder: 'Name your recipe (e.g. Clean & Lowercase)',
      save: 'Save Recipe'
    },
    providerCode: {
      title: 'Provider Code (IMDB/TMDB)',
      description: 'Optional ID for Jellyfin (e.g. tmdbid-12345 or imdbid-tt12345)',
      placeholder: 'e.g. tmdbid-12345'
    }
  },
  dropzone: {
    processing: 'Processing files...',
    processingHint: 'Please wait, this may take a moment for large folders.',
    title: 'Drag & drop files or folders here',
    subtitle: 'or click to select files'
  },
  fileTable: {
    originalPath: 'Original Path',
    newPath: 'Preview New Path',
    size: 'Size',
    collisionWarning: 'Warning: Multiple files resolve to this same path. This will cause overwrites when zipping!'
  },
  conventions: {
    webSafe: 'Web Safe (lowercase, hyphenated)',
    removeSpaces: 'Remove Spaces',
    renameSeries: 'Rename TV Series (SxxExx)',
    jellyfinMovies: 'Jellyfin Movies (TMDB/IMDB)',
    jellyfinSeries: 'Jellyfin Series (TMDB/IMDB)'
  },
  languageSwitcher: {
    de: 'DE',
    en: 'EN'
  }
};

export type Translations = typeof en;
