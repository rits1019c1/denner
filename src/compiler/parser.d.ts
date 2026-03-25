import { Token } from './lexer';
import * as AST from './ast';
export declare class Parser {
    private tokens;
    private current;
    constructor(tokens: Token[]);
    parse(): AST.Program;
    private parseStatement;
    private parseExportStatement;
    private parseImportStatement;
    private parseFunctionDeclaration;
    private parseVariableDeclaration;
    private parseIfStatement;
    private parseForStatement;
    private parseReturnStatement;
    private parseBlock;
    private parseExpressionStatement;
    private parseExpression;
    private parseEquality;
    private parseComparison;
    private parseTerm;
    private parseFactor;
    private parseCall;
    private finishCall;
    private parsePrimary;
    private match;
    private check;
    private advance;
    private isAtEnd;
    private peek;
    private previous;
    private consume;
    private consumeStatementEnd;
    private error;
    private getTypeString;
}
//# sourceMappingURL=parser.d.ts.map