import * as AST from './ast';
export declare class CodeGenerator {
    private ast;
    private indentLevel;
    private output;
    constructor(ast: AST.Program);
    generate(): string;
    private emit;
    private indent;
    private dedent;
    private mapType;
    private emitFunctionForwardDeclaration;
    private generateStatement;
    private generateExpression;
}
//# sourceMappingURL=codegen.d.ts.map