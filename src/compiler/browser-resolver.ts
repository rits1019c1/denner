export class BrowserResolver {
  private visited: Set<string> = new Set();
  public modules: Map<string, string> = new Map();

  public async resolve(sourcePath: string, basePath: string = ''): Promise<void> {
    const isUrl = sourcePath.startsWith('http://') || sourcePath.startsWith('https://');
    
    // In browser, everything should probably be a URL if it's external.
    // Relative paths only work if we know the base URL of the current page or the importing script.
    let absolutePath: string;
    try {
        absolutePath = isUrl ? sourcePath : new URL(sourcePath, basePath).href;
    } catch (e) {
        throw new Error(`Invalid URL or path: ${sourcePath}`);
    }

    if (this.visited.has(absolutePath)) return;
    this.visited.add(absolutePath);

    const response = await fetch(absolutePath);
    if (!response.ok) throw new Error(`Failed to fetch ${absolutePath}: ${response.status}`);
    const sourceCode = await response.text();

    this.modules.set(absolutePath, sourceCode);

    // Recursive resolution
    const importRegex = /import\s+"([^"]+)"/g;
    let match;
    while ((match = importRegex.exec(sourceCode)) !== null) {
      const depPath = match[1];
      const nextBase = new URL('.', absolutePath).href;
      await this.resolve(depPath, nextBase);
    }
  }

  public getFullSource(rootSource: string): string {
    let fullSource = '';
    // Add all resolved modules first
    for (const [path, source] of this.modules.entries()) {
      fullSource += `\n// --- module: ${path} ---\n${source}\n`;
    }
    // Add root source at the end
    fullSource += `\n// --- root code ---\n${rootSource}\n`;
    return fullSource;
  }
}
