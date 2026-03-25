import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

export class Resolver {
  private cacheDir: string;
  private visited: Set<string> = new Set();
  public modules: Map<string, string> = new Map(); // resolved path -> source code
  
  constructor() {
    this.cacheDir = path.join(process.cwd(), '.denner_cache');
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir);
    }
  }

  public async resolve(sourcePath: string, basePath: string = process.cwd()): Promise<void> {
    const isUrl = sourcePath.startsWith('http://') || sourcePath.startsWith('https://');
    let absolutePath = isUrl ? sourcePath : path.resolve(basePath, sourcePath);

    if (this.visited.has(absolutePath)) {
       return; // cycle prevented
    }
    this.visited.add(absolutePath);

    let sourceCode = '';
    if (isUrl) {
       sourceCode = await this.fetchUrl(absolutePath);
    } else {
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

  private fetchUrl(url: string): Promise<string> {
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
               } else {
                  reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
               }
           });
        }).on('error', reject);
     });
  }
}
