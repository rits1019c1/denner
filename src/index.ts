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

const DENNER_VERSION = '1.2.0';

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
    console.log('    $ denner update                 Update to the latest version');
    console.log('');
    console.log('  \x1b[1mOPTIONS\x1b[0m');
    console.log('    -A, --allow-all                 Allow all permissions');
    console.log('    -N, --allow-net                 Allow network access');
    console.log('    -F, --allow-fs                  Allow file system access');
    console.log('    -v, --version                   Show version');
    console.log('    -h, --help                      Show this help');
    console.log('');
    console.log('  \x1b[1mEXAMPLES\x1b[0m');
    console.log('    $ denner run hello.den');
    console.log('    $ denner run https://raw.githubusercontent.com/.../demo.den');
    console.log('    $ denner run script.den -N');
    console.log('');
}

// Silent background update check — notify only if an update is available
async function checkForUpdateSilently(): Promise<void> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout
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
        // Silently ignore — offline or timeout
    }
}

// Interactive REPL
async function startRepl(): Promise<void> {
    console.log(`\x1b[1m\x1b[35mDenner\x1b[0m v${DENNER_VERSION} — Interactive Mode`);
    console.log('\x1b[2mType Denner code to evaluate. Type .exit to quit.\x1b[0m');
    console.log('');

    const rl = readLine.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: '\x1b[35mdenner>\x1b[0m ',
    });

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
            const ast = parser.parse();

            const typechecker = new TypeChecker(ast);
            typechecker.check();

            const codegen = new CodeGenerator(ast);
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
                    // Show a simplified error message
                    const lines = stderr.split('\n').filter(l => l.includes('error:'));
                    if (lines.length > 0) {
                        console.log(`  ${lines[0].split('error:')[1]?.trim() || stderr.split('\n')[0]}`);
                    }
                }
            } else {
                const runResult = spawnSync(binFile, { stdio: 'inherit' });
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

  // No arguments → start interactive REPL
  if (args.length < 1) {
    // Fire update check in background (non-blocking)
    checkForUpdateSilently();
    await startRepl();
    return;
  }

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

  // For run/compile, do a silent background update check
  checkForUpdateSilently();

  if (args.length < 2) {
      console.error('Error: Missing <file> argument for run/compile.');
      process.exit(1);
  }

  const filePath = args[1];

  let allowNet = false;
  let allowFs = false;
  let useCache = true;

  for (let i = 2; i < args.length; i++) {
     if (args[i] === '-a' || args[i] === '-A' || args[i] === '--allow-all') {
        allowNet = true;
        allowFs = true;
     } else if (args[i] === '--allow-net' || args[i] === '-N') {
        allowNet = true;
     } else if (args[i] === '--allow-fs' || args[i] === '-F') {
        allowFs = true;
     } else if (args[i] === '--no-cache') {
        useCache = false;
     }
  }

  if (!allowNet && (filePath.startsWith('http://') || filePath.startsWith('https://'))) {
     const allowed = await promptUser(`⚠️  This script requests network access to import from ${filePath}.\nDo you want to allow it? (y/N): `);
     if (allowed) {
         allowNet = true;
     } else {
         console.error('Error: Network access denied.');
         process.exit(1);
     }
  }

  try {
     const resolver = new Resolver();
     await resolver.resolve(filePath);

     // Concatenate all resolved modules to form a single source
     let fullSource = '';
     for (const [modPath, source] of resolver.modules.entries()) {
         fullSource += `\n// --- module: ${modPath} ---\n`;
         fullSource += source;
     }

     if (!allowNet && (fullSource.includes('net.get') || fullSource.includes('net.'))) {
         const allowed = await promptUser(`⚠️  This script requires network access (detected 'net' module usage).\nDo you want to allow it? (y/N): `);
         if (allowed) {
             allowNet = true;
         } else {
             console.error('Error: Network access denied.');
             process.exit(1);
         }
     }

     const tokens = new Lexer(fullSource).tokenize();
     const parser = new Parser(tokens);
     const ast = parser.parse();

     const typechecker = new TypeChecker(ast);
     typechecker.check();

     const codegen = new CodeGenerator(ast);
     const cppSource = codegen.generate();

     const buildDir = path.join(process.cwd(), '.denner_build');
     if (!fs.existsSync(buildDir)) {
         fs.mkdirSync(buildDir);
     }

     const cppFile = path.join(buildDir, 'main.cpp');
     const binFile = path.join(buildDir, 'main');
     
     fs.writeFileSync(cppFile, cppSource);

     const compileResult = spawnSync('g++', [cppFile, '-o', binFile, '-std=c++14'], { stdio: 'inherit' });
     if (compileResult.status !== 0) {
         console.error('C++ Compilation failed.');
         process.exit(1);
     }

     if (command === 'run') {
         const runResult = spawnSync(binFile, { stdio: 'inherit' });
         process.exit(runResult.status ?? 0);
     } else if (command === 'compile') {
         console.log(`Successfully compiled to ${binFile}`);
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
