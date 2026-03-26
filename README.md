# 🚀 Denner Programming Language & Web Playground

[![English](https://img.shields.io/badge/Language-English-blue)](#-english-version-available-here)
➡️ **[Read in English](README_en.md)**

Dennerは、SwiftやPython、JavaScriptの影響を受けたクリーンな構文を持つ、モダンで静的型付けされたプログラミング言語です。
**デュアル トランスパイル エンジン** を搭載しており、**高性能なC++** にネイティブコンパイルすることも、**ブラウザ専用のJavaScript** 環境で安全に実行することも可能です！

## ✨ 主な機能
- **デュアル トランスパイル:** CLI用の高性能な C++、そしてブラウザ専用で超高速に動作する JavaScript の2つのバックエンドを完全にサポート。
- **対話式 REPL (v1.2.0):** 引数なしで `denner` を実行すると、Node.jsのような対話式モードが起動。その場でコードを入力・実行できます。
- **2D ゲームエンジン (Web限定):** `gui.setup`, `gui.rect`, `gui.loop` といった描画APIに加え、強力な **物理エンジン** を搭載。`.enablePhysics({ gravity: 9.8 })` や `.on('collision', callback)` で簡単にアクションゲームが作れます。
- **リアクティブ・バインディング:** `observe` キーワードを変数宣言に付けるだけで、UI上の値が自動的に更新されます（例: `score: num observe = 0`）。
- **スタンドアロン HTML ビルド:** GUI機能を使用している場合、CLIが自動で検出し、ワンクリックで共有可能な単一のHTMLファイルとして書き出すことができます。
- **スマート・オートアップデート:** 起動時に最新バージョンを自動チェック。ワンコマンド (`denner update`) で常に最新環境を維持できます。
- **Glassmorphism Web IDE:** Dennerの構文やスマートな自動補完を認識し、Next.js/TailwindCSSで構築された美しい独自Monaco Editor。
- **インタラクティブなセキュリティ:** Deno方式のセキュリティを採用。`net.get` などは自動でユーザーに許可を求めます。

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

## 💻 CLI 使い方

DennerのCLIは、直感的でセキュアです。

```bash
# 対話式モード (REPL) を起動
denner

# GitHub上のスクリプトを直接実行
denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/main_test.den
```

# Hello World（基本）
denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/hello_world.den

# 基本的な言語機能のデモ
denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/features_demo.den

# ネットワーク機能のテスト（-Nフラグが必要）
denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/system_test.den -N

# 2D物理演算とリアリティのデモ
denner run https://raw.githubusercontent.com/rits1019c1/denner_tests/refs/heads/main/physics_demo.den
# ローカルファイルを安全に実行
denner run main.den
```

## 🚀 新機能のコード例

### リアクティビティ（自動UI更新）
```denner
score: num observe = 0
// score を変更するだけで、HTML上のバッジが自動で書き換わります
score = score + 1
```

### 物理エンジン
```denner
box = gui.rect(100, 100, 50, 50, "#ff0000")
// 重力を適用
box.enablePhysics({ gravity: 9.8 })

// 衝突時のイベント
box.on("collision", function(other) {
    log.print("地面に当たった！")
})
```

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
