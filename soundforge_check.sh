#!/bin/bash
# SoundForge — Pilna pārbaude + Backup v3
API="https://greenman-ai.onrender.com"
PROJECT="$HOME/Desktop/visi projekti/SoundForge"
BACKUP_DIR="$HOME/Desktop/SoundForge_Backups"
G='\033[0;32m' R='\033[0;31m' Y='\033[1;33m' C='\033[0;36m' N='\033[0m'

echo -e "\n${C}╔══════════════════════════════════════════╗${N}"
echo -e "${C}║   SoundForge — Pārbaude & Backup  v3     ║${N}"
echo -e "${C}╚══════════════════════════════════════════╝${N}\n"

echo -e "${C}▶ 1. Serveris...${N}"
HEALTH=$(curl -s --max-time 10 "$API/api/health" 2>/dev/null)
echo "$HEALTH" | grep -q '"ok":true' \
  && echo -e "  ${G}✅ Strādā${N}" \
  || echo -e "  ${R}❌ NAV pieejams! → dashboard.render.com${N}"

echo -e "${C}▶ 2. Dziesmas...${N}"
TRACKS=$(curl -s --max-time 10 "$API/api/tracks" 2>/dev/null)
if echo "$TRACKS" | grep -q '"_id"'; then
  COUNT=$(echo "$TRACKS" | grep -o '"_id"' | wc -l | tr -d ' ')
  echo -e "  ${G}✅ $COUNT dziesmas${N}"
else
  echo -e "  ${R}❌ Neielādējas!${N}"
fi

echo -e "${C}▶ 3. Reģistrācija + Login...${N}"
TU="sfchk$(date +%s)"
REG=$(curl -s --max-time 10 -X POST "$API/api/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TU\",\"password\":\"Test1234!\"}" 2>/dev/null)
if echo "$REG" | grep -q '"token"'; then
  echo -e "  ${G}✅ Reģistrācija OK${N}"
  TOK=$(echo "$REG" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  LOGIN=$(curl -s --max-time 10 -X POST "$API/api/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TU\",\"password\":\"Test1234!\"}" 2>/dev/null)
  if echo "$LOGIN" | grep -q '"token"'; then
    echo -e "  ${G}✅ Login OK${N}"
    LTOK=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  else
    echo -e "  ${R}❌ Login nestrādā!${N}"
  fi
else
  echo -e "  ${R}❌ Reģistrācija nestrādā!${N}"
fi

echo -e "${C}▶ 4. Upload limiti...${N}"
if [ -n "$LTOK" ]; then
  LIM=$(curl -s --max-time 10 "$API/api/upload/limits" \
    -H "Authorization: Bearer $LTOK" 2>/dev/null)
  if echo "$LIM" | grep -q '"remaining"'; then
    REM=$(echo "$LIM" | grep -o '"remaining":[0-9]*' | cut -d':' -f2)
    MB=$(echo "$LIM" | grep -o '"maxSizeMB":[0-9]*' | cut -d':' -f2)
    MIN=$(echo "$LIM" | grep -o '"maxDurationMin":[0-9]*' | cut -d':' -f2)
    echo -e "  ${G}✅ Limiti OK${N} — Atlikušas: $REM | Max: ${MB}MB | Max: ${MIN}min"
  else
    echo -e "  ${Y}⚠️  /api/upload/limits NAV serverī!${N}"
    echo -e "     Ieliec server_fixed.js GitHub repo un redeploy!"
  fi
else
  echo -e "  ${Y}⚠️  Izlaista${N}"
fi

echo -e "${C}▶ 5. Ticker...${N}"
TICK=$(curl -s --max-time 10 "$API/api/ticker" 2>/dev/null)
echo "$TICK" | grep -q '"text"' \
  && echo -e "  ${G}✅ Strādā${N}" \
  || echo -e "  ${R}❌ Nestrādā!${N}"

echo -e "${C}▶ 6. CORS pārbaude...${N}"
CORS=$(curl -s --max-time 10 -H "Origin: http://localhost:8081" \
  -I "$API/api/health" 2>/dev/null | grep -i "access-control-allow-origin")
if [ -n "$CORS" ]; then
  echo -e "  ${G}✅ CORS iestatīts${N} — $CORS"
else
  echo -e "  ${Y}⚠️  CORS headers nav atbildē${N}"
fi

echo -e "${C}▶ 7. Admin endpoints...${N}"
if [ -n "$LTOK" ]; then
  AT=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 \
    -X POST "$API/api/admin/ticker" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $LTOK" \
    -d '{"text":"t"}' 2>/dev/null)
  [[ "$AT" == "403" || "$AT" == "200" || "$AT" == "201" ]] \
    && echo -e "  ${G}✅ /api/admin/ticker OK${N} (HTTP $AT)" \
    || echo -e "  ${R}❌ /api/admin/ticker problēma${N} (HTTP $AT)"
fi

echo -e "\n${C}▶ 8. Projekta faili...${N}"
OK=true
for f in AppContext.tsx i18n.ts app/_layout.tsx \
          components/MainApp.tsx components/LangScreen.tsx \
          components/AuthScreen.tsx "app/(tabs)/admin.tsx" \
          "app/(tabs)/index.tsx" "app/(tabs)/explore.tsx"; do
  FP="$PROJECT/$f"
  if [ -f "$FP" ]; then
    L=$(wc -l < "$FP" | tr -d ' ')
    echo -e "  ${G}✅ $f${N} ($L rindas)"
  else
    echo -e "  ${R}❌ TRŪKST: $f${N}"; OK=false
  fi
done

echo -e "\n${C}▶ 9. Konfigurācija...${N}"
grep -q "greenman-ai.onrender.com" "$PROJECT/AppContext.tsx" 2>/dev/null \
  && echo -e "  ${G}✅ API URL pareizs${N}" \
  || echo -e "  ${R}❌ API URL nav AppContext.tsx!${N}"

# i18n pārbaude — meklē lv: un en: un ru: formātu
LV=$(grep -c "^  lv:" "$PROJECT/i18n.ts" 2>/dev/null || echo "0")
EN=$(grep -c "^  en:" "$PROJECT/i18n.ts" 2>/dev/null || echo "0")  
RU=$(grep -c "^  ru:" "$PROJECT/i18n.ts" 2>/dev/null || echo "0")
if [ "$LV" -ge 1 ] && [ "$EN" -ge 1 ] && [ "$RU" -ge 1 ]; then
  echo -e "  ${G}✅ i18n — LV/EN/RU ✓${N}"
else
  echo -e "  ${R}❌ i18n — kaut kas trūkst (LV:$LV EN:$EN RU:$RU)!${N}"
fi

echo -e "\n${C}▶ 10. Rīki...${N}"
echo -e "  Node: ${G}$(node -v 2>/dev/null)${N} | npm: ${G}$(npm -v 2>/dev/null)${N} | eas: ${G}$(eas --version 2>/dev/null | head -1)${N}"

echo -e "\n${C}▶ 11. Backup...${N}"
mkdir -p "$BACKUP_DIR"
BN="backup_$(date +%Y%m%d_%H%M%S)"
BP="$BACKUP_DIR/$BN"
mkdir -p "$BP"
for f in AppContext.tsx i18n.ts package.json app.json; do
  cp "$PROJECT/$f" "$BP/" 2>/dev/null
done
cp "$PROJECT/app/_layout.tsx"             "$BP/app_layout.tsx" 2>/dev/null
cp "$PROJECT/components/MainApp.tsx"      "$BP/" 2>/dev/null
cp "$PROJECT/components/LangScreen.tsx"   "$BP/" 2>/dev/null
cp "$PROJECT/components/AuthScreen.tsx"   "$BP/" 2>/dev/null
cp "$PROJECT/app/(tabs)/admin.tsx"        "$BP/" 2>/dev/null
cp "$PROJECT/app/(tabs)/index.tsx"        "$BP/" 2>/dev/null
cp "$PROJECT/app/(tabs)/explore.tsx"      "$BP/" 2>/dev/null
cd "$BACKUP_DIR" && zip -r "${BN}.zip" "$BN/" > /dev/null 2>&1 && rm -rf "$BP"
ls -t "$BACKUP_DIR"/*.zip 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null
BC=$(ls -1 "$BACKUP_DIR"/*.zip 2>/dev/null | wc -l | tr -d ' ')
echo -e "  ${G}✅ Backup: SoundForge_Backups/${BN}.zip${N}"
echo -e "  📦 Kopā: $BC backup(i)"

ISSUES=0
echo -e "\n${C}╔══════════════════════════════════════════╗${N}"
echo -e "${C}║              KOPSAVILKUMS                ║${N}"
echo -e "${C}╚══════════════════════════════════════════╝${N}"
echo "$HEALTH" | grep -q '"ok":true' && echo -e "  ${G}✅ Serveris OK${N}" || { echo -e "  ${R}❌ Serveris PROBLĒMA${N}"; ISSUES=$((ISSUES+1)); }
echo "$TRACKS" | grep -q '"_id"'    && echo -e "  ${G}✅ Dziesmas OK ($COUNT)${N}" || { echo -e "  ${R}❌ Dziesmas PROBLĒMA${N}"; ISSUES=$((ISSUES+1)); }
echo "$REG"    | grep -q '"token"'  && echo -e "  ${G}✅ Auth OK${N}" || { echo -e "  ${R}❌ Auth PROBLĒMA${N}"; ISSUES=$((ISSUES+1)); }
[ "$OK" = true ] && echo -e "  ${G}✅ Faili OK${N}" || { echo -e "  ${R}❌ Faili TRŪKST${N}"; ISSUES=$((ISSUES+1)); }
[ -n "$CORS" ] && echo -e "  ${G}✅ CORS OK${N}" || { echo -e "  ${Y}⚠️  CORS jāpārbauda${N}"; }
echo ""
[ $ISSUES -eq 0 ] && echo -e "  ${G}🎉 VISS KĀRTĪBĀ!${N}" || echo -e "  ${Y}⚠️  $ISSUES problēma(s)${N}"
echo -e "\n${Y}Komandas:${N}"
echo -e "  ${C}Expo:${N}    cd \"$PROJECT\" && npx expo start --clear"
echo -e "  ${C}APK:${N}     cd \"$PROJECT\" && eas build --platform android --profile preview"
echo -e "  ${C}Restore:${N} bash soundforge_restore.sh"
echo ""
