# 🚀 Denner Programming Language & Web Playground

[![English](https://img.shields.io/badge/Language-English-blue)](#-english-version-available-here)
➡️ **[Read in English](README_en.md)**

Dennerは、SwiftやPython、JavaScriptの影響を受けたクリーンな構文を持つ、モダンで静的型付けされたプログラミング言語です。
**デュアル トランスパイル エンジン** を搭載しており、**高性能なC++** にネイティブコンパイルすることも、**ブラウザ専用のJavaScript** 環境で安全に実行することも可能です！

## ✨ 主な機能
- **デュアル トランスパイル:** CLI用の高性能な C++、そしてブラウザ専用で超高速に動作する JavaScript の2つのバックエンドを完全にサポート。
- **充実の標準ライブラリ:** クロスプラットフォームで動作するネイティブモジュール (`os`, `path`, `net`, `cli`, `gui`) を搭載。C++のデスクトップ環境でも、VanillaなWeb環境でも全く同じように動作します！
- **URLからのインポート:** Webから直接モジュールをインポートする機能をネイティブでサポート (`import "https://raw.githubusercontent.com/..." as math`)。
- **動的な文字列補間:** パースレベルで処理される組み込みのテンプレート文字列 (`"Result: {val * 10}"`)。
- **Glassmorphism Web IDE:** Dennerの構文やスマートな自動補完（Autocompletion）をネイティブで認識し、Next.jsとTailwindCSSで構築された美しい独自Monaco Editor。
- **インタラクティブなセキュリティ確認:** Deno方式のセキュリティを採用。ネットワークにアクセスしようとするスクリプト (`net.get` など) は、ターミナル上で自動的に一時停止し、ユーザーに許可を求めます！

## 📦 インストール方法（単一実行ファイル）

Dennerを実行するのに Node.js や `npm` をインストールする必要は**ありません**！ 静的バイナリとしてパッケージ化された単一実行ファイル（Standalone Executable）として配布されています。
*(注意: デスクトップ環境でDennerスクリプトを実行するには、生成されるC++をコンパイルするための `g++` が裏側で必要になります)*

### macOS / Linux 用
ターミナルで以下のセキュアなワンライナーを1回実行するだけで、最新バージョンをグローバルにインストールできます：
```bash
curl -fsSL https://raw.githubusercontent.com/Rituto/denner/main/install.sh | sh
```

### Windows 用
セットアップ用のバッチファイル（`install.bat`）を実行するか、GitHubのReleasesページから直接 `denner-win-x64.exe` をダウンロードしてパスを通してください！

## 💻 CLIコマンドの使い方

Dennerスクリプトをネイティブ環境で実行するのは驚くほど簡単です：
```bash
# スクリプトを安全に実行する（ネットワーク・FS権限がない時はプロンプトで確認します）
denner run main.den

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
├── install.bat           # グローバルCLIインストーラー (Windows用)
├── bin/                  # プリコンパイルされた単一ネイティブ実行ファイル (pkg出力)
├── tests/                # 🧪 Lexer・Parser・C++生成の自動テスト群
│
├── src/                  # 💻 Dennerコンパイラ・コアシステム
│   ├── index.ts          # CLI エントリーポイント (run, update, compile)
│   ├── resolver/         # URL及びローカルファイルの依存関係解決エンジン
│   └── compiler/         # コンパイルエンジン本体
│       ├── lexer.ts      # トークナイザー (字句解析)
│       ├── parser.ts     # ASTビルダー (構文木構築 & 文字列補間)
│       ├── typechecker.ts# 静的型解決エンジン (Type Resolution)
│       ├── codegen.ts    # [C++] トランスパイルバックエンド (Stdlib対応)
│       └── jscodegen.ts  # [JavaScript] 非同期トランスパイルバックエンド
│
└── denner-web/           # 🌐 [Denner Web Repository](https://github.com/rits1019c1/denner_web)
    ├── index.html        # Glassmorphismが美しいWebIDE本体
    ├── wiki.html         # 公式のDenner言語リファレンス (EN/JA切替)
    └── denner-compiler.js# バンドル・統合済みのブラウザ用JSトランスパイラ
```

## 📜 ライセンス
ISC License
