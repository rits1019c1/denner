export declare class Resolver {
    private cacheDir;
    private visited;
    modules: Map<string, string>;
    constructor();
    resolve(sourcePath: string, basePath?: string): Promise<void>;
    private fetchUrl;
}
//# sourceMappingURL=index.d.ts.map