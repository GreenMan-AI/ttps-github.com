#!/bin/bash
# ═══════════════════════════════════════════════════════
#  SoundForge — Atjaunošana no Backup
#  Izmantošana: bash soundforge_restore.sh
# ═══════════════════════════════════════════════════════

PROJECT="$HOME/Desktop/visi projekti/SoundForge"
BACKUP_DIR="$HOME/Desktop/SoundForge_Backups"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   SoundForge — Atjaunošana no Backup     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Parāda pieejamos backups
echo -e "${CYAN}Pieejamie backupi:${NC}"
echo ""

BACKUPS=($(ls -t "$BACKUP_DIR"/*.zip 2>/dev/null))

if [ ${#BACKUPS[@]} -eq 0 ]; then
  echo -e "  ${RED}Nav backupu! Vispirms palaid soundforge_check.sh${NC}"
  exit 1
fi

for i in "${!BACKUPS[@]}"; do
  FNAME=$(basename "${BACKUPS[$i]}" .zip)
  SIZE=$(du -h "${BACKUPS[$i]}" | cut -f1)
  echo -e "  ${GREEN}[$((i+1))]${NC} $FNAME ($SIZE)"
done

echo ""
echo -n "Izvēlies numuru (vai Enter lai atceltu): "
read CHOICE

if [ -z "$CHOICE" ]; then
  echo "Atcelts."
  exit 0
fi

SELECTED="${BACKUPS[$((CHOICE-1))]}"
if [ -z "$SELECTED" ]; then
  echo -e "${RED}Nepareizs numurs!${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}⚠️  Atjauno no: $(basename $SELECTED)${NC}"
echo -e "${YELLOW}   Tiks pārrakstīti: AppContext.tsx, i18n.ts, MainApp.tsx, LangScreen.tsx, AuthScreen.tsx${NC}"
echo -n "Vai turpināt? (j/n): "
read CONFIRM

if [ "$CONFIRM" != "j" ] && [ "$CONFIRM" != "J" ]; then
  echo "Atcelts."
  exit 0
fi

# Izpako backup
TEMP_DIR=$(mktemp -d)
unzip -q "$SELECTED" -d "$TEMP_DIR"
BACKUP_CONTENT=$(ls "$TEMP_DIR")
BACKUP_PATH="$TEMP_DIR/$BACKUP_CONTENT"

# Vispirms saglabā pašreizējo stāvokli kā "before_restore"
mkdir -p "$BACKUP_DIR"
SAFETY_NAME="before_restore_$(date +%Y%m%d_%H%M%S)"
SAFETY_PATH="$BACKUP_DIR/$SAFETY_NAME"
mkdir -p "$SAFETY_PATH"
cp "$PROJECT/AppContext.tsx"         "$SAFETY_PATH/" 2>/dev/null
cp "$PROJECT/i18n.ts"                "$SAFETY_PATH/" 2>/dev/null
cp "$PROJECT/components/MainApp.tsx" "$SAFETY_PATH/" 2>/dev/null
cp "$PROJECT/components/LangScreen.tsx" "$SAFETY_PATH/" 2>/dev/null
cp "$PROJECT/components/AuthScreen.tsx" "$SAFETY_PATH/" 2>/dev/null
cd "$BACKUP_DIR" && zip -r "${SAFETY_NAME}.zip" "$SAFETY_NAME/" > /dev/null 2>&1
rm -rf "$SAFETY_PATH"
echo -e "  ${GREEN}✅ Pašreizējais stāvoklis saglabāts kā drošības backup${NC}"

# Atjauno failus
echo ""
echo -e "${CYAN}Atjauno failus...${NC}"

restore_file() {
  local src="$1"
  local dst="$2"
  if [ -f "$src" ]; then
    cp "$src" "$dst"
    echo -e "  ${GREEN}✅ Atjaunots: $(basename $dst)${NC}"
  else
    echo -e "  ${YELLOW}⚠️  Nav backup: $(basename $dst)${NC}"
  fi
}

restore_file "$BACKUP_PATH/AppContext.tsx"    "$PROJECT/AppContext.tsx"
restore_file "$BACKUP_PATH/i18n.ts"           "$PROJECT/i18n.ts"
restore_file "$BACKUP_PATH/app_layout.tsx"    "$PROJECT/app/_layout.tsx"
restore_file "$BACKUP_PATH/MainApp.tsx"       "$PROJECT/components/MainApp.tsx"
restore_file "$BACKUP_PATH/LangScreen.tsx"    "$PROJECT/components/LangScreen.tsx"
restore_file "$BACKUP_PATH/AuthScreen.tsx"    "$PROJECT/components/AuthScreen.tsx"

# Tīra temp
rm -rf "$TEMP_DIR"

echo ""
echo -e "${GREEN}✅ Atjaunošana pabeigta!${NC}"
echo ""
echo -e "${YELLOW}Tagad restartē Expo:${NC}"
echo -e "  cd \"$PROJECT\" && npx expo start --clear"
echo ""
