# 🚀 Denner Programming Language & Web Playground

[![日本語](https://img.shields.io/badge/Language-日本語-red)](#-japanese-version-available-here)
➡️ **[日本語で読む (Read in Japanese)](README.md)**

Denner is a modern, statically-typed programming language that features a clean syntax inspired by Swift, Python, and JavaScript. 
It features a **Dual-Transpilation Engine**, allowing it to be compiled natively down to **High-Performance C++** or securely evaluated in **Browser-only JavaScript** environments!

## ✨ Key Features
- **Dual Transpilation Targets:** Compiles natively to C++ (for high-performance CLI) AND to JavaScript (for lightning-fast browser evaluations).
- **Interactive REPL (v1.2.0):** Run `denner` without arguments to start the interactive mode. Evaluate code and experiment with Denner instantly.
- **2D Game Engine (Web-only):** Built-in drawing APIs plus a powerful **Physics Engine**. Use `.enablePhysics()` and `.on('collision', ...)` to create interactive games easily!
- **Reactive Binding:** Use the `observe` keyword in variable declarations to automatically update UI values (e.g., `score: num observe = 0`).
- **Standalone HTML Build:** Auto-detects GUI usage and prompts to export as a portable, single-file HTML application for easy sharing.
- **Stdlib & Interactive Input:** Cross-platform modules (`os`, `path`, `net`, `cli`, `gui`). Supports `cli.get_key()` for real-time interaction.
- **Smart Auto-Update:** Automatically checks for the latest version on startup. Keep your environment up-to-date with `denner update`.
- **Glassmorphism Web IDE:** A stunning Monaco Editor implementation that recognizes Denner syntax with smart auto-completion.
- **Interactive Security:** Deno-style security. Scripts accessing the network (`net.get`) automatically pause and ask for user permission.

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

## 💻 CLI Usage

Denner's CLI is designed to be intuitive and secure. 

```bash
# Start the Interactive Mode (REPL)
denner

# Run a script directly from GitHub
denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/main_test.den
```

# Hello World (Classic)
`denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/hello_world.den`

# Language Feature Demo
`denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/features_demo.den`

# Network Capability Test (Requires -N flag)
`denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/system_test.den -N`

# 2D Physics & Reactivity Demo
`denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/physics_demo.den`

# Shooting Game Demo
`denner run https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/denner_tests/shooting_game.den`

# Run a local script safely
denner run main.den
```

## 🚀 Feature Code Examples

### Reactivity (Auto-UI Updates)
```denner
score: num observe = 0
// Just update the variable, and the HTML badge updates automatically!
score = score + 1
```

### Physics Engine
```denner
box = gui.rect(100, 100, 50, 50, "#ff0000")
// Apply gravity
box.enablePhysics({ gravity: 9.8 })

// Collision event listener
box.on("collision", function(other) {
    log.print("Hit the floor!")
})
```

### 🔓 Permission Management (Deno-style)
Denner prioritizes security. If a script requires network or filesystem access, you must explicitly grant it via flags or interactive prompts:
```bash
# Run a script explicitly granting NETWORK access
denner run main.den -N

# Run a script explicitly granting ALL permissions
denner run main.den -A
```

### Smart Auto-Updater
Denner comes with a built-in smart updater. It checks the GitHub Releases API and pulls down the newest executable only if you are out of date:
```bash
denner update
```

## 🌐 Denner Vanilla Playground
Denner includes a beautiful, zero-build highly optimized Vanilla Web IDE. It uses a custom asynchronous JavaScript transpiler to securely emulate Denner's `net.get`, `cli.input`, and `gui.alert` standard libraries right inside your browser!

**[🚀 Try the Browser Edition here](https://rits1019c1.github.io/denner_web/)**
*(Source code managed in [this repository](https://github.com/rits1019c1/denner_web))*

- Includes a built-in **Syntax Wiki** with English & Japanese (`wiki.html`).
- **Offline-ready** and perfect for GitHub Pages!

## 📁 Project Architecture

```text
denner/
├── install.sh            # Global CLI Installer (Mac/Linux)
├── install.ps1           # Global CLI Installer (Windows PowerShell)
├── install.bat           # Global CLI Installer (Windows Legacy)
├── bin/                  # Pre-compiled standalone native executables (pkg)
├── tests/                # 🧪 Automated Test Suite for Lexer, Parser, & C++
│
├── src/                  # 💻 Denner Compiler Core (The Toolchain)
│   ├── index.ts          # CLI Entrypoint (denner run, update, compile)
│   ├── resolver/         # Dependency resolution engine
│   └── compiler/         # The Compilation Engine
│
└── denner-vanilla/       # 🌐 Denner Web Playground
    ├── index.html        # Beautiful Glassmorphism Web IDE
    ├── about.html        # 📒 Official Introduction & Get Started Guide
    ├── wiki.html         # 📚 Syntax Reference (EN/JA Toggle)
    └── denner-compiler.js# Bundled browser JS transpiler
```

## 📜 License
ISC License
