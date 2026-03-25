import * as AST from './ast';
export declare class TypeError extends Error {
    line: number;
    constructor(message: string, line: number);
}
export declare class TypeChecker {
    private ast;
    private currentEnv;
    constructor(ast: AST.Program);
    check(): void;
    private pushEnv;
    private popEnv;
    private defineVar;
    private lookupVar;
    private defineFunc;
    private lookupFunc;
    private checkProgram;
    private checkStatement;
    private checkVariableDeclaration;
    private checkFunctionDeclaration;
    private checkExpression;
    private checkBinaryExpression;
    private checkAssignmentExpression;
    private checkCallExpression;
}
//# sourceMappingURL=typechecker.d.ts.map