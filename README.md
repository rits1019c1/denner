# 🚀 Denner Programming Language

<div align="center">
  <img src="https://raw.githubusercontent.com/rits1019c1/denner_web/refs/heads/main/logo.png" width="120" alt="Denner Logo" onerror="this.src='https://img.icons8.com/isometric/100/gears.png'; this.style.display='none';">
  <h3>Modern, static-typed scripting language with a focus on simplicity and powerful GUI capabilities.</h3>

  [![Version](https://img.shields.io/badge/version-1.5.0-blue.svg)](package.json)
  [![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
  [![English](https://img.shields.io/badge/Language-English-orange)](#-english-version)
</div>

---

**Denner** は、SwiftやPython、JavaScriptの影響を受けた、モダンでクリーンな構文を持つプログラミング言語です。
独自のツリーウォーキング・インタープリタにより、コンパイル不要で即座にコードを実行できます。

## ✨ 主要な機能

| 機能 | 説明 |
| :--- | :--- |
| **🚀 高速起動** | Node.js上で動作する軽量なインタープリタ。数ミリ秒で実行開始。 |
| **🎨 SDL2 GUI** | ネイティブウィンドウ、物理エンジン、画像描画をフルサポート。 |
| **🌐 WebSocket & Net** | シンプルな `net` モジュールで HTTP GET や Web サーバー構築が可能。 |
| **🏗️ モジュールシステム** | `import`/`export` による名前空間の分離。URLインポートにも対応。 |
| **🛡️ 静的型付け** | 強力な型推論と明示的な型注釈により、バグを未然に防ぎます。 |
| **💎 モダンUI** | Glassmorphism デザインを採用した美しい Web IDE (Playground) を提供。 |

---

## 📦 インストール

### macOS / Linux
```bash
curl -fsSL https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/install.sh | sh
```

### Windows (PowerShell)
```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/install.ps1 | iex"
```

---

## 🚀 使い方とサンプル

整理された `examples/` フォルダには、Dennerの魅力を体験できる多くのサンプルが含まれています。

### 1. 基礎 (Basic)
- `hello_world.den`: 伝統的な最初のプログラム
- `loops.den`: 範囲ベースやリストの反復処理
- `recursion.den`: 再帰関数による計算

### 2. GUI & Game
- `gui_physics.den`: 重力と衝突判定のデモ
- `gui_game.den`: SDL2を使用したシンプルなゲーム

### 3. サーバー (Net)
- `server_api.den`: 動的な HTML/JSON サーバー

---

## 📁 ディレクトリ構造

```text
denner/
├── examples/              # 📚 豊富なサンプルコード
│   ├── basic/             # 基礎文法（変数、ループ、再帰）
│   ├── gui/               # GUI・物理エンジンデモ
│   ├── net/               # サーバー・通信関連
│   └── advanced/          # クラス・モジュールシステム
├── src/                   # 💻 Denner コアシステム (TypeScript)
│   ├── compiler/          # 解析器・実行エンジン
│   └── resolver/          # 依存解決
├── bin/                   # 🛠️ 実行バイナリ
├── denner-vanilla/        # 🌐 Web Playground
└── tests/                 # 🧪 内部テスト (Jest)
```

---

## 🌐 Denner Web Playground

インストール不要で、ブラウザ上ですぐに Denner を試すことができます。

**[🚀 Playground を開く](https://rits1019c1.github.io/denner_web/)**

---

## 📜 ライセンス
MIT License. See [LICENSE](LICENSE) for details.
