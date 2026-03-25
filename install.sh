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

# Auto-add to PATH logic
SHELL_RC=""
case "$SHELL" in
  */zsh)
    SHELL_RC="$HOME/.zshrc"
    ;;
  */bash)
    if [ -f "$HOME/.bash_profile" ]; then
      SHELL_RC="$HOME/.bash_profile"
    else
      SHELL_RC="$HOME/.bashrc"
    fi
    ;;
  *)
    SHELL_RC="$HOME/.profile"
    ;;
esac

EXPORT_LINE="export PATH=\"\$PATH:$DENNER_BIN_DIR\""

if echo "$PATH" | grep -q "$DENNER_BIN_DIR"; then
    echo "✅ Denner is already in your PATH."
else
    if [ -f "$SHELL_RC" ]; then
        if grep -q "denner/bin" "$SHELL_RC"; then
            echo "✅ Path configuration already exists in $SHELL_RC."
        else
            echo "🔗 Adding Denner to PATH in $SHELL_RC..."
            echo "" >> "$SHELL_RC"
            echo "# Denner CLI" >> "$SHELL_RC"
            echo "$EXPORT_LINE" >> "$SHELL_RC"
            echo "✅ Successfully added to $SHELL_RC."
            echo "💡 Please run: source $SHELL_RC"
        fi
    else
        echo "⚠️  Could not find a shell config file (like .zshrc). Please manually add:"
        echo "   $EXPORT_LINE"
    fi
fi

echo ""
echo "Try it out:"
echo "  $ denner run my_script.den"
echo "  $ denner update"
echo ""
