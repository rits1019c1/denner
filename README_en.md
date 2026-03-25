# 🚀 Denner Programming Language & Web Playground

[![日本語](https://img.shields.io/badge/Language-日本語-red)](#-japanese-version-available-here)
➡️ **[日本語で読む (Read in Japanese)](README.md)**

Denner is a modern, statically-typed programming language that features a clean syntax inspired by Swift, Python, and JavaScript. 
It features a **Dual-Transpilation Engine**, allowing it to be compiled natively down to **High-Performance C++** or securely evaluated in **Browser-only JavaScript** environments!

## ✨ Key Features
- **Dual Transpilation Targets:** Compiles natively to C++ (for high-performance CLI executions) AND to JavaScript (for lightning-fast, browser-only evaluations).
- **Batteries-Included Standard Library:** Cross-platform native modules (`os`, `path`, `net`, `cli`, `gui`) that work beautifully in BOTH C++ Desktop and Vanilla Web interfaces!
- **URL Imports:** Native support for importing modules directly from the web (`import "https://raw.githubusercontent.com/..." as math`).
- **Dynamic String Interpolation:** Built-in template strings (`"Result: {val * 10}"`) evaluated natively at the Parser level.
- **Glassmorphism Web IDE:** A stunning, highly customized Monaco Editor implementation natively recognizing Denner syntax with smart auto-completion.
- **Interactive Security Prompts:** Deno-style security. Scripts trying to access the network (`net.get`) automatically pause and ask for user permission natively in the terminal!

## 📦 Installation (Standalone Executables)

You do **not** need Node.js or `npm` to run Denner! It is packaged as a static zero-dependency single executable application.
*(Note: To run Denner scripts on Desktop, your system still requires `g++` to compile the generated C++)*

### macOS / Linux
Instantly install the latest version globally using our secure one-liner:
```bash
curl -fsSL https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/install.sh | sh
```

### Windows
Run our setup batch file natively or download `denner-win-x64.exe` directly from the Releases page!

## 💻 CLI Usage

Running a Denner script natively is incredibly simple:
```bash
# Run a script safely. (It will prompt for permission if it uses network/fs)
denner run main.den

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
├── install.bat           # Global CLI Installer (Windows)
├── bin/                  # Pre-compiled standalone native executables (pkg)
├── tests/                # 🧪 Automated Test Suite for Lexer, Parser, & C++
│
├── src/                  # 💻 Denner Compiler Core (The Toolchain)
│   ├── index.ts          # CLI Entrypoint (denner run, update, compile)
│   ├── resolver/         # Dependency resolution engine mapping URLs & local files
│   └── compiler/         # The Compilation Engine
│       ├── lexer.ts      # Tokenizer (Lexicographical Analysis)
│       ├── parser.ts     # AST Builder (Syntax Trees & String Interpolation)
│       ├── typechecker.ts# Static Type Resolution Engine
│       ├── codegen.ts    # [C++] Transpiler backend with Stdlib mappings
│       └── jscodegen.ts  # [JavaScript] Async Transpiler backend
│
└── denner-web/           # 🌐 [Denner Web Repository](https://github.com/rits1019c1/denner_web)
    ├── index.html        # Beautiful Glassmorphism Web IDE
    ├── wiki.html         # Official Denner Syntax Reference (EN/JA)
    └── denner-compiler.js# Bundled JS transpiler
```

## 📜 License
ISC License
