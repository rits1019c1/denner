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

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: denner <command> <file> [options]');
    console.error('Commands: run, compile, update');
    process.exit(1);
  }

  const command = args[0];

  if (command === 'update' || command === 'upgrade') {
      console.log('🔄 Checking for updates...');
      try {
          // Identify current version
          const CURRENT_VERSION = '1.0.0'; // Hardcoded for executable tracking

          const response = await fetch("https://raw.githubusercontent.com/Rituto/denner/main/package.json");
          if (!response.ok) throw new Error("Could not fetch remote version info.");
          const remotePkg = await response.json();
          const remoteVersion = remotePkg.version;
          
          if (CURRENT_VERSION === remoteVersion) {
              console.log(`✅ You are already on the latest version of Denner (v${CURRENT_VERSION}).`);
              process.exit(0);
          }
          
          console.log(`🚀 Update available: v${CURRENT_VERSION} -> v${remoteVersion}`);
          console.log('🔄 Downloading the latest Executable...');

          // Determine if we are running as a standalone pkg
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
          const binUrl = `https://github.com/Rituto/denner/releases/latest/download/${binName}`;

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
