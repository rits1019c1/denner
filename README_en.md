# 🚀 Denner Programming Language

<div align="center">
  <img src="https://raw.githubusercontent.com/rits1019c1/denner_web/refs/heads/main/logo.png" width="120" alt="Denner Logo" onerror="this.src='https://img.icons8.com/isometric/100/gears.png'; this.style.display='none';">
  <h3>Modern, static-typed scripting language with a focus on simplicity and powerful GUI capabilities.</h3>

  [![Version](https://img.shields.io/badge/version-1.6.5-blue.svg)](package.json)
  [![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
  [![日本語](https://img.shields.io/badge/Language-日本語-red)](#-japanese-version)
</div>

---

**Denner** is a modern, statically-typed programming language with a clean syntax inspired by Swift, Python, and JavaScript. 
With its own tree-walking interpreter, you can execute code instantly without a separate compilation step.

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **🚀 Instant Startup** | Lightweight interpreter running on Node.js. Starts in milliseconds. |
| **🎨 SDL2 GUI** | Full support for native windows, physics engine, and image rendering. |
| **🌐 WebSocket & Net** | Simple `net` module for HTTP GET and building web servers. |
| **🏗️ Module System** | Namespace isolation with `import`/`export`. Supports URL imports. |
| **🛡️ Static Typing** | Powerful type inference and explicit annotations to catch bugs early. |
| **💎 Modern UI** | Beautiful Web IDE (Playground) with a sleek Glassmorphism design. |

---

## 📦 Installation

### macOS / Linux
```bash
curl -fsSL https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/install.sh | sh
```

### Windows (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/install.ps1 | iex"
```

---

## 🚀 Usage & Examples

The organized [examples](https://github.com/rits1019c1/denner_examples) repository contains many samples to help you experience the power of Denner.

### 1. Basic
- `hello_world.den`: The traditional first program.
- `loops.den`: Range-based and list iteration.
- `recursion.den`: Calculations using recursive functions.

### 2. GUI & Game
- `gui_physics.den`: Gravity and collision detection demo.
- `gui_game.den`: A simple game using SDL2.

### 3. Server (Net)
- `server_api.den`: Dynamic HTML/JSON server example.

---

## 📁 Project Structure

```text
denner/
├── src/                   # 💻 Denner Core System (TypeScript)
│   ├── compiler/          # Parser & Execution engine
│   └── resolver/          # Dependency resolution
├── bin/                   # 🛠️ Executable binaries
├── denner-vanilla/        # 🌐 Web Playground
└── tests/                 # 🧪 Internal tests (Jest)
```

---

## 🌐 Denner Web Playground

Try Denner instantly in your browser — no installation or build required.

**[🚀 Open Playground](https://rits1019c1.github.io/denner_web/)**

---

## 🔧 Troubleshooting

### Returning to the Latest Version from Older Releases
Versions older than v1.6.0 do not include the `denner install` or `denner update` commands. In such cases, you can recover or update to the latest version by re-running the installation command used during setup.

## 📜 License
MIT License. See [LICENSE](LICENSE) for details.
