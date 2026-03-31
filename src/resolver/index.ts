let fs: any;
let path: any;
let https: any;

// Use dynamic require for Node built-ins to avoid bundling errors in browser
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  fs = require('fs');
  path = require('path');
  https = require('https');
}

export class Resolver {
  private cacheDir: string | null = null;
  private visited: Set<string> = new Set();
  public modules: Map<string, string> = new Map(); // resolved path -> source code
  
  constructor() {
    if (fs && path) {
      this.cacheDir = path.join(process.cwd(), '.denner_cache');
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir);
      }
    }
  }

  public async resolve(sourcePath: string, basePath: string = ''): Promise<void> {
    const isUrl = sourcePath.startsWith('http://') || sourcePath.startsWith('https://');
    let absolutePath = '';

    if (isUrl) {
      absolutePath = sourcePath;
    } else {
      if (path) {
        absolutePath = path.resolve(basePath, sourcePath);
        if (!fs.existsSync(absolutePath) && !absolutePath.endsWith('.den')) {
          const denPath = absolutePath + '.den';
          if (fs.existsSync(denPath)) {
             absolutePath = denPath;
          }
        }
      } else {
        // Browser fallback (very basic)
        absolutePath = sourcePath;
      }
    }

    if (this.visited.has(absolutePath)) {
       return;
    }
    this.visited.add(absolutePath);

    let sourceCode = '';
    if (isUrl) {
       sourceCode = await this.fetchUrl(absolutePath);
    } else {
       if (fs) {
         if (!fs.existsSync(absolutePath)) {
            throw new Error(`Cannot find local module: "${absolutePath}"`);
         }
         sourceCode = fs.readFileSync(absolutePath, 'utf8');
       } else {
         // In browser, we might want to fetch local files if they are available via web server
         const res = await fetch(absolutePath);
         sourceCode = await res.text();
       }
    }

    this.modules.set(absolutePath, sourceCode);

    const importRegex = /^(?!\s*\/\/).*import\s+"([^"]+)"/gm;
    let match;
    while ((match = importRegex.exec(sourceCode)) !== null) {
      const depPath = match[1];
      let newBasePath = '';
      if (isUrl) {
        newBasePath = new URL('.', absolutePath).href;
      } else if (path) {
        newBasePath = path.dirname(absolutePath);
      }
      await this.resolve(depPath, newBasePath);
    }
  }

  private async fetchUrl(url: string): Promise<string> {
     // Browser version: just fetch
     if (typeof fetch !== 'undefined') {
        const res = await fetch(url);
        return await res.text();
     }

     // Node version: with cache
     if (fs && path && https && this.cacheDir) {
        const urlHash = Buffer.from(url).toString('base64').replace(/\W/g, '');
        const cacheFile = path.join(this.cacheDir, urlHash + '.den');
        if (fs.existsSync(cacheFile)) {
            return fs.readFileSync(cacheFile, 'utf8');
        }

        return new Promise((resolve, reject) => {
           https.get(url, (res: any) => {
              let data = '';
              res.on('data', (chunk: any) => data += chunk);
              res.on('end', () => {
                  if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                     fs.writeFileSync(cacheFile, data);
                     resolve(data);
                  } else {
                     reject(new Error(`Failed to fetch "${url}": ${res.statusCode}`));
                  }
              });
           }).on('error', reject);
        });
     }
     
     throw new Error("No network implementation available.");
  }
}
