# 🚀 Denner Programming Language & Web Playground

Denner is a modern, statically-typed programming language that features a clean syntax inspired by Swift, Python, and JavaScript. 
This repository contains the complete **Compiler Toolchain (CLI)** and the **Interactive Web Playground (Next.js)**.

## ✨ Key Features
- **Dual Transpilation Targets:** Compiles natively down to **C++** (for high-performance CLI executions) AND to **JavaScript** (for lightning-fast, browser-only evaluations).
- **URL Imports:** Native support for importing modules directly from the web (`import "https://raw.githubusercontent.com/..." as math`).
- **Dynamic String Interpolation:** Built-in template strings (`"Hello {name}"`) evaluated natively at the Parser level.
- **Glassmorphism Web IDE:** A stunning, highly customized Monaco Editor implementation natively recognizing Denner syntax, built with Next.js & TailwindCSS.

## 📁 Project Architecture

```text
denner/
├── package.json          # CLI Compiler dependencies
├── tsconfig.json         # TypeScript configuration
├── dist/                 # (Auto-generated) Compiled CLI entrypoints
├── .denner_build/        # (Auto-generated) Transpiled C++ artifacts & binaries
├── .denner_cache/        # (Auto-generated) Network module imports cache
├── tests/                # 🧪 Jest Automated Test Suite for Lexer, Parser, & C++ Generation
│
├── src/                  # 💻 Denner Compiler Core (The Toolchain)
│   ├── index.ts          # CLI Entrypoint (denner run / compile)
│   ├── resolver/         # Dependency resolution engine mapping URLs & local files
│   └── compiler/         # The Compilation Engine
│       ├── lexer.ts      # Tokenizer (Lexicographical Analysis)
│       ├── parser.ts     # AST Builder (Syntax Trees & String Interpolation)
│       ├── typechecker.ts# Static Type Resolution Engine
│       ├── codegen.ts    # [C++] Transpiler backend
│       └── jscodegen.ts  # [JavaScript] Transpiler backend (For Web-Only environments)
│
└── playground/           # 🌐 Denner Web Playground (Next.js Application)
    ├── package.json      # Frontend package configuration
    ├── public/monaco/    # Locally hosted Monaco Editor core ensuring zero network drops
    └── src/app/
        ├── globals.css      # TailwindCSS styling & Glassmorphism definitions
        │
        ├── page.tsx         # 🖥️ [C++ Backend Pipeline] Primary IDE Interface
        ├── api/run/route.ts # ⚙️ Next.js Edge proxy to securely spawn the C++ compiler natively
        │
        └── browser/         
            └── page.tsx     # ⚡️ [JS Transpiler Pipeline] Standalone, Serverless AST-to-JS IDE
```

## 🛠 Usage
### 1. Web Playground
Navigate to the `playground/` directory, install dependencies, and run the development server.
```bash
cd playground
npm install
npm run dev
```

- **C++ Backend IDE:** Visit `http://localhost:3000/`
- **JS Browser-Only IDE:** Visit `http://localhost:3000/browser`

### 3. Vanilla Playground (Easiest for GitHub Pages)
If you want to host the playground with zero configuration and minimum file count:
```bash
# Just upload the contents of denner-vanilla/ to your GitHub Pages repo
# It contains only 2 files: index.html and denner-compiler.js
```
