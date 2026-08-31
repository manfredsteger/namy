import { AudioTags } from '../types';

export const AUDIO_EXTENSIONS = [
  '.mp3', '.m4a', '.m4b', '.aac', '.flac', '.ogg', '.oga', '.opus',
  '.wav', '.wma', '.aiff', '.aif', '.alac', '.ape', '.mpc', '.wv',
];

export function isAudioPath(path: string): boolean {
  const lower = path.toLowerCase();
  return AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext));
}

/** Raw values as they sit in the file, before any cleanup. */
export interface EmbeddedTags {
  artist?: string;
  albumArtist?: string;
  album?: string;
  title?: string;
  track?: number;
  trackTotal?: number;
  disc?: number;
  discTotal?: number;
  year?: string;
}

// ---------------------------------------------------------------------------
// Cleanup helpers
// ---------------------------------------------------------------------------

// Bracketed junk that rips (especially from YouTube) drag along. Everything that
// is NOT in here — "(Live)", "(Remix)", "(feat. X)", "(Remastered 2011)" — is part
// of the title and must survive.
const NOISE = new RegExp('^(?:' + [
  'official\\s*(?:music\\s*)?video', 'official\\s*audio', 'official\\s*(?:lyrics?|lyric)\\s*video',
  'official\\s*visualizer', 'official\\s*(?:hd\\s*)?(?:version|clip)', 'music\\s*video',
  'video\\s*oficial', 'videoclip', 'clip\\s*officiel', 'pv', 'mv', 'm/v',
  'lyrics?', 'lyrics?\\s*video', 'with\\s*lyrics', 'letra', 'sub\\s*espa[nñ]ol',
  'audio', 'visualizer', 'hd', 'hq', 'sd', 'full\\s*hd', '4k', '8k', '\\d{3,4}p',
  'explicit', 'explicit\\s*version', 'clean', 'clean\\s*version', 'dirty',
  'free\\s*download', 'download', 'out\\s*now', 'new\\s*song', 'full\\s*album',
  'topic', 'copyright[^)]*', 'no\\s*copyright', 'ncs\\s*release',
  // "128kbit_AAC", "320 kbps", "192kbps mp3"
  '\\d+\\s*kbits?[\\s_-]*\\w*', '\\d+\\s*kbps[\\s_-]*\\w*',
].join('|') + ')$', 'i');

// "www.mp3juices.cc - ", "y2mate.com - " and friends at the front of a scraped name.
const SITE_PREFIX = /^\s*(?:www\.)?[a-z0-9][a-z0-9-]*\.(?:com|net|org|cc|to|me|io|info|xyz|top|ru|biz)\s*[-–—_]+\s*/i;

/** Collapse whitespace and shave off separators that a removal left behind. */
function tidy(value: string): string {
  return (value || '')
    .replace(/[_]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–—_.·|]+|[\s\-–—_.·|]+$/g, '')
    .trim();
}

/** Drop "(Official Video)", "[320kbps]" … but keep "(Live)", "(feat. X)". */
function stripBracketNoise(value: string): string {
  let out = value;
  // Repeat: removing one group can expose the next ("(Explicit) [Official Video]").
  for (let i = 0; i < 4; i++) {
    const next = out.replace(
      /\s*[([{]([^()[\]{}]*)[)\]}]/g,
      (whole, inner: string) => (NOISE.test(inner.trim()) ? ' ' : whole),
    );
    if (next === out) break;
    out = next;
  }
  return out;
}

/** Same for unbracketed tails: "Some Song - Official Video". */
function stripTrailingNoise(value: string): string {
  let out = value;
  for (let i = 0; i < 3; i++) {
    const m = out.match(/^(.*\S)\s*[-–—|]\s*([^-–—|]+)$/);
    if (!m || !NOISE.test(m[2].trim())) break;
    out = m[1];
  }
  return out;
}

/** Full cleanup for a free-text value (title, album, …). */
export function cleanValue(value: string): string {
  if (!value) return '';
  let out = value.replace(SITE_PREFIX, '');
  out = stripBracketNoise(out);
  out = stripTrailingNoise(out);
  return tidy(out);
}

/**
 * Channel names masquerading as artists: "Bloodhound Gang - Topic",
 * "BloodhoundGangVEVO", "ArtistOfficial".
 */
export function cleanArtistName(value: string): string {
  if (!value) return '';
  let out = cleanValue(value);
  out = out.replace(/\s*[-–—]\s*Topic$/i, '');
  out = out.replace(/\s*[-–—]?\s*Official\s*(?:Artist\s*)?Channel$/i, '');
  out = out.replace(/(?:\s*[-–—]\s*)?VEVO$/i, '');
  out = out.replace(/(?:\s*[-–—]\s*)?Official$/i, '');
  return tidy(out);
}

/** Comparison key: casing, accents and punctuation must not matter. */
function key(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Split "Artist - Title" on a separator that is clearly a separator, so
 * "Spider-Man" or "Jay-Z" stay in one piece.
 */
function splitOnDash(value: string): { left: string; right: string } | null {
  const m = value.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (!m) return null;
  const left = m[1].trim();
  const right = m[2].trim();
  if (!left || !right) return null;
  return { left, right };
}

/** Leading track number: "01 - Title", "03. Title", "(4) Title". */
function splitLeadingTrack(value: string): { track?: number; rest: string } {
  const m = value.match(/^\s*[([]?(\d{1,3})[)\]]?\s*[-–—.)_]\s*(.+)$/) || value.match(/^\s*(0\d)\s+(.+)$/);
  if (!m) return { rest: value };
  const num = parseInt(m[1], 10);
  // A four-digit-ish number is a year or part of the title, not a track.
  if (!num || num > 200) return { rest: value };
  return { track: num, rest: m[2] };
}

// ---------------------------------------------------------------------------
// Candidate picking
// ---------------------------------------------------------------------------

interface Candidate { value: string; }

/**
 * Pick the winner by source priority, then return the best-*written* spelling of
 * that same name. That is how "BloodhoundGangVEVO" (artist tag, wins the vote)
 * ends up rendered as "Bloodhound Gang" (from the title prefix, same name but
 * properly spaced).
 */
function pickBest(candidates: Candidate[]): string {
  const usable = candidates.filter(c => c.value && key(c.value));
  if (usable.length === 0) return '';
  const winnerKey = key(usable[0].value);
  const sameName = usable.filter(c => key(c.value) === winnerKey);
  let best = sameName[0].value;
  for (const c of sameName) {
    const words = (s: string) => s.trim().split(/\s+/).length;
    const mixedCase = (s: string) => s !== s.toLowerCase() && s !== s.toUpperCase();
    if (words(c.value) > words(best)) best = c.value;
    else if (words(c.value) === words(best) && mixedCase(c.value) && !mixedCase(best)) best = c.value;
  }
  return best;
}

/** Two names are "the same artist" if one contains the other (Sting ⊂ Sting & The Police). */
function sameArtist(a: string, b: string): boolean {
  const ka = key(a);
  const kb = key(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const [short, long] = ka.length <= kb.length ? [ka, kb] : [kb, ka];
  return long.includes(short) && short.length / long.length >= 0.6;
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------

/**
 * Combine embedded tags, the file name and the parent folder into one clean set
 * of values. Embedded tags win, the file name fills the gaps — and where both
 * describe the same thing, the nicer spelling wins.
 */
export function deriveAudioTags(path: string, embedded: EmbeddedTags | null): AudioTags {
  const segments = path.split('/');
  const filename = segments.pop() || path;
  const folder = segments.length > 0 ? segments[segments.length - 1] : '';

  const dot = filename.lastIndexOf('.');
  const stem = dot > 0 ? filename.slice(0, dot) : filename;

  // --- from the file name -------------------------------------------------
  const fromTrack = splitLeadingTrack(cleanValue(stem));
  let nameArtist = '';
  let nameTitle = cleanValue(fromTrack.rest);
  const nameSplit = splitOnDash(nameTitle);
  if (nameSplit) {
    // "Artist - Album - Title" -> take the last part as the title.
    const inner = splitOnDash(nameSplit.right);
    nameArtist = nameSplit.left;
    nameTitle = inner ? inner.right : nameSplit.right;
  }

  // --- from the folder ----------------------------------------------------
  const grandFolder = segments.length > 1 ? segments[segments.length - 2] : '';
  let folderArtist = '';
  let folderAlbum = cleanValue(folder);
  const folderYear = (folderAlbum.match(/\((19|20)\d{2}\)/) || [])[0];
  folderAlbum = tidy(folderAlbum.replace(/\((19|20)\d{2}\)/, ''));
  const folderSplit = splitOnDash(folderAlbum);
  if (folderSplit) {
    // "Pink Floyd - The Wall"
    folderArtist = folderSplit.left;
    folderAlbum = folderSplit.right;
  } else if (grandFolder) {
    // The classic "Artist/Album/track.mp3" layout.
    folderArtist = cleanValue(grandFolder);
  }

  // --- from the embedded tags --------------------------------------------
  const tagAlbumArtist = cleanArtistName(embedded?.albumArtist || '');
  const tagArtist = cleanArtistName(embedded?.artist || '');
  const tagAlbum = cleanValue(embedded?.album || '');
  let tagTitle = cleanValue(embedded?.title || '');

  // A scraped title often repeats the artist: "Bloodhound Gang - Mope".
  let titleArtist = '';
  let folderConfirmsTitleArtist = false;
  const titleSplit = splitOnDash(tagTitle);
  if (titleSplit) {
    titleArtist = titleSplit.left;
    // If the folder names the same artist, the prefix is genuine and the artist
    // tag is just some uploader's channel ("TheTechnique") that must not win.
    folderConfirmsTitleArtist = key(titleArtist).length >= 4 &&
      (sameArtist(titleArtist, folderArtist) || key(folder).includes(key(titleArtist)));
    const knownArtist = tagAlbumArtist || tagArtist || nameArtist || folderArtist;
    // Drop the prefix only when it really is the artist — otherwise "Sunday
    // Bloody Sunday - Live" would lose its first half.
    if (!knownArtist || sameArtist(titleArtist, knownArtist) || folderConfirmsTitleArtist) {
      tagTitle = titleSplit.right;
    } else {
      titleArtist = '';
      folderConfirmsTitleArtist = false;
    }
  }

  // Priority decides WHO the artist is; the list as a whole decides HOW the name
  // is spelled (see pickBest). The track artist comes first from the track's own
  // sources - on a compilation it differs from the album artist and must not be
  // swallowed by it.
  const spellings = [{ value: titleArtist }, { value: nameArtist }, { value: folderArtist }];
  const artist = pickBest(folderConfirmsTitleArtist
    ? [{ value: titleArtist }, { value: tagArtist }, { value: nameArtist }, { value: tagAlbumArtist }, { value: folderArtist }]
    : [{ value: tagArtist }, { value: titleArtist }, { value: nameArtist }, { value: tagAlbumArtist }, { value: folderArtist }]);
  const albumArtist = tagAlbumArtist
    ? pickBest([{ value: tagAlbumArtist }, ...spellings])
    : artist;

  // "Paul Simon/50 Ways to Leave Your Lover.mp3": a single folder next to loose
  // tracks names the artist far more often than the album.
  const loneFolderIsArtist = !artist && !folderSplit && !grandFolder && !!folderAlbum;
  const finalArtist = loneFolderIsArtist ? folderAlbum : artist;
  let album = tagAlbum || (loneFolderIsArtist ? '' : folderAlbum);
  // "Bloodhound Gang Best Of" inside a folder already named after the artist
  // is really just "Best Of".
  if (album && finalArtist && !tagAlbum) {
    const stripped = album.replace(new RegExp('^' + finalArtist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[-–—:]?\\s*', 'i'), '');
    if (tidy(stripped)) album = tidy(stripped);
  }

  const title = tagTitle || nameTitle || stem;

  const track = embedded?.track || fromTrack.track;
  const embeddedYear = embedded?.year || '';
  const derivedYear = folderYear ? folderYear.replace(/[()]/g, '') : '';

  return {
    artist: finalArtist || undefined,
    albumArtist: (tagAlbumArtist ? albumArtist : finalArtist) || undefined,
    album: album || undefined,
    title: title || undefined,
    track: track || undefined,
    trackTotal: embedded?.trackTotal,
    disc: embedded?.disc,
    discTotal: embedded?.discTotal,
    // The year is only worth printing next to a real album tag. On scraped files
    // it is the upload year, which has nothing to do with the release.
    year: (embedded?.album ? embeddedYear : derivedYear) || undefined,
    albumFromTags: !!embedded?.album,
    hasTags: !!(embedded && (embedded.title || embedded.artist || embedded.album)),
  };
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/**
 * Read the tags out of an audio file. The parser is a big dependency, so it is
 * pulled in lazily — nobody renaming videos ever downloads it.
 */
export async function readEmbeddedTags(blob: Blob): Promise<EmbeddedTags | null> {
  try {
    const mm = await import('music-metadata');
    const meta = await mm.parseBlob(blob, { duration: false, skipCovers: true });
    const c = meta.common;
    const year = c.year ? String(c.year) : (c.date || '').match(/(19|20)\d{2}/)?.[0] || '';
    return {
      artist: c.artist || (c.artists && c.artists[0]) || '',
      albumArtist: c.albumartist || '',
      album: c.album || '',
      title: c.title || '',
      track: c.track?.no ?? undefined,
      trackTotal: c.track?.of ?? undefined,
      disc: c.disk?.no ?? undefined,
      discTotal: c.disk?.of ?? undefined,
      year,
    };
  } catch {
    // Unreadable or unsupported container — fall back to the file name.
    return null;
  }
}
