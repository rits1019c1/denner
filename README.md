# 🚀 Denner Programming Language

[![English](https://img.shields.io/badge/Language-English-blue)](#-english-version-available-here)
➡️ **[Read in English](README_en.md)**

Dennerは、SwiftやPython、JavaScriptの影響を受けたクリーンな構文を持つ、モダンで静的型付けされたプログラミング言語です。
**インタープリタベース** で動作し、`g++` などの外部コンパイラは一切不要。インストール直後にすぐ使えます。

## ✨ 主な機能
- **ゼロ依存インタープリタ (v1.4.0):** Node.js 上で AST を直接実行。外部コンパイラ不要、瞬時に起動。
- **対話式 REPL:** 引数なしで `denner` を実行すると対話式モードが起動。コードを即座に実行・検証できます。
- **オブジェクト指向:** `class`, `constructor`, `this` をフルサポート。
- **2D ゲームエンジン:**
  - **CLI (SDL2):** `@kmamal/sdl` + `@napi-rs/canvas` でネイティブウィンドウ描画。SDL2の手動インストール不要。
  - **Web (HTML):** Monaco Editor搭載の美しい Web Playground で開発・実行。
- **モジュールシステム:** Denoスタイルの URL インポート、`import`/`export` による名前空間の分離をサポート。
- **標準ライブラリ:** `os`, `path`, `net`, `cli`, `gui`, `string` モジュール搭載
- **スマート・オートアップデート:** 起動時に最新バージョンを自動チェック
- **モダンUI:** Glassmorphism デザインを採用したプレミアムな開発ツール。

## 📦 インストール方法

### macOS / Linux
```bash
curl -fsSL https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/install.sh | sh
```

### Windows
```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/install.ps1 | iex"
```

## 💻 CLI 使い方

```bash
# 対話式モード (REPL) を起動
denner

# スクリプトを実行
denner run main.den

# GitHub上のスクリプトを直接実行
denner run https://raw.githubusercontent.com/.../main_test.den

# 最新バージョンに更新
denner update
```

## 🚀 コード例

### Hello World
```denner
log.print("Hello, World!")
```

### 変数と型
```denner
// 型推論（動的）
name = "Denner"
count = 42

// 明示的な型注釈（静的）
age: num = 25
is_admin: bool = true

// リスト
items = [10, 20, 30]
```

### 関数
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

### 制御構文
```denner
// if / else
if score > 80 {
    log.print("Great!")
} else {
    log.print("Keep trying")
}

// while ループ
i: num = 0
while i < 5 {
    log.print(i)
    i = i + 1
}

// for ループ（範囲）
for j in 0..10 {
    log.print(j)
}

// for ループ（コレクション）
for item in items {
    log.print(item)
}
```

### クラス（OOP）
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

### 文字列メソッド
```denner
text = "  Hello, World!  "
log.print(string.trim(text))              // "Hello, World!"
log.print(string.upper("denner"))         // "DENNER"
log.print(string.replace("file.txt", "file", "data"))  // "data.txt"

csv = "apple,banana,cherry"
fruits = string.split(csv, ",")
log.print(fruits)                         // ["apple", "banana", "cherry"]

log.print(string.length("hello"))         // 5
log.print(string.includes("hello", "ell")) // true
```

### 標準ライブラリ
```denner
// OS情報
system = os.name()
log.print(system)              // "darwin", "linux", "win32"

// パス結合
full = path.join("folder", "file.txt")

// HTTP GET
html = net.get("https://example.com")

// ユーザー入力
name = cli.input("名前は？: ")
log.print("こんにちは、{name}!")
```

### 2D ゲーム (GUI)
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

## テストファイル一覧

| ファイル | 説明 | コマンド |
|---------|------|---------|
| `hello_world.den` | Hello World | `denner run denner_tests/hello_world.den` |
| `variables.den` | 変数と型 | `denner run denner_tests/variables.den` |
| `functions.den` | 関数定義 | `denner run denner_tests/functions.den` |
| `control_flow.den` | 制御構文 | `denner run denner_tests/control_flow.den` |
| `classes.den` | クラス(OOP) | `denner run denner_tests/classes.den` |
| `stdlib.den` | 標準ライブラリ | `denner run denner_tests/stdlib.den` |

## 🌐 Denner Vanilla Playground

ブラウザ上でDennerを試せるWeb IDEです。ビルド不要・インストール不要。

**[🚀 ブラウザ版を試す](https://rits1019c1.github.io/denner_web/)**

- 📚 **構文リファレンス** (`wiki.html`) — 全構文の解説と実行可能なコード例
- 📒 **導入ガイド** (`about.html`) — Dennerの概要と始め方

## 📁 フォルダ構成

```text
denner/
├── install.sh             # CLIインストーラー (Mac/Linux)
├── install.ps1            # CLIインストーラー (Windows PowerShell)
├── src/                   # 💻 Denner コアシステム
│   ├── index.ts           # CLI エントリーポイント (run, build-html, update)
│   ├── resolver/          # URL・ローカルファイルの依存解決
│   └── compiler/          # コンパイルエンジン
│       ├── lexer.ts       # トークナイザー
│       ├── parser.ts      # 再帰下降パーサー
│       ├── typechecker.ts # 静的型チェッカー
│       ├── interpreter.ts # ツリーウォーキング・インタープリタ（メイン実行エンジン）
│       └── jscodegen.ts   # JS コード生成器 (build-html 用)
├── denner_tests/          # テストスクリプト群
├── tests/                 # 🧪 自動テスト (Jest)
└── denner-vanilla/        # 🌐 Web Playground
    ├── index.html         # Web IDE本体
    ├── about.html         # 導入ガイド
    └── wiki.html          # 構文リファレンス
```

## 📜 ライセンス
ISC License
