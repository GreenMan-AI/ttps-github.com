const mm = require('music-metadata');

function cleanupText(s) {
  return s
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(s) {
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

// Mēģina no faila nosaukuma izgūt izpildītāju un nosaukumu. Atbalsta
// visbiežāk sastopamos rakstības veidus, ko izmanto AI mūzikas ģeneratori:
//   "Izpildītājs - Nosaukums.mp3"
//   "Izpildītājs – Nosaukums.mp3" (garā domuzīme)
//   "Nosaukums.mp3" (bez izpildītāja)
function parseFilename(originalName) {
  const noExt = originalName.replace(/\.[a-zA-Z0-9]+$/, '');
  const cleaned = cleanupText(noExt);
  const sepMatch = cleaned.split(/\s*[-–—]\s*/);
  if (sepMatch.length >= 2 && sepMatch[0] && sepMatch[1]) {
    return { artist: titleCase(sepMatch[0]), title: titleCase(sepMatch.slice(1).join(' - ')) };
  }
  return { artist: '', title: titleCase(cleaned) };
}

// Galvenā funkcija: vispirms uzticas ID3/audio metadatiem (ja AI/DAW rīks
// tos ierakstījis), tad papildina ar to, ko izdodas izgūt no faila nosaukuma.
async function detectTrackInfo(buffer, mimetype, originalName) {
  let id3Title = '';
  let id3Artist = '';
  let picture = null;
  let durationSec = 0;

  try {
    const metadata = await mm.parseBuffer(buffer, mimetype, { duration: true, skipCovers: false });
    id3Title = metadata?.common?.title || '';
    id3Artist = metadata?.common?.artist || metadata?.common?.albumartist || '';
    durationSec = Math.round(metadata?.format?.duration || 0);
    const pic = metadata?.common?.picture?.[0];
    if (pic?.data?.length) picture = Buffer.from(pic.data);
  } catch (e) {
    // Fails bez lasāmiem ID3 tagiem — nekas traģisks, izmantosim failu nosaukumu.
  }

  const fromName = parseFilename(originalName);

  return {
    title: id3Title || fromName.title || 'Nezināma dziesma',
    artist: id3Artist || fromName.artist || '',
    duration: durationSec,
    picture,
  };
}

module.exports = { detectTrackInfo };
