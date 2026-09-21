#!/bin/zsh
# Build the habits bot into one file and run it at login via launchd.
# The bundle goes to Application Support, not ~/Desktop: a launchd job has no
# access to the Desktop folder without Full Disk Access.
set -e
cd "${0:A:h}/.."

HOME_DIR="$HOME/Library/Application Support/irtiqa-bot"
LABEL="com.eldar.irtiqa-habits-bot"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
NODE="$(command -v node)"

mkdir -p "$HOME_DIR"
npx esbuild bot/habits-bot.ts --bundle --platform=node --format=esm --target=node20 \
  --outfile="$HOME_DIR/bot.mjs" --log-level=warning

if [[ ! -f "$HOME_DIR/config.json" ]]; then
  cat > "$HOME_DIR/config.json" <<EOF
{
  "token": "",
  "vault": "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Documents/personal-obsidian",
  "lat": 42.3417,
  "lon": 69.5901,
  "maghribOffsetMin": 0,
  "morning": "08:00",
  "lunch": "13:00",
  "night": "22:00",
  "snoozeMin": 30
}
EOF
  chmod 600 "$HOME_DIR/config.json"
fi

if ! grep -q '"token": "[^"]' "$HOME_DIR/config.json"; then
  echo "Вставь токен от @BotFather в поле token: $HOME_DIR/config.json"
  echo "Потом запусти этот скрипт ещё раз."
  exit 1
fi

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>$NODE</string><string>$HOME_DIR/bot.mjs</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>30</integer>
  <key>StandardOutPath</key><string>$HOME_DIR/bot.log</string>
  <key>StandardErrorPath</key><string>$HOME_DIR/bot.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
# bootout returns before the job is gone; bootstrap too early fails with error 5
for i in {1..20}; do launchctl print "gui/$(id -u)/$LABEL" >/dev/null 2>&1 || break; sleep 0.5; done
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Бот запущен. Лог: $HOME_DIR/bot.log"
echo "Открой бота в Telegram и отправь /start — первый /start становится владельцем."
