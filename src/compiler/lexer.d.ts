export declare enum TokenType {
    IDENTIFIER = "IDENTIFIER",
    NUMBER_LITERAL = "NUMBER_LITERAL",
    STRING_LITERAL = "STRING_LITERAL",
    BOOLEAN_LITERAL = "BOOLEAN_LITERAL",
    FUNCTION = "FUNCTION",
    RETURN = "RETURN",
    IF = "IF",
    ELSE = "ELSE",
    FOR = "FOR",
    IN = "IN",
    IMPORT = "IMPORT",
    EXPORT = "EXPORT",
    AS = "AS",
    TYPE_NUM = "TYPE_NUM",
    TYPE_STR = "TYPE_STR",
    TYPE_BOOL = "TYPE_BOOL",
    TYPE_LIST = "TYPE_LIST",
    TYPE_OBJ = "TYPE_OBJ",
    ASSIGN = "ASSIGN",
    COLON = "COLON",
    LBRACE = "LBRACE",
    RBRACE = "RBRACE",
    LPAREN = "LPAREN",
    RPAREN = "RPAREN",
    LBRACKET = "LBRACKET",
    RBRACKET = "RBRACKET",
    COMMA = "COMMA",
    DOT = "DOT",
    DOT_DOT = "DOT_DOT",
    PLUS = "PLUS",
    MINUS = "MINUS",
    STAR = "STAR",
    SLASH = "SLASH",
    GT = "GT",
    LT = "LT",
    EQ_EQ = "EQ_EQ",
    NOT_EQ = "NOT_EQ",
    EOF = "EOF",
    NEWLINE = "NEWLINE"
}
export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
}
export declare class Lexer {
    private source;
    private position;
    private line;
    private column;
    constructor(source: string);
    tokenize(): Token[];
    private peek;
    private advance;
    private skipWhitespace;
    private skipComment;
    private isDigit;
    private isAlpha;
    private isAlphaNumeric;
    private readNumber;
    private readIdentifierOrKeyword;
    private readString;
    private readSymbol;
    private createToken;
}
//# sourceMappingURL=lexer.d.ts.map