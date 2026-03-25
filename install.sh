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

# Install to home directory to avoid permission issues
DENNER_BIN_DIR="$HOME/.denner/bin"
mkdir -p "$DENNER_BIN_DIR"
DEST="$DENNER_BIN_DIR/denner"

echo "🔄 Downloading ${BIN_NAME} for ${OS} ${ARCH}..."
curl -fsSL -o "$DEST" "$URL"
chmod +x "$DEST"

echo ""
echo "✨ ----------------------------------------- ✨"
echo "✅ Denner CLI has been successfully downloaded!"
echo "✨ ----------------------------------------- ✨"
echo ""

# Checking if DENNER_BIN_DIR is in PATH
if echo "$PATH" | grep -q "$DENNER_BIN_DIR"; then
    echo "✅ Denner is already in your PATH."
else
    echo "⚠️  Denner is installed to $DENNER_BIN_DIR, but this directory is not in your PATH."
    echo "   Please add the following line to your ~/.zshrc (or ~/.bash_profile):"
    echo ""
    echo "   export PATH=\"\$PATH:$DENNER_BIN_DIR\""
    echo ""
    echo "   After adding, run: source ~/.zshrc"
fi

echo ""
echo "Try it out:"
echo "  $ denner run my_script.den"
echo "  $ denner update"
echo ""
