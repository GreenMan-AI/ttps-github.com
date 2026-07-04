#!/bin/bash
# ══════════════════════════════════════════════════
#  PĀRBAUDES SKRIPTS — palaid šo PĒC katras failu kopēšanas,
#  PIRMS git add/commit/push, lai zinātu, vai viss ir pareizi.
#
#  Palaišana:  bash verify.sh
#  (jāpalaiž no projekta saknes mapes — tur, kur ir server.js)
# ══════════════════════════════════════════════════

PASS="✅"
FAIL="❌"
ok=1

check() {
  local desc="$1"
  local cmd="$2"
  local expected="$3"
  local actual
  actual=$(eval "$cmd" 2>/dev/null)
  if [ "$actual" = "$expected" ]; then
    echo "$PASS $desc"
  else
    echo "$FAIL $desc (sagaidīts: $expected, atrasts: $actual)"
    ok=0
  fi
}

check_min() {
  local desc="$1"
  local cmd="$2"
  local min="$3"
  local actual
  actual=$(eval "$cmd" 2>/dev/null)
  if [ "$actual" -ge "$min" ] 2>/dev/null; then
    echo "$PASS $desc"
  else
    echo "$FAIL $desc (sagaidīts vismaz: $min, atrasts: $actual)"
    ok=0
  fi
}

check_absent() {
  local desc="$1"
  local file="$2"
  if [ -f "$file" ]; then
    echo "$FAIL $desc — fails '$file' JOPROJĀM EKSISTĒ, bet tam nevajadzētu"
    ok=0
  else
    echo "$PASS $desc"
  fi
}

echo "════════════════════════════════════════"
echo " SoundPulse — failu pārbaude"
echo "════════════════════════════════════════"

if [ ! -f "server.js" ]; then
  echo "$FAIL Nevaru atrast server.js — palaid šo skriptu no projekta SAKNES mapes!"
  exit 1
fi

echo ""
echo "── Pamatfunkcijas app.js ──"
check "runFixEncoding (admin kodējuma labošana)" "grep -c 'function runFixEncoding' public/app.js" "1"
check "openBulkModal (vairāku dziesmu pievienošana)" "grep -c 'function openBulkModal' public/app.js" "1"
check "openBgModal (fona bildes logs)" "grep -c 'function openBgModal' public/app.js" "1"
check "uploadBgSlides (fona bilžu slaidrādes augšupielāde)" "grep -c 'function uploadBgSlides' public/app.js" "1"
check "pbPlayBtn (jaunais players)" "grep -c 'pbPlayBtn' public/app.js" "4"
check_min "Service Worker auto-tīrīšana" "grep -c 'serviceWorker' public/app.js" "1"
check_min "app.js kopējais garums (rindas)" "wc -l < public/app.js" "600"

echo ""
echo "── HTML struktūra ──"
check "Kešatmiņas apiešana (app.js?v=)" "grep -c 'app.js?v=' public/index.html" "1"
check "Bulk augšupielādes poga" "grep -c 'openBulkModal' public/index.html" "1"
check "Fona bildes poga" "grep -c 'openBgModal' public/index.html" "1"
check "Jauno dziesmu sadaļa" "grep -c 'new-tracks-wrap' public/index.html" "1"

echo ""
echo "── Serveris (server.js) ──"
check "Admin kodējuma labošanas endpoint" "grep -c \"'/api/admin/fix-encoding'\" server.js" "1"
check_min "Fona slaidrādes endpoints" "grep -c \"'/api/content/bg-slides\" server.js" "1"
check "Dziesmu secības maiņas endpoint" "grep -c \"'/api/tracks/reorder'\" server.js" "1"

echo ""
echo "── Vecie faili, kam VAIRS NEVAJADZĒTU būt ──"
check_absent "Vecais i18n.js izdzēsts" "i18n.js"
check_absent "Vecais sw.js izdzēsts" "sw.js"
check_absent "Vecais App.tsx izdzēsts" "App.tsx"

echo ""
echo "── Sintakses pārbaude (vajag node) ──"
if command -v node >/dev/null 2>&1; then
  if node --check server.js 2>/dev/null; then
    echo "$PASS server.js sintakse pareiza"
  else
    echo "$FAIL server.js SATUR SINTAKSES KĻŪDU"
    ok=0
  fi
  if node --check public/app.js 2>/dev/null; then
    echo "$PASS app.js sintakse pareiza"
  else
    echo "$FAIL app.js SATUR SINTAKSES KĻŪDU"
    ok=0
  fi
else
  echo "⚠️  node nav atrasts, sintakse nav pārbaudīta"
fi

echo ""
echo "════════════════════════════════════════"
if [ "$ok" = "1" ]; then
  echo "$PASS VISS KĀRTĪBĀ — droši vari 'git add -A && git commit && git push'"
else
  echo "$FAIL KAUT KAS TRŪKST — atkārto zip izpakošanu un kopēšanu PIRMS commit!"
fi
echo "════════════════════════════════════════"
