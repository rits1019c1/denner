#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as readLine from 'readline';
import { Resolver } from './resolver';
import { Lexer } from './compiler/lexer';
import { Parser } from './compiler/parser';
import { TypeChecker } from './compiler/typechecker';
import { JSCodeGenerator } from './compiler/jscodegen';
import { Interpreter } from './compiler/interpreter';
import * as AST from './compiler/ast';

const DENNER_VERSION = '1.6.5';

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

function printError(message: string, prefix: string = "Error") {
    console.error(`\n  \x1b[31m\x1b[1m[!] ${prefix}:\x1b[22m\x1b[0m \x1b[31m${message}\x1b[0m\n`);
}

function levenshtein(a: string, b: string): number {
    const tmp: number[][] = [];
    for (let i = 0; i <= a.length; i++) tmp[i] = [i];
    for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            tmp[i][j] = Math.min(
                tmp[i - 1][j] + 1,
                tmp[i][j - 1] + 1,
                tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
    }
    return tmp[a.length][b.length];
}

function suggestCommand(input: string) {
    const commands = ['run', 'update', 'upgrade', 'help', 'compile'];
    let bestMatch = '';
    let minDistance = 3; // Max threshold for suggestion

    for (const cmd of commands) {
        const dist = levenshtein(input, cmd);
        if (dist < minDistance) {
            minDistance = dist;
            bestMatch = cmd;
        }
    }

    if (bestMatch) {
        console.log(`  \x1b[33mもしかして: \x1b[1m${bestMatch}\x1b[0m\x1b[33m ですか？\x1b[0m`);
    }
}

function printHelp() {
    console.log('');
    console.log('  \x1b[1m\x1b[35mDenner\x1b[0m - The Interpreter-based Programming Language');
    console.log(`  \x1b[2mv${DENNER_VERSION}\x1b[0m`);
    console.log('');
    console.log('  \x1b[1mUSAGE\x1b[0m');
    console.log('    $ denner                       Start interactive REPL');
    console.log('    $ denner run <file|url>         Run a Denner script');
    console.log('    $ denner update                 Update to the latest version');
    console.log('    $ denner install [version]      Install a specific version (shows menu if omitted)');
    console.log('    $ denner list                   List all available versions');
    console.log('');
    console.log('  \x1b[1mOPTIONS\x1b[0m');
    console.log('    -v, --version                   Show version');
    console.log('    -h, --help                      Show help message');
    console.log('');
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
    const interpreter = new Interpreter();

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

        // 非同期実行を同期的に見せるため、Promise の完了を待つ
        (async () => {
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

                await interpreter.run(currentAST);

                // 変数・関数・クラス宣言のみ履歴に残す
                for (const stmt of currentAST.body) {
                    if (
                        stmt.type === 'VariableDeclaration' ||
                        stmt.type === 'FunctionDeclaration' ||
                        stmt.type === 'ClassDeclaration'
                    ) {
                        persistentHistory.push(stmt);
                    } else if (stmt.type === 'ExpressionStatement') {
                        const expr = (stmt as AST.ExpressionStatement).expression;
                        if (expr.type === 'AssignmentExpression') {
                            persistentHistory.push(stmt);
                        }
                    }
                }
            } catch (err: any) {
                printError(err.message, "REPL Error");
            }
            rl.prompt();
        })();
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



function getBinaryName(): string {
    const isWin = process.platform === "win32";
    const arch = process.arch === "x64" ? "x64" : "arm64";
    const platform = process.platform === "darwin" ? "macos" : process.platform === "win32" ? "win" : "linux";
    const ext = isWin ? ".exe" : "";
    return `denner-${platform}-${arch}${ext}`;
}

async function downloadAndInstall(version: string, isLatest: boolean = false): Promise<void> {
    // @ts-ignore
    const isPkg = typeof process.pkg !== 'undefined';
    if (!isPkg) {
        throw new Error("You are running from source. Please use 'git pull' and 'npm build' directly.");
    }

    const binName = getBinaryName();
    const binUrl = isLatest 
        ? `https://github.com/rits1019c1/denner/releases/latest/download/${binName}`
        : `https://github.com/rits1019c1/denner/releases/download/${version}/${binName}`;

    console.log(`🔄 Downloading ${version}...`);
    const binReq = await fetch(binUrl);
    if (!binReq.ok) {
        throw new Error(`Failed to download version ${version}: HTTP ${binReq.status}`);
    }

    const buffer = Buffer.from(await binReq.arrayBuffer());
    const execPath = process.execPath;
    const isWin = process.platform === "win32";

    if (isWin) {
        if (fs.existsSync(execPath + ".old")) fs.unlinkSync(execPath + ".old");
        fs.renameSync(execPath, execPath + ".old");
        fs.writeFileSync(execPath, buffer);
    } else {
        if (fs.existsSync(execPath)) fs.unlinkSync(execPath);
        fs.writeFileSync(execPath, buffer);
        fs.chmodSync(execPath, 0o755);
    }

    console.log(`✅ Denner ${version} installed successfully!`);
}

async function fetchReleases(): Promise<string[]> {
    const response = await fetch("https://api.github.com/repos/rits1019c1/denner/releases");
    if (!response.ok) throw new Error("Could not fetch release list from GitHub.");
    const releases = await response.json();
    return releases.map((r: any) => r.tag_name);
}

async function performUpdate(): Promise<void> {
    console.log('🔄 Checking for updates...');
    try {
        const response = await fetch("https://raw.githubusercontent.com/rits1019c1/denner/refs/heads/main/package.json");
        if (!response.ok) throw new Error("Could not fetch remote version info.");
        const remotePkg = await response.json();
        const remoteVersion = "v" + remotePkg.version;

        if (("v" + DENNER_VERSION) === remoteVersion) {
            console.log(`✅ You are already on the latest version of Denner (v${DENNER_VERSION}).`);
            return;
        }

        console.log(`🚀 Update available: v${DENNER_VERSION} -> ${remoteVersion}`);
        await downloadAndInstall(remoteVersion, true);
    } catch (e: any) {
        printError(e.message, "Update Error");
        process.exit(1);
    }
}

async function performList(): Promise<void> {
    console.log('📚 Available Denner versions:');
    try {
        const versions = await fetchReleases();
        versions.forEach(v => {
            const currentTag = "v" + DENNER_VERSION;
            console.log(`  ${v === currentTag ? '\x1b[32m* ' : '  '}${v}\x1b[0m`);
        });
        console.log('\n  Run \x1b[1mdenner install <version>\x1b[0m to switch.');
    } catch (e: any) {
        printError(e.message, "List Error");
    }
}

async function performInstall(targetVersion?: string): Promise<void> {
    try {
        const versions = await fetchReleases();
        if (versions.length === 0) throw new Error("No releases found.");

        if (!targetVersion) {
            console.log('\n\x1b[1m📦 Denner Version Selector\x1b[0m');
            versions.forEach((v, i) => {
                console.log(`  [${i + 1}] ${v}${v === ("v" + DENNER_VERSION) ? ' (current)' : ''}`);
            });
            
            const rl = readLine.createInterface({ input: process.stdin, output: process.stdout });
            const choice = await new Promise<string>(res => rl.question('\n  インストールする番号を選択してください: ', res));
            rl.close();

            const idx = parseInt(choice) - 1;
            if (isNaN(idx) || idx < 0 || idx >= versions.length) {
                printError("無効な選択です。");
                return;
            }
            targetVersion = versions[idx];
        } else {
            // "1.5" -> "v1.5.0" style correction if needed
            if (!targetVersion.startsWith('v')) targetVersion = 'v' + targetVersion;
            if (!versions.includes(targetVersion)) {
                // Try fuzzy match for "v1.5" to "v1.5.0"
                const match = versions.find(v => v.startsWith(targetVersion!));
                if (match) {
                    targetVersion = match;
                } else {
                    throw new Error(`Version ${targetVersion} not found in releases.`);
                }
            }
        }

        if (isOlderThanManagement(targetVersion)) {
            console.log(`\n  \x1b[31m\x1b[1m⚠️  WARNING:\x1b[0m \x1b[31m${targetVersion} はバージョン管理機能が実装される前の古いバージョンです。\x1b[0m`);
            console.log(`  このバージョンをインストールすると、CLIから最新版に戻ることができなくなります。`);
            console.log(`  (戻すには再度インストールスクリプトを実行し直す必要があります)`);
            const ok = await promptUser(`\n  本当にインストールしますか？ (y/N): `);
            if (!ok) {
                console.log('  Installation cancelled.');
                return;
            }
        }

        await downloadAndInstall(targetVersion);
    } catch (e: any) {
        printError(e.message, "Install Error");
        process.exit(1);
    }
}

function isOlderThanManagement(version: string): boolean {
    // Management features (install/list) were added in v1.6.0
    const match = version.match(/v?(\d+)\.(\d+)(\.(\d+))?/);
    if (!match) return false;
    const major = parseInt(match[1]);
    const minor = parseInt(match[2]);
    const patch = match[4] ? parseInt(match[4]) : 0;

    if (major < 1) return true;
    if (major === 1 && minor < 6) return true;
    return false;
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
    }    const command = args[0];

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

    if (command === 'list') {
        await performList();
        return;
    }

    if (command === 'install') {
        await performInstall(args[1]);
        return;
    }

    checkForUpdateSilently();

    if (command === 'run') {
        if (args.length < 2) {
            printError('実行するファイルを指定してください。', 'Missing Argument');
            console.log('  使い方: \x1b[1mdenner run <file|url>\x1b[0m');
            process.exit(1);
        }
        
        const fileName = args[1];
        let debugMode = false;
        for (let i = 2; i < args.length; i++) {
            if (args[i] === '-d' || args[i] === '--debug') debugMode = true;
        }

        try {
            const resolver = new Resolver();
            await resolver.resolve(fileName);
            const isUrl = fileName.startsWith('http://') || fileName.startsWith('https://');
            const absoluteEntryPoint = isUrl ? fileName : path.resolve(fileName);
            const entrySource = resolver.modules.get(absoluteEntryPoint);
            if (!entrySource) throw new Error(`Could not find entry file: ${fileName}`);

            const tokens = new Lexer(entrySource).tokenize();
            const parser = new Parser(tokens);
            const ast = parser.parse();

            if (detectGuiUsage(ast)) {
                console.log(`\x1b[33m🎨 GUI usage detected.\x1b[0m Running with native SDL2 window.`);
            }

            const interpreter = new Interpreter();
            const moduleLoader = async (sourcePath: string): Promise<any> => {
                const subResolver = new Resolver();
                const isUrl = sourcePath.startsWith('http://') || sourcePath.startsWith('https://');
                const basePath = path.dirname(path.resolve(fileName));
                const absolutePath = isUrl ? sourcePath : path.resolve(basePath, sourcePath);

                await subResolver.resolve(sourcePath, basePath);
                const source = subResolver.modules.get(absolutePath);
                if (!source) throw new Error(`Could not find module: ${sourcePath}`);

                const subTokens = new Lexer(source).tokenize();
                const subParser = new Parser(subTokens);
                const modAst = subParser.parse();

                const modEnv = interpreter.createEnvironment();
                await interpreter.run(modAst, moduleLoader, modEnv);
                return modEnv;
            };

            await interpreter.run(ast, moduleLoader);
        } catch (err: any) {
            printError(err.message);
            process.exit(1);
        }
    } else if (command === 'compile') {
        console.log(`\x1b[33m⚠️  'compile' コマンドは廃止されました。\x1b[0m`);
        console.log(`  Denner はインタープリタに移行したため、ネイティブバイナリの生成はサポートしていません。`);
        console.log(`  スクリプトを実行するには: \x1b[1mdenner run <file>\x1b[0m`);
        process.exit(0);
    } else {
        printError(`未知のコマンドです: ${command}`, 'Unknown Command');
        suggestCommand(command);
        console.log('  使い方を確認するには \x1b[1mdenner --help\x1b[0m を実行してください。');
        process.exit(1);
    }
}

main();
