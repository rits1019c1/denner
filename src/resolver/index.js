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
exports.Resolver = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const https = __importStar(require("https"));
class Resolver {
    cacheDir;
    visited = new Set();
    modules = new Map(); // resolved path -> source code
    constructor() {
        this.cacheDir = path.join(process.cwd(), '.denner_cache');
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir);
        }
    }
    async resolve(sourcePath, basePath = process.cwd()) {
        const isUrl = sourcePath.startsWith('http://') || sourcePath.startsWith('https://');
        let absolutePath = isUrl ? sourcePath : path.resolve(basePath, sourcePath);
        if (this.visited.has(absolutePath)) {
            return; // cycle prevented
        }
        this.visited.add(absolutePath);
        let sourceCode = '';
        if (isUrl) {
            sourceCode = await this.fetchUrl(absolutePath);
        }
        else {
            if (!fs.existsSync(absolutePath)) {
                throw new Error(`Cannot find local module: ${absolutePath}`);
            }
            sourceCode = fs.readFileSync(absolutePath, 'utf8');
        }
        this.modules.set(absolutePath, sourceCode);
        // Extract imports regex-wise to rapidly resolve recursively before full AST parsing
        const importRegex = /import\s+"([^"]+)"/g;
        let match;
        while ((match = importRegex.exec(sourceCode)) !== null) {
            const depPath = match[1];
            const newBasePath = isUrl ? new URL('.', absolutePath).href : path.dirname(absolutePath);
            await this.resolve(depPath, newBasePath);
        }
    }
    fetchUrl(url) {
        // Check cache first
        const urlHash = Buffer.from(url).toString('base64').replace(/\W/g, '');
        const cacheFile = path.join(this.cacheDir, urlHash + '.den');
        if (fs.existsSync(cacheFile)) {
            return Promise.resolve(fs.readFileSync(cacheFile, 'utf8'));
        }
        return new Promise((resolve, reject) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                        fs.writeFileSync(cacheFile, data);
                        resolve(data);
                    }
                    else {
                        reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
                    }
                });
            }).on('error', reject);
        });
    }
}
exports.Resolver = Resolver;
//# sourceMappingURL=index.js.map