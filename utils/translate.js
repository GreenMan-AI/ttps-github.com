// Vienkāršs tulkošanas palīgs, kas izmanto bezmaksas MyMemory API
// (nav vajadzīga atslēga). Kvalitāte ir ierobežota īsiem/sarežģītiem
// tekstiem, bet paziņojumu tulkošanai pietiek. Ja serviss nav sasniedzams,
// atgriežam oriģinālo tekstu, lai admin panelis tomēr nesalūzt.
async function translateText(text, sourceLang, targetLang) {
  if (!text || !text.trim()) return '';
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) throw new Error('Tulkošanas serviss atbildēja ar kļūdu');
    const data = await resp.json();
    const translated = data?.responseData?.translatedText;
    if (translated && translated.trim()) return translated;
    throw new Error('Tukša tulkošanas atbilde');
  } catch (e) {
    console.error('Tulkošanas kļūda:', e.message);
    return text; // rezerves variants — labāk oriģinālais teksts nekā nekas
  }
}

module.exports = { translateText };
