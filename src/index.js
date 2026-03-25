#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const resolver_1 = require("./resolver");
const lexer_1 = require("./compiler/lexer");
const parser_1 = require("./compiler/parser");
const typechecker_1 = require("./compiler/typechecker");
const codegen_1 = require("./compiler/codegen");
async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: denner <command> <file> [options]');
        console.error('Commands: run, compile');
        process.exit(1);
    }
    const command = args[0];
    const filePath = args[1];
    let allowNet = false;
    let allowFs = false;
    let useCache = true;
    for (let i = 2; i < args.length; i++) {
        if (args[i] === '-a') {
            allowNet = true;
            allowFs = true;
        }
        else if (args[i] === '--allow-net') {
            allowNet = true;
        }
        else if (args[i] === '--allow-fs') {
            allowFs = true;
        }
        else if (args[i] === '--no-cache') {
            useCache = false;
        }
    }
    if (!allowNet && (filePath.startsWith('http://') || filePath.startsWith('https://'))) {
        console.error('Error: Network access is not allowed. Use --allow-net flag.');
        process.exit(1);
    }
    try {
        const resolver = new resolver_1.Resolver();
        await resolver.resolve(filePath);
        // Concatenate all resolved modules to form a single source
        let fullSource = '';
        for (const [modPath, source] of resolver.modules.entries()) {
            fullSource += `\n// --- module: ${modPath} ---\n`;
            fullSource += source;
        }
        const tokens = new lexer_1.Lexer(fullSource).tokenize();
        const parser = new parser_1.Parser(tokens);
        const ast = parser.parse();
        const typechecker = new typechecker_1.TypeChecker(ast);
        typechecker.check();
        const codegen = new codegen_1.CodeGenerator(ast);
        const cppSource = codegen.generate();
        const buildDir = path.join(process.cwd(), '.denner_build');
        if (!fs.existsSync(buildDir)) {
            fs.mkdirSync(buildDir);
        }
        const cppFile = path.join(buildDir, 'main.cpp');
        const binFile = path.join(buildDir, 'main');
        fs.writeFileSync(cppFile, cppSource);
        const compileResult = (0, child_process_1.spawnSync)('g++', [cppFile, '-o', binFile, '-std=c++14'], { stdio: 'inherit' });
        if (compileResult.status !== 0) {
            console.error('C++ Compilation failed.');
            process.exit(1);
        }
        if (command === 'run') {
            const runResult = (0, child_process_1.spawnSync)(binFile, { stdio: 'inherit' });
            process.exit(runResult.status ?? 0);
        }
        else if (command === 'compile') {
            console.log(`Successfully compiled to ${binFile}`);
        }
        else {
            console.error(`Unknown command: ${command}`);
            process.exit(1);
        }
    }
    catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map