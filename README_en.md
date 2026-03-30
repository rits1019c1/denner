# 🚀 Denner Programming Language & Web Playground

[![日本語](https://img.shields.io/badge/Language-日本語-red)](#-japanese-version-available-here)
➡️ **[日本語で読む (Read in Japanese)](README.md)**

Denner is a modern, statically-typed programming language that features a clean syntax inspired by Swift, Python, and JavaScript. 
It features a **Triple-Transpilation Engine**, supporting high-performance **C++ (SDL2)**, **Browser-only JavaScript**, and **Console** backends!

## ✨ Key Features
- **Triple Transpilation:** Native **C++ (SDL2)** for high performance, **JavaScript** for browser, and console backends.
- **Interactive REPL (v1.2.0):** Run `denner` without arguments to start the interactive mode.
- **Object-Oriented Programming (v1.3.2):** Full support for `class`, `constructor`, and `this`.
- **2D Game Engine (Native & Web):**
  - **Native (SDL2):** Runs on C++ + SDL2. Fast and offline-capable
  - **Web (HTML):** Runs in browser. Easy to share
  - **Common APIs:** `gui.setup`, `gui.rect`, `gui.image`, `gui.text`, `gui.clear`, `gui.loop`, `gui.draw`
- **Reactive Binding:** Use `observe` keyword for automatic UI updates (e.g., `score: num observe = 0`)
- **Standalone HTML Build:** Use `build-html` command to export as single HTML file (Web only)
- **Stdlib & Interactive Input:** Cross-platform modules (`os`, `path`, `net`, `cli`, `gui`)
- **Smart Auto-Update:** Automatically checks for latest version
- **Glassmorphism Web IDE:** Beautiful Monaco Editor with syntax highlighting
- **Interactive Security:** Deno-style security model

## 📦 Installation (Standalone Executables)

You do **not** need Node.js or `npm` to run Denner! It is packaged as a static zero-dependency single executable application.
*(Note: To run Denner scripts on Desktop, your system still requires `g++` to compile the generated C++)*

### macOS / Linux
Instantly install the latest version globally using our secure one-liner:
```bash
curl -fsSL https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/install.sh | sh
```

### Windows
Run the following one-liner in PowerShell to automatically install the latest version and configure your PATH:
```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/install.ps1 | iex"
```
*(Alternatively, you can still use `install.bat` or download `denner-win-x64.exe` directly from the Releases page.)*

## 🖥️ SDL2 Installation (for GUI apps)

To run GUI programs (`gui.setup`, etc.) natively, you need the SDL2 library.

### macOS
```bash
brew install sdl2 sdl2_image sdl2_ttf
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libsdl2-dev libsdl2-image-dev libsdl2-ttf-dev g++
```

### Windows
1. Download Development Libraries from [SDL2 Official](https://github.com/libsdl-org/SDL/releases)
2. Extract to `C:\SDL2`
3. Place `include` and `lib` folders in appropriate paths

Or use vcpkg:
```powershell
vcpkg install sdl2 sdl2-image sdl2-ttf:x64-windows
```

## 💻 CLI Usage

Denner's CLI is designed to be intuitive and secure. 

```bash
# Start the Interactive Mode (REPL)
denner

# Run a script directly from GitHub
denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/main_test.den

# Compile to native executable (uses SDL2)
denner compile game.den -o game
./game

# Export to HTML for web
denner build-html game.den -o game.html
```

## Test Files

| File | Description | Command |
|------|-------------|---------|
| `hello_world.den` | Hello World | `denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/hello_world.den` |
| `variables.den` | Variables & Types | `denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/variables.den` |
| `functions.den` | Functions | `denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/functions.den` |
| `control_flow.den` | Control Flow | `denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/control_flow.den` |
| `classes.den` | Classes (OOP) | `denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/classes.den` |
| `stdlib.den` | Standard Library | `denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/stdlib.den` |
| `gui_basic.den` | GUI Basics (SDL2) | `denner compile https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/gui_basic.den -o gui && ./gui` |
| `gui_game.den` | Game Demo (SDL2) | `denner compile https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/gui_game.den -o game && ./game` |

## Feature Examples

### 2D Game (Native/SDL2)
```denner
gui.setup(800, 600)

box = gui.rect(100, 100, 50, 50, "#ff0000")

loop = true
while loop {
    gui.clear("#000000")
    gui.draw(box)
    loop = gui.loop()
}
```

### 2D Game + Physics (Web/HTML only)
```denner
box = gui.rect(100, 100, 50, 50, "#ff0000")
box.enablePhysics({ gravity: 9.8 })

box.on("collision", function(other) {
    log.print("Hit!")
})
```

### Reactivity (Web only)
```denner
score: num observe = 0
score = score + 1
```

## 📊 Backend Comparison

| Feature | C++ (SDL2) | HTML/Web |
|---------|------------|----------|
| Speed | Ultra fast | Fast |
| Offline | ✓ | ✓ |
| Sharing | Binary distribution | Single HTML file |
| Physics | Coming soon | ✓ |
| Reactive binding | Coming soon | ✓ |
| GUI rendering | `gui.draw()` | Automatic |

### 🔓 Permission Management (Deno-style)
Denner prioritizes security. If a script requires network or filesystem access, you must explicitly grant it via flags or interactive prompts:
```bash
# Run a script explicitly granting NETWORK access
denner run main.den -N

# Run a script explicitly granting ALL permissions
denner run main.den -A
```

### Smart Auto-Updater
Denner comes with a built-in smart updater:
```bash
denner update
```

## 🌐 Denner Vanilla Playground
Denner includes a beautiful, zero-build optimized Vanilla Web IDE.

**[🚀 Try the Browser Edition here](https://rits1019c1.github.io/denner_web/)**

## 📁 Project Architecture

```text
denner/
├── install.sh            # Global CLI Installer (Mac/Linux)
├── install.ps1           # Global CLI Installer (Windows PowerShell)
├── install.bat           # Global CLI Installer (Windows Legacy)
├── bin/                  # Pre-compiled standalone native executables (pkg)
├── tests/                # 🧪 Automated Test Suite
│
├── src/                  # 💻 Denner Compiler Core
│   ├── index.ts          # CLI Entrypoint
│   ├── resolver/         # Dependency resolution
│   └── compiler/        # Compilation Engine
│
└── denner-vanilla/       # 🌐 Denner Web Playground
    ├── index.html        # Web IDE
    ├── about.html        # Documentation
    ├── wiki.html         # Syntax Reference
    └── denner-compiler.js# Browser JS transpiler
```

## 📜 License
ISC License
