# 🚀 Denner Programming Language & Web Playground

[![English](https://img.shields.io/badge/Language-English-blue)](#-english-version-available-here)
➡️ **[Read in English](README_en.md)**

Dennerは、SwiftやPython、JavaScriptの影響を受けたクリーンな構文を持つ、モダンで静的型付けされたプログラミング言語です。
**デュアル トランスパイル エンジン** を搭載しており、**高性能なC++** にネイティブコンパイルすることも、**ブラウザ専用のJavaScript** 環境で安全に実行することも可能です！

## ✨ 主な機能
- **トリプル トランスパイル:** 高性能な **C++ (SDL2)**、ブラウザ専用の **JavaScript**、そしてコンソール用の3つのバックエンドをサポート。
- **対話式 REPL (v1.2.0):** 引数なしで `denner` を実行すると、Node.jsのような対話式モードが起動。その場でコードを入力・実行できます。
- **オブジェクト指向 (v1.3.2):** `class`, `constructor`, `this` をフルサポート。高度なゲームロジックやデータ管理を整理して記述できます。
- **2D ゲームエンジン (ネイティブ & Web):**
  - **ネイティブ (SDL2):** C++ + SDL2で動作。高速でオフライン実行可能
  - **Web (HTML):** ブラウザ上で動作。 Anyoneに共有しやすい
  - **共通API:** `gui.setup`, `gui.rect`, `gui.image`, `gui.text`, `gui.clear`, `gui.loop`, `gui.draw`
- **リアクティブ・バインディング:** `observe` キーワード就能変数が自動的に更新されます（例: `score: num observe = 0`）
- **スタンドアロン HTML ビルド:** `build-html` コマンドで単一HTMLファイルとして書き出し可能（Web版のみ）
- **標準ライブラリ & インタラクティブ入力:** 充実のモジュール (`os`, `path`, `net`, `cli`, `gui`) を搭載
- **スマート・オートアップデート:** 起動時に最新バージョンを自動チェック
- **Glassmorphism Web IDE:** 美しいMonaco Editor搭載のWeb IDE
- **インタラクティブなセキュリティ:** Deno方式のセキュリティを採用

## 📦 インストール方法（単一実行ファイル）

Dennerを実行するのに Node.js や `npm` をインストールする必要は**ありません**！ 静的バイナリとしてパッケージ化された単一実行ファイル（Standalone Executable）として配布されています。
*(注意: デスクトップ環境でDennerスクリプトを実行するには、生成されるC++をコンパイルするための `g++` が裏側で必要になります)*

### macOS / Linux 用
ターミナルで以下のセキュアなワンライナーを1回実行するだけで、最新バージョンをグローバルにインストールできます：
```bash
curl -fsSL https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/install.sh | sh
```

### Windows 用
PowerShellで以下のワンライナーを実行することで、最新バージョンを自動的にインストールし、パスを通すことができます：
```powershell
powershell -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/install.ps1 | iex"
```
*(手動でインストールしたい場合は、GitHubのReleasesページから `denner-win-x64.exe` をダウンロードしてパスを通すか、 `install.bat` を実行してください)*

## 🖥️ SDL2 インストール (GUI機能を使う場合)

GUI機能 (`gui.setup` など) を使うプログラムをネイティブ実行するには、SDL2ライブラリが必要です。

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
1. [SDL2公式](https://github.com/libsdl-org/SDL/releases) からDevelopment Librariesをダウンロード
2. 解凍して `C:\SDL2` に配置
3. `include` と `lib` フォルダを相应のパスに配置

または、vcpkgを使用:
```powershell
vcpkg install sdl2 sdl2-image sdl2-ttf:x64-windows
```

## 💻 CLI 使い方

DennerのCLIは、直感的でセキュアです。

```bash
# 対話式モード (REPL) を起動
denner

# GitHub上のスクリプトを実行 (自動判別)
denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/main_test.den

# ネイティブ実行ファイルにコンパイル (SDL2使用)
denner compile game.den -o game
./game

# Web用HTMLにエクスポート
denner build-html game.den -o game.html
```

# テストファイル一覧

| ファイル | 説明 | 実行コマンド |
|---------|------|------------|
| `hello_world.den` | Hello World | `denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/hello_world.den` |
| `variables.den` | 変数と型 | `denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/variables.den` |
| `functions.den` | 関数定義 | `denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/functions.den` |
| `control_flow.den` | 制御構文(if, while, for) | `denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/control_flow.den` |
| `classes.den` | クラス(OOP) | `denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/classes.den` |
| `stdlib.den` | 標準ライブラリ(os, path, string) | `denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/stdlib.den` |
| `gui_basic.den` | GUI基礎 (SDL2) | `denner compile https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/gui_basic.den -o gui && ./gui` |
| `gui_game.den` | ゲームデモ (SDL2) | `denner compile https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/gui_game.den -o game && ./game` |

# ローカルファイルを実行
denner run main.den
```

## 🚀 コード例

### 2D ゲーム (ネイティブ/SDL2)
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

### 2D ゲーム + 物理エンジン (Web/HTMLのみ)
```denner
box = gui.rect(100, 100, 50, 50, "#ff0000")
box.enablePhysics({ gravity: 9.8 })

box.on("collision", function(other) {
    log.print("当たった！")
})
```

### リアクティビティ (Webのみ)
```denner
score: num observe = 0
score = score + 1
```

## 📊 バックエンド比較

| 機能 | C++ (SDL2) | HTML/Web |
|------|------------|----------|
| 実行速度 | 超高速 | 高速 |
| オフライン | ○ | ○ |
| 第三人称に共有 | バイナリ配布 | HTMLファイル1つ |
| 物理エンジン | 準備中 | ○ |
| リアクティブバインディング | 準備中 | ○ |
| GUI描画 | `gui.draw()` | 自動 |

### 🔓 権限管理 (Denoスタイル)
Dennerはセキュリティを重視しています。ネットワークやファイルシステムへのアクセスが必要な場合、フラグを指定するか、実行時のプロンプトで許可を与える必要があります：
```bash
# 明示的にネットワーク (NETWORK) アクセスを許可して実行する
denner run main.den -N

# 明示的に全て (ALL) の権限を許可して実行する
denner run main.den -A
```

### スマート自動アップデーター
Dennerには賢い自動アップデート機能が組み込まれています。GitHub Releases APIからバージョンをチェックし、古い場合にのみ最新の実行ファイルをセキュアにダウンロード・上書きします：
```bash
denner update
```

## 🌐 Denner Vanilla Playground
Dennerには、手元でのビルドが一切不要な、最適化されたVanilla Web IDEが付属しています。独自の非同期JavaScriptトランスパイラを使用し、ブラウザのSandbox内で直接 Dennerの `net.get`, `cli.input`, `gui.alert` といった標準ライブラリをエミュレートできます！

**[🚀 ここからブラウザ版を試せます](https://rits1019c1.github.io/denner_web/)**
*(ソースコードは[こちらのリポジトリ](https://github.com/rits1019c1/denner_web)で管理されています)*
### 📝 文字列メソッド
Dennerは強力な文字列操作メソッドをサポートしています：

```denner
// 置換・分割
result = string.replace(text, "old", "new")    // 文字列を置換
parts = string.split(text, ",")               // カンマで分割して配列に

// 変換
upper = string.upper(text)                   // 大文字に変換
lower = string.lower(text)                   // 小文字に変換
trimmed = string.trim(text)                  // 前後の空白を削除
repeated = string.repeat(text, 3)            // 3回繰り返す

// 検索
has = string.includes(text, "hello")         // 含むかチェック
idx = string.indexof(text, "lo")             // インデックスを取得
isStart = string.startswith(text, "He")      // 先頭一致
isEnd = string.endswith(text, "lo!")          // 末尾一致

// 抽出
ch = string.charat(text, 0)                   // 1文字目を取得
sub = string.substring(text, 0, 5)            // 部分文字列
len = string.length(text)                     // 長さ
```

### 📝 例

```denner
message = "  Hello, World!  "
log.print(string.trim(message))              // "Hello, World!"

name = "denner"
log.print(string.upper(name))                 // "DENNER"

csv = "apple,banana,cherry"
fruits = string.split(csv, ",")
log.print(fruits[0])                         // "apple"

path = "file.txt"
log.print(string.replace(path, "file", "data")) // "data.txt"
```

- 日本語・英語に対応した公式の **Syntax Wiki (構文リファレンス)** が内蔵されています (`wiki.html`)。
- **完全オフライン対応** ＆ GitHub Pagesでのホスティングに最適です！

## 📁 フォルダ構成 (アーキテクチャ)

```text
denner/
├── install.sh            # グローバルCLIインストーラー (Mac/Linux用)
├── install.ps1           # グローバルCLIインストーラー (Windows用 PowerShell)
├── install.bat           # グローバルCLIインストーラー (Windows用 Legacy)
├── bin/                  # プリコンパイルされた単一ネイティブ実行ファイル (pkg出力)
├── tests/                # 🧪 Lexer・Parser・C++生成の自動テスト群
│
├── src/                  # 💻 Dennerコンパイラ・コアシステム
│   ├── index.ts          # CLI エントリーポイント (run, update, compile)
│   ├── resolver/         # URL及びローカルファイルの依存関係解決エンジン
│   └── compiler/         # コンパイルエンジン本体
│
└── denner-vanilla/       # 🌐 Denner Web Playground
    ├── index.html        # GlassmorphismなWebIDE本体
    ├── about.html        # 📒 公式イントロダクション・導入ガイド
    ├── wiki.html         # 📚 言語リファレンス (EN/JA切替)
    └── denner-compiler.js# バンドル済みのブラウザ用JSトランスパイラ
```

## 📜 ライセンス
ISC License
