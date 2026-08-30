// public/js/script-detect.js
//
// Detects which writing system a piece of text (a song title or artist
// name) uses, and returns a BCP-47-ish lang code plus text direction. Used
// to set lang/dir attributes on rendered track names so browsers apply
// correct fonts, punctuation placement, and (for Arabic/Hebrew) right-to-left
// layout automatically — instead of everything being forced into Latin
// rendering rules regardless of script.

function detectScript(text) {
  if (!text) return { lang: 'en', dir: 'ltr' };
  if (/[\u0600-\u06FF]/.test(text)) return { lang: 'ar', dir: 'rtl' };
  if (/[\u0590-\u05FF]/.test(text)) return { lang: 'he', dir: 'rtl' };
  if (/[\u3040-\u30FF]/.test(text)) return { lang: 'ja', dir: 'ltr' };
  if (/[\uAC00-\uD7AF]/.test(text)) return { lang: 'ko', dir: 'ltr' };
  if (/[\u4E00-\u9FFF]/.test(text)) return { lang: 'zh', dir: 'ltr' };
  if (/[\u0400-\u04FF]/.test(text)) return { lang: 'ru', dir: 'ltr' };
  if (/[\u0370-\u03FF]/.test(text)) return { lang: 'el', dir: 'ltr' };
  if (/[āčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ]/.test(text)) return { lang: 'lv', dir: 'ltr' };
  return { lang: 'en', dir: 'ltr' };
}

// Applies the detected lang/dir to an element and returns the detected code
// (handy for showing a small language tag next to the text).
function applyScriptAttrs(el, text) {
  const { lang, dir } = detectScript(text);
  el.lang = lang;
  if (dir === 'rtl') el.dir = 'rtl'; else el.removeAttribute('dir');
  return lang;
}

window.detectScript = detectScript;
window.applyScriptAttrs = applyScriptAttrs;
