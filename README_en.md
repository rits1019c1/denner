# 🚀 Denner Programming Language

[![日本語](https://img.shields.io/badge/Language-日本語-red)](#-japanese-version-available-here)
➡️ **[日本語で読む (Read in Japanese)](README.md)**

Denner is a modern, statically-typed programming language with a clean syntax inspired by Swift, Python, and JavaScript.
It runs on an **interpreter-based engine** — no external compilers like `g++` needed. Just install and run.

## ✨ Key Features
- **Zero-dependency Interpreter (v1.4.0):** Executes AST directly on Node.js. No external compiler required, instant startup.
- **Interactive REPL:** Run `denner` without arguments for an interactive session.
- **Object-Oriented Programming:** Full support for `class`, `constructor`, and `this`.
- **2D Game Engine:**
  - **CLI (SDL2):** Native window rendering via `@kmamal/sdl` + `@napi-rs/canvas`. No manual SDL2 installation required.
  - **Web (HTML):** Develop and run in a beautiful Monaco-powered Web Playground.
- **Module System:** Supports Deno-style URL imports and `import`/`export` for namespaces.
- **Standard Library:** `os`, `path`, `net`, `cli`, `gui`, `string` modules included
- **Smart Auto-Update:** Checks for latest version on startup
- **Modern UI:** Premium dev tools with sleek Glassmorphism design.

## 📦 Installation

### macOS / Linux
```bash
curl -fsSL https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/install.sh | sh
```

### Windows
```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/install.ps1 | iex"
```

## 💻 CLI Usage

```bash
# Start the Interactive REPL
denner

# Run a script
denner run main.den

# Run a script from GitHub
denner run https://raw.githubusercontent.com/.../main_test.den

# Update to latest version
denner update
```

## 🚀 Code Examples

### Hello World
```denner
log.print("Hello, World!")
```

### Variables & Types
```denner
// Type inference (dynamic)
name = "Denner"
count = 42

// Explicit type annotation (static)
age: num = 25
is_admin: bool = true

// Lists
items = [10, 20, 30]
```

### Functions
```denner
function add(a: num, b: num): num {
    return a + b
}

function greet(name: str): str {
    return "Hello, {name}!"
}

log.print(add(10, 20))       // 30
log.print(greet("Denner"))   // Hello, Denner!
```

### Control Flow
```denner
// if / else
if score > 80 {
    log.print("Great!")
} else {
    log.print("Keep trying")
}

// while loop
i: num = 0
while i < 5 {
    log.print(i)
    i = i + 1
}

// for loop (range)
for j in 0..10 {
    log.print(j)
}

// for loop (collection)
for item in items {
    log.print(item)
}
```

### Classes (OOP)
```denner
class Player {
    name: str
    hp: num

    function constructor(name: str, hp: num) {
        this.name = name
        this.hp = hp
    }

    function takeDamage(amount: num) {
        this.hp = this.hp - amount
        log.print("{this.name} took {amount} damage!")
    }
}

p = Player("Hero", 100)
p.takeDamage(20)    // Hero took 20 damage!
log.print(p.hp)     // 80
```

### String Methods
```denner
text = "  Hello, World!  "
log.print(string.trim(text))              // "Hello, World!"
log.print(string.upper("denner"))         // "DENNER"
log.print(string.replace("file.txt", "file", "data"))  // "data.txt"

csv = "apple,banana,cherry"
fruits = string.split(csv, ",")

log.print(string.length("hello"))         // 5
log.print(string.includes("hello", "ell")) // true
```

### Standard Library
```denner
// OS info
system = os.name()     // "darwin", "linux", "win32"

// Path joining
full = path.join("folder", "file.txt")

// HTTP GET
html = net.get("https://example.com")

// User input
name = cli.input("Your name?: ")
log.print("Hello, {name}!")
```

### 2D Game (GUI)
```denner
gui.setup(800, 600)
player = gui.rect(100, 100, 50, 50, "#ff0000")

while 1 < 2 {
    gui.clear("#000000")
    k = gui.get_last_key()
    if k == "Space" {
        log.print("FIRE!")
    }
    gui.text("Press Space to fire!", 250, 50, "#ffffff")
    gui.loop()
}
```

## Test Files

| File | Description | Command |
|------|-------------|---------|
| `hello_world.den` | Hello World | `denner run denner_tests/hello_world.den` |
| `variables.den` | Variables & Types | `denner run denner_tests/variables.den` |
| `functions.den` | Functions | `denner run denner_tests/functions.den` |
| `control_flow.den` | Control Flow | `denner run denner_tests/control_flow.den` |
| `classes.den` | Classes (OOP) | `denner run denner_tests/classes.den` |
| `stdlib.den` | Standard Library | `denner run denner_tests/stdlib.den` |

## 🌐 Denner Vanilla Playground

Try Denner in your browser — no install, no build required.

**[🚀 Try the Browser Edition](https://rits1019c1.github.io/denner_web/)**

- 📚 **Syntax Reference** (`wiki.html`) — Complete guide with runnable examples
- 📒 **Getting Started** (`about.html`) — Overview and introduction

## 📁 Project Architecture

```text
denner/
├── install.sh             # CLI Installer (Mac/Linux)
├── install.ps1            # CLI Installer (Windows PowerShell)
├── src/                   # 💻 Denner Core
│   ├── index.ts           # CLI Entrypoint (run, build-html, update)
│   ├── resolver/          # URL & local file dependency resolution
│   └── compiler/          # Compilation Engine
│       ├── lexer.ts       # Tokenizer
│       ├── parser.ts      # Recursive descent parser
│       ├── typechecker.ts # Static type checker
│       ├── interpreter.ts # Tree-walking interpreter (main execution engine)
│       └── jscodegen.ts   # JS code generator (for build-html)
├── denner_tests/          # Test scripts
├── tests/                 # 🧪 Automated tests (Jest)
└── denner-vanilla/        # 🌐 Web Playground
    ├── index.html         # Web IDE
    ├── about.html         # Getting Started guide
    └── wiki.html          # Syntax Reference
```

## 📜 License
ISC License
