#!/bin/sh
set -e

echo "🐍 Installing Denner CLI..."

OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

if [ "$OS" = "darwin" ]; then
  OS="macos"
fi

if [ "$ARCH" = "x86_64" ]; then
  ARCH="x64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  ARCH="arm64"
fi

BIN_NAME="denner-${OS}-${ARCH}"
URL="https://github.com/rits1019c1/denner/releases/latest/download/${BIN_NAME}"

echo "🔄 Downloading ${BIN_NAME} for ${OS} ${ARCH}..."
curl -fsSL -o /usr/local/bin/denner "$URL"
chmod +x /usr/local/bin/denner

echo ""
echo "✨ ----------------------------------------- ✨"
echo "✅ Denner CLI has been successfully installed!"
echo "✨ ----------------------------------------- ✨"
echo ""
echo "Try it out:"
echo "  $ denner run my_script.den"
echo "  $ denner update"
echo ""
