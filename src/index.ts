#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import * as readLine from 'readline';
import { Resolver } from './resolver';
import { Lexer } from './compiler/lexer';
import { Parser } from './compiler/parser';
import { TypeChecker } from './compiler/typechecker';
import { CodeGenerator } from './compiler/codegen';
import { JSCodeGenerator } from './compiler/jscodegen';
import * as AST from './compiler/ast';

const DENNER_VERSION = '1.3.2';

function promptUser(query: string): Promise<boolean> {
    const rl = readLine.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans.toLowerCase() === 'y' || ans.toLowerCase() === 'yes');
    }));
}

function printHelp() {
    console.log('');
    console.log('  \x1b[1m\x1b[35mDenner\x1b[0m - The Multi-Backend Programming Language');
    console.log(`  \x1b[2mv${DENNER_VERSION}\x1b[0m`);
    console.log('');
    console.log('  \x1b[1mUSAGE\x1b[0m');
    console.log('    $ denner                       Start interactive REPL');
    console.log('    $ denner run <file|url>         Transpile and run a script');
    console.log('    $ denner compile <file>         Compile to a native binary');
    console.log('    $ denner build-html <file>      Export to a standalone HTML game');
    console.log('    $ denner update                 Update to the latest version');
    console.log('    $ denner clean                  Manually clean the build directory');
    console.log('');
    console.log('  \x1b[1mOPTIONS\x1b[0m');
    console.log('    -A, --allow-all                 Allow all permissions');
    console.log('    -N, --allow-net                 Allow network access');
    console.log('    -F, --allow-fs                  Allow file system access');
    console.log('    -o, --output <path>             Specify output path for build-html');
    console.log('    -d, --debug                     Enable debug console in build-html');
    console.log('    -v, --version                   Show version');
    console.log('    -h, --help                      Show help message');
    console.log('');
}

function cleanOldBuilds(buildDir: string) {
    if (!fs.existsSync(buildDir)) return;
    const now = Date.now();
    const files = fs.readdirSync(buildDir);
    let count = 0;
    for (const file of files) {
        const filePath = path.join(buildDir, file);
        try {
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > 24 * 60 * 60 * 1000) {
                if (stats.isDirectory()) {
                    fs.rmSync(filePath, { recursive: true });
                } else {
                    fs.unlinkSync(filePath);
                }
                count++;
            }
        } catch (e) {}
    }
    if (count > 0) {
        console.log(`\x1b[2m🧹 Automatically cleaned up ${count} old build files.\x1b[0m`);
    }
}

function openFile(filePath: string) {
    const isWin = process.platform === "win32";
    const isMac = process.platform === "darwin";
    const opener = isMac ? "open" : isWin ? "start" : "xdg-open";
    try {
        spawnSync(opener, [filePath], { stdio: 'ignore', shell: isWin });
    } catch (e) {}
}

async function checkForUpdateSilently(): Promise<void> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(
            "https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/package.json",
            { signal: controller.signal }
        );
        clearTimeout(timeout);
        if (!response.ok) return;
        const remotePkg = await response.json();
        const remoteVersion = remotePkg.version;
        if (DENNER_VERSION !== remoteVersion) {
            console.log(`\n  \x1b[33m⚡ Update available: v${DENNER_VERSION} → v${remoteVersion}\x1b[0m`);
            console.log(`  \x1b[2mRun \x1b[0m\x1b[1mdenner update\x1b[0m\x1b[2m to upgrade.\x1b[0m\n`);
        }
    } catch {
    }
}

async function startRepl(): Promise<void> {
    console.log(`\x1b[1m\x1b[35mDenner\x1b[0m v${DENNER_VERSION} — Interactive Mode`);
    console.log('\x1b[2mType Denner code to evaluate. Type .exit to quit.\x1b[0m');
    console.log('');

    const rl = readLine.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '\x1b[35mdenner>\x1b[0m ',
    });

    const persistentHistory: AST.Statement[] = [];

    rl.prompt();

    rl.on('line', (line: string) => {
        const input = line.trim();

        if (input === '.exit' || input === 'exit') {
            console.log('\x1b[2mGoodbye! 👋\x1b[0m');
            process.exit(0);
        }

        if (input === '.help') {
            console.log('  .exit     Exit the REPL');
            console.log('  .help     Show this help');
            console.log('  .clear    Clear the screen');
            rl.prompt();
            return;
        }

        if (input === '.clear') {
            console.clear();
            rl.prompt();
            return;
        }

        if (!input) {
            rl.prompt();
            return;
        }

        try {
            const tokens = new Lexer(input).tokenize();
            const parser = new Parser(tokens);
            const currentAST = parser.parse();

            const combinedProgram: AST.Program = {
                type: 'Program',
                line: 1,
                body: [...persistentHistory, ...currentAST.body]
            };

            const typechecker = new TypeChecker(combinedProgram);
            typechecker.check();

            const codegen = new CodeGenerator(combinedProgram);
            const cppSource = codegen.generate();

            const buildDir = path.join(process.cwd(), '.denner_build');
            if (!fs.existsSync(buildDir)) {
                fs.mkdirSync(buildDir);
            }

            const cppFile = path.join(buildDir, 'repl.cpp');
            const binFile = path.join(buildDir, 'repl');

            fs.writeFileSync(cppFile, cppSource);

            const compileResult = spawnSync('g++', [cppFile, '-o', binFile, '-std=c++14'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            if (compileResult.status !== 0) {
                const stderr = compileResult.stderr?.toString() || '';
                console.log(`\x1b[31mCompilation Error\x1b[0m`);
                if (stderr) {
                    const lines = stderr.split('\n').filter(l => l.includes('error:'));
                    if (lines.length > 0) {
                        console.log(`  ${lines[0].split('error:')[1]?.trim() || stderr.split('\n')[0]}`);
                    }
                }
            } else {
                const runResult = spawnSync(binFile, { stdio: 'inherit' });
                
                if (runResult.status === 0) {
                    for (const stmt of currentAST.body) {
                        if (stmt.type === 'VariableDeclaration' || stmt.type === 'FunctionDeclaration') {
                            persistentHistory.push(stmt);
                        } else if (stmt.type === 'ExpressionStatement') {
                            const expr = (stmt as AST.ExpressionStatement).expression;
                            if (expr.type === 'AssignmentExpression') {
                                persistentHistory.push(stmt);
                            }
                        }
                    }
                }
            }
        } catch (err: any) {
            console.log(`\x1b[31mError:\x1b[0m ${err.message}`);
        }

        rl.prompt();
    });

    rl.on('close', () => {
        console.log('\n\x1b[2mGoodbye! 👋\x1b[0m');
        process.exit(0);
    });
}

function detectGuiUsage(node: any): boolean {
    if (!node) return false;
    if (Array.isArray(node)) {
        return node.some(n => detectGuiUsage(n));
    }
    if (typeof node === 'object') {
        if (node.type === 'MemberExpression' && node.object?.type === 'Identifier' && node.object.name === 'gui') {
            const complexGui = ['setup', 'rect', 'image', 'loop'];
            if (complexGui.includes(node.property?.name)) return true;
        }
        return Object.values(node).some(v => detectGuiUsage(v));
    }
    return false;
}

function generateHtml(jsCode: string, title: string, showDebug: boolean): string {
    // Scan observed vars from jsCode
    const observedMatches = jsCode.match(/denner_state\.([a-zA-Z_]\w*)\s*=/g) || [];
    const observedNames = [...new Set(observedMatches.map(m => m.split('.')[1].split('=')[0].trim()))];
    const badgesHtml = observedNames.map(name =>
        `<div class="px-2 py-1 bg-white/10 rounded-md text-[10px] font-mono"><span class="text-slate-400">${name}:</span> <span data-denner-bind="${name}">0</span></div>`
    ).join('');

    // Safely encode the jsCode for embedding inside a JS string
    const encodedCode = JSON.stringify(jsCode);

    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Denner Game</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono&family=Outfit:wght@400;700&display=swap');
        body { font-family: 'Outfit', sans-serif; background-color: #050505; color: #fff; overflow: hidden; }
        .glass { background: rgba(30,30,40,0.6); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); }
        #console { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #10b981; }
    </style>
</head>
<body class="h-screen flex flex-col items-center justify-center p-4">
    <div class="w-full ${showDebug ? 'max-w-5xl' : 'max-w-3xl'} flex flex-col gap-4 h-full">
        <!-- Header -->
        <div class="glass p-4 rounded-2xl flex items-center justify-between shadow-xl flex-wrap gap-2">
            <h1 class="text-xl font-bold bg-gradient-to-r from-pink-400 to-indigo-400 bg-clip-text text-transparent">${title}</h1>
            <div class="flex gap-2 items-center flex-wrap" id="state-badges">
                ${badgesHtml}
                <div class="text-xs text-slate-500 font-mono tracking-widest uppercase">Powered by Denner Engine</div>
            </div>
        </div>

        <!-- Desktop Area -->
        <div class="flex-1 flex gap-4 overflow-hidden">
            <!-- Canvas -->
            <div class="flex-1 glass rounded-2xl p-2 flex items-center justify-center bg-black overflow-hidden">
                <canvas id="denner-canvas" class="max-w-full max-h-full"></canvas>
            </div>
            ${showDebug ? `
            <!-- Side Console -->
            <div class="w-80 glass rounded-2xl flex flex-col overflow-hidden">
                <div class="bg-white/5 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-white/5">Console</div>
                <div id="console" class="flex-1 p-4 overflow-auto whitespace-pre-wrap leading-relaxed"></div>
            </div>
            ` : ''}
        </div>
    </div>

    <script>
        const outputDiv = document.getElementById('console');
        const canvas = document.getElementById('denner-canvas');
        // ctx is declared in outer scope so gui.setup can assign it
        let ctx = null;
        let lastKey = "";

        const denner_system_print = (val) => {
            const str = (val === undefined ? "" : val.toString());
            if (outputDiv) {
                outputDiv.innerText += str + "\\n";
                outputDiv.scrollTop = outputDiv.scrollHeight;
            } else {
                console.log(str);
            }
        };

        // --- Physics Engine ---
        const physicsObjects = [];

        class DennerObject {
            constructor(type, x, y, w, h, extra) {
                this.type = type;
                this.x = x; this.y = y; this.w = w; this.h = h;
                this.vx = 0; this.vy = 0;
                this.physicsEnabled = false;
                this.gravity = 0;
                this.color = extra.color || "#fff";
                this.img = extra.img || null;
                this.onCollision = null;
                physicsObjects.push(this);
            }
            enablePhysics(config) {
                config = config || {};
                this.physicsEnabled = true;
                this.gravity = (typeof config.gravity === 'number') ? config.gravity : 9.8;
                return this;
            }
            on(event, cb) {
                if (event === 'collision') this.onCollision = cb;
                return this;
            }
            update() {
                if (!this.physicsEnabled) return;
                this.vy += this.gravity * 0.016; // 60fps delta
                this.x += this.vx;
                this.y += this.vy;
                if (canvas && this.y + this.h > canvas.height) {
                    this.y = canvas.height - this.h;
                    this.vy *= -0.6;
                    if (Math.abs(this.vy) < 0.5) this.vy = 0;
                    if (this.onCollision) this.onCollision({ target: "floor" });
                }
            }
            draw() {
                if (!ctx) return;
                if (this.type === 'rect') {
                    ctx.fillStyle = this.color;
                    ctx.fillRect(this.x, this.y, this.w, this.h);
                } else if (this.type === 'image' && this.img && this.img.complete) {
                    ctx.drawImage(this.img, this.x, this.y, this.w, this.h);
                }
            }
        }

        // --- Reactivity ---
        const denner_state = new Proxy({}, {
            set(target, prop, value) {
                target[prop] = value;
                document.querySelectorAll('[data-denner-bind="' + prop + '"]').forEach(el => {
                    el.textContent = value;
                });
                return true;
            },
            get(target, prop) {
                return target[prop];
            }
        });

        // Key handling
        window.addEventListener('keydown', (e) => {
            const map = { "ArrowUp": "Up", "ArrowDown": "Down", "ArrowLeft": "Left", "ArrowRight": "Right", " ": "Space" };
            lastKey = map[e.key] || e.key;
        });
        window.addEventListener('keyup', () => { lastKey = ""; });

        const denner = {
            os: { name: () => "web", env: () => "" },
            path: { join: (a, b) => a + "/" + b },
            net: { get: async (url) => { const r = await fetch(url); return await r.text(); } },
            cli: {
                input: async (txt) => prompt(txt) || "",
                get_key: async () => new Promise(resolve => {
                    const check = () => {
                        if (lastKey) { const k = lastKey; lastKey = ""; resolve(k); }
                        else requestAnimationFrame(check);
                    };
                    check();
                })
            },
            gui: {
                setup: (w, h) => {
                    canvas.width = w;
                    canvas.height = h;
                    ctx = canvas.getContext('2d');
                },
                clear: (c) => { if (!ctx) return; ctx.fillStyle = c; ctx.fillRect(0, 0, canvas.width, canvas.height); },
                rect: (x, y, w, h, c) => new DennerObject('rect', x, y, w, h, { color: c }),
                image: (url, x, y, w, h) => {
                    const img = new Image();
                    img.src = url;
                    return new DennerObject('image', x, y, w, h, { img });
                },
                text: (t, x, y, c) => {
                    if (!ctx) return;
                    ctx.fillStyle = c;
                    ctx.font = "18px 'JetBrains Mono', monospace";
                    ctx.fillText(t, x, y);
                },
                        loop: () => new Promise(r => {
                            // Apply key-based movement to the first rect-type object (treated as the player)
                            const player = physicsObjects.find(o => o.type === 'rect' && o.gravity === 0);
                            if (player) {
                                if (lastKey === 'Left') player.vx = -6;
                                else if (lastKey === 'Right') player.vx = 6;
                                else player.vx = 0;
                                // Clamp player to canvas bounds
                                if (canvas) {
                                    if (player.x < 0) player.x = 0;
                                    if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
                                }
                            }
                            physicsObjects.forEach(o => o.update());
                            physicsObjects.forEach(o => o.draw());
                            requestAnimationFrame(r);
                        }),
                        get_last_key: () => {
                            const k = lastKey;
                            if (k === "Space") lastKey = ""; // Clear Space so it doesn't repeat every frame unless pressed again
                            return k;
                        }
                    }
                };

        const denner_add = (l, r) => {
            if (typeof l === "string" || typeof r === "string") return String(l) + String(r);
            return l + r;
        };

        // Run the Denner program using async Function to support await at top level
        const code = ${encodedCode};
        (new Function('denner', 'denner_state', 'denner_system_print', 'denner_add', '"use strict"; return (async function() {' + code + '})();'))(
            denner, denner_state, denner_system_print, denner_add
        ).catch(e => {
            denner_system_print("Runtime Error: " + e.message);
            console.error(e);
        });
    </script>
</body>
</html>`;
}

async function performUpdate(): Promise<void> {
    console.log('🔄 Checking for updates...');
    try {
        const response = await fetch("https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/package.json");
        if (!response.ok) throw new Error("Could not fetch remote version info.");
        const remotePkg = await response.json();
        const remoteVersion = remotePkg.version;

        if (DENNER_VERSION === remoteVersion) {
            console.log(`✅ You are already on the latest version of Denner (v${DENNER_VERSION}).`);
            process.exit(0);
        }

        console.log(`🚀 Update available: v${DENNER_VERSION} -> v${remoteVersion}`);
        console.log('🔄 Downloading the latest Executable...');

        // @ts-ignore
        const isPkg = typeof process.pkg !== 'undefined';
        if (!isPkg) {
            console.error("⚠️  You are running from source. Please use 'git pull' and 'npm build' directly.");
            process.exit(1);
        }

        const isWin = process.platform === "win32";
        const arch = process.arch === "x64" ? "x64" : "arm64";
        const platform = process.platform === "darwin" ? "macos" : process.platform === "win32" ? "win" : "linux";
        const ext = isWin ? ".exe" : "";
        const binName = `denner-${platform}-${arch}${ext}`;
        const binUrl = `https://github.com/rits1019c1/denner/releases/latest/download/${binName}`;

        const binReq = await fetch(binUrl);
        if (!binReq.ok) {
            throw new Error(`Failed to download binary from GitHub Releases: HTTP ${binReq.status}`);
        }
        const arrayBuffer = await binReq.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const execPath = process.execPath;
        if (isWin) {
            fs.renameSync(execPath, execPath + ".old");
            fs.writeFileSync(execPath, buffer);
        } else {
            if (fs.existsSync(execPath)) fs.unlinkSync(execPath);
            fs.writeFileSync(execPath, buffer);
            fs.chmodSync(execPath, 0o755);
        }

        console.log(`✅ Denner updated successfully to v${remoteVersion}!`);
        process.exit(0);
    } catch (e: any) {
        console.error("Failed to check for updates:", e.message);
        process.exit(1);
    }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    if (process.stdin.isTTY) {
        checkForUpdateSilently();
        await startRepl();
        return;
    } else {
        process.exit(0);
    }
  }

  const buildDir = path.join(process.cwd(), '.denner_build');
  cleanOldBuilds(buildDir);

  const command = args[0];

  if (command === '--version' || command === '-v') {
      console.log(`Denner CLI v${DENNER_VERSION}`);
      process.exit(0);
  }

  if (command === '--help' || command === '-h' || command === 'help') {
      printHelp();
      process.exit(0);
  }

  if (command === 'update' || command === 'upgrade') {
      await performUpdate();
      return;
  }

  if (command === 'clean') {
      if (fs.existsSync(buildDir)) {
          fs.rmSync(buildDir, { recursive: true });
          console.log(`✅ Cleaned build directory: ${buildDir}`);
      } else {
          console.log("Build directory already clean.");
      }
      process.exit(0);
  }

  checkForUpdateSilently();

  if (args.length < 2) {
      console.error('Error: Missing <file> argument.');
      process.exit(1);
  }

  const fileName = args[1];
  let customOutPath: string | null = null;
  let debugMode = false;
  
  for (let i = 2; i < args.length; i++) {
      if ((args[i] === '-o' || args[i] === '--output') && args[i+1]) {
          customOutPath = args[i+1];
          i++;
      } else if (args[i] === '-d' || args[i] === '--debug') {
          debugMode = true;
      }
  }

  try {
     const resolver = new Resolver();
     await resolver.resolve(fileName);

     let fullSource = '';
     for (const [modPath, source] of resolver.modules.entries()) {
         fullSource += `\n// --- module: ${modPath} ---\n`;
         fullSource += source;
     }

     const tokens = new Lexer(fullSource).tokenize();
     const parser = new Parser(tokens);
     const ast = parser.parse();

     const typechecker = new TypeChecker(ast);
     typechecker.check();

     if (command === 'build-html') {
         if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);
         const jsCodegen = new JSCodeGenerator(ast);
         const jsOutput = jsCodegen.generate();
         const htmlOutput = generateHtml(jsOutput, path.basename(fileName), debugMode);
         
         const outPath = customOutPath || path.join(buildDir, path.basename(fileName).replace(/\.den$/, '') + '.html');
         fs.writeFileSync(outPath, htmlOutput);
         console.log(`✨ Standalone HTML game generated: ${outPath}`);
         if (debugMode) console.log(`\x1b[2m🐞 Debug mode enabled: Side console visible.\x1b[0m`);
         
         openFile(outPath);
         return;
     }

     if (command === 'run' || command === 'compile') {
          if (detectGuiUsage(ast)) {
              console.log(`\x1b[33m🎨 GUI usage detected.\x1b[0m Native CLI rendering is limited.`);
              const build = await promptUser(`Do you want to build and open an HTML version instead? [y/N] `);
              if (build) {
                  const jsCodegen = new JSCodeGenerator(ast);
                  const jsOutput = jsCodegen.generate();
                  const htmlOutput = generateHtml(jsOutput, path.basename(fileName), debugMode);
                  const outPath = path.join(buildDir, path.basename(fileName).replace(/\.den$/, '') + '.html');
                  if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);
                  fs.writeFileSync(outPath, htmlOutput);
                  console.log(`✨ Standalone HTML generated and opened: ${outPath}`);
                  openFile(outPath);
                  return;
              }
          }
      }

     const codegen = new CodeGenerator(ast);
     const cppSource = codegen.generate();

     if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir);

     const cppFile = path.join(buildDir, 'main.cpp');
     const binFile = path.join(buildDir, 'main');
     
     fs.writeFileSync(cppFile, cppSource);

     const compileResult = spawnSync('g++', [cppFile, '-o', binFile, '-std=c++14'], { stdio: 'inherit' });
     if (compileResult.status !== 0) {
         console.error("\x1b[31mError:\x1b[0m C++ Compilation failed.");
         process.exit(1);
     }

     if (command === 'run') {
         const runResult = spawnSync(binFile, { stdio: 'inherit' });
         process.exit(runResult.status ?? 0);
     } else if (command === 'compile') {
         const baseFileName = path.basename(fileName).replace(/\.den$/, '');
         const outName = customOutPath || baseFileName;
         fs.copyFileSync(binFile, outName);
         console.log(`✨ Compiled successfully: ${baseFileName} -> ${outName}`);
         return;
     } else {
         console.error(`Unknown command: ${command}`);
         process.exit(1);
     }
  } catch (err: any) {
     console.error(err.message);
     process.exit(1);
  }
}

main();
