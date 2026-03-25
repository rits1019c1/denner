"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lexer = exports.TokenType = void 0;
var TokenType;
(function (TokenType) {
    // Literals
    TokenType["IDENTIFIER"] = "IDENTIFIER";
    TokenType["NUMBER_LITERAL"] = "NUMBER_LITERAL";
    TokenType["STRING_LITERAL"] = "STRING_LITERAL";
    TokenType["BOOLEAN_LITERAL"] = "BOOLEAN_LITERAL";
    // Keywords
    TokenType["FUNCTION"] = "FUNCTION";
    TokenType["RETURN"] = "RETURN";
    TokenType["IF"] = "IF";
    TokenType["ELSE"] = "ELSE";
    TokenType["FOR"] = "FOR";
    TokenType["IN"] = "IN";
    TokenType["IMPORT"] = "IMPORT";
    TokenType["EXPORT"] = "EXPORT";
    TokenType["AS"] = "AS";
    // Type annotations
    TokenType["TYPE_NUM"] = "TYPE_NUM";
    TokenType["TYPE_STR"] = "TYPE_STR";
    TokenType["TYPE_BOOL"] = "TYPE_BOOL";
    TokenType["TYPE_LIST"] = "TYPE_LIST";
    TokenType["TYPE_OBJ"] = "TYPE_OBJ";
    // Operators & Punctuation
    TokenType["ASSIGN"] = "ASSIGN";
    TokenType["COLON"] = "COLON";
    TokenType["LBRACE"] = "LBRACE";
    TokenType["RBRACE"] = "RBRACE";
    TokenType["LPAREN"] = "LPAREN";
    TokenType["RPAREN"] = "RPAREN";
    TokenType["LBRACKET"] = "LBRACKET";
    TokenType["RBRACKET"] = "RBRACKET";
    TokenType["COMMA"] = "COMMA";
    TokenType["DOT"] = "DOT";
    TokenType["DOT_DOT"] = "DOT_DOT";
    // Math & Comparison
    TokenType["PLUS"] = "PLUS";
    TokenType["MINUS"] = "MINUS";
    TokenType["STAR"] = "STAR";
    TokenType["SLASH"] = "SLASH";
    TokenType["GT"] = "GT";
    TokenType["LT"] = "LT";
    TokenType["EQ_EQ"] = "EQ_EQ";
    TokenType["NOT_EQ"] = "NOT_EQ";
    // Utility
    TokenType["EOF"] = "EOF";
    TokenType["NEWLINE"] = "NEWLINE"; // Used for statement boundaries since semicolons are omitted
})(TokenType || (exports.TokenType = TokenType = {}));
const Keywords = {
    function: TokenType.FUNCTION,
    return: TokenType.RETURN,
    if: TokenType.IF,
    else: TokenType.ELSE,
    for: TokenType.FOR,
    in: TokenType.IN,
    import: TokenType.IMPORT,
    export: TokenType.EXPORT,
    as: TokenType.AS,
    true: TokenType.BOOLEAN_LITERAL,
    false: TokenType.BOOLEAN_LITERAL,
};
const TypeKeywords = {
    num: TokenType.TYPE_NUM,
    str: TokenType.TYPE_STR,
    bool: TokenType.TYPE_BOOL,
    list: TokenType.TYPE_LIST,
    obj: TokenType.TYPE_OBJ,
};
class Lexer {
    source;
    position = 0;
    line = 1;
    column = 1;
    constructor(source) {
        this.source = source;
    }
    tokenize() {
        const tokens = [];
        while (this.position < this.source.length) {
            this.skipWhitespace();
            if (this.position >= this.source.length)
                break;
            const char = this.peek();
            // Newlines are significant in Denner, but we don't want repeated ones
            if (char === '\n') {
                const lastToken = tokens[tokens.length - 1];
                if (lastToken && lastToken.type !== TokenType.NEWLINE) {
                    tokens.push(this.createToken(TokenType.NEWLINE, '\n'));
                }
                this.advance();
                this.line++;
                this.column = 1;
                continue;
            }
            // Comments
            if (char === '/' && this.peek(1) === '/') {
                this.skipComment();
                continue;
            }
            if (this.isDigit(char)) {
                tokens.push(this.readNumber());
            }
            else if (this.isAlpha(char)) {
                tokens.push(this.readIdentifierOrKeyword());
            }
            else if (char === '"') {
                tokens.push(this.readString());
            }
            else {
                tokens.push(this.readSymbol());
            }
        }
        tokens.push(this.createToken(TokenType.EOF, ''));
        // Filter out trailing newlines before EOF
        const cleaned = [];
        for (let i = 0; i < tokens.length; i++) {
            if (tokens[i].type === TokenType.NEWLINE && tokens[i + 1]?.type === TokenType.EOF) {
                continue;
            }
            cleaned.push(tokens[i]);
        }
        return cleaned;
    }
    peek(offset = 0) {
        if (this.position + offset >= this.source.length)
            return '\0';
        return this.source[this.position + offset];
    }
    advance() {
        const char = this.source[this.position];
        this.position++;
        this.column++;
        return char;
    }
    skipWhitespace() {
        while (this.position < this.source.length) {
            const char = this.peek();
            if (char === ' ' || char === '\r' || char === '\t') {
                this.advance();
            }
            else {
                break;
            }
        }
    }
    skipComment() {
        while (this.position < this.source.length && this.peek() !== '\n') {
            this.advance();
        }
    }
    isDigit(char) {
        return char >= '0' && char <= '9';
    }
    isAlpha(char) {
        return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
    }
    isAlphaNumeric(char) {
        return this.isAlpha(char) || this.isDigit(char);
    }
    readNumber() {
        let value = '';
        const startCol = this.column;
        while (this.isDigit(this.peek()) || this.peek() === '.') {
            // Special case: `..` is an operator, so if we see '.', we need to peek the next char
            if (this.peek() === '.' && this.peek(1) === '.') {
                break;
            }
            value += this.advance();
        }
        return { type: TokenType.NUMBER_LITERAL, value, line: this.line, column: startCol };
    }
    readIdentifierOrKeyword() {
        let value = '';
        const startCol = this.column;
        while (this.isAlphaNumeric(this.peek())) {
            value += this.advance();
        }
        let type = TokenType.IDENTIFIER;
        if (Keywords[value]) {
            type = Keywords[value];
        }
        else if (TypeKeywords[value]) {
            type = TypeKeywords[value];
        }
        return { type, value, line: this.line, column: startCol };
    }
    readString() {
        const startCol = this.column;
        this.advance(); // consume opening quote
        let value = '';
        while (this.position < this.source.length && this.peek() !== '"') {
            value += this.advance();
        }
        this.advance(); // consume closing quote
        return { type: TokenType.STRING_LITERAL, value, line: this.line, column: startCol };
    }
    readSymbol() {
        const char = this.peek();
        const startCol = this.column;
        switch (char) {
            case '=':
                this.advance();
                if (this.peek() === '=') {
                    this.advance();
                    return { type: TokenType.EQ_EQ, value: '==', line: this.line, column: startCol };
                }
                return { type: TokenType.ASSIGN, value: '=', line: this.line, column: startCol };
            case ':':
                this.advance();
                return { type: TokenType.COLON, value: ':', line: this.line, column: startCol };
            case '{':
                this.advance();
                return { type: TokenType.LBRACE, value: '{', line: this.line, column: startCol };
            case '}':
                this.advance();
                return { type: TokenType.RBRACE, value: '}', line: this.line, column: startCol };
            case '(':
                this.advance();
                return { type: TokenType.LPAREN, value: '(', line: this.line, column: startCol };
            case ')':
                this.advance();
                return { type: TokenType.RPAREN, value: ')', line: this.line, column: startCol };
            case '[':
                this.advance();
                return { type: TokenType.LBRACKET, value: '[', line: this.line, column: startCol };
            case ']':
                this.advance();
                return { type: TokenType.RBRACKET, value: ']', line: this.line, column: startCol };
            case ',':
                this.advance();
                return { type: TokenType.COMMA, value: ',', line: this.line, column: startCol };
            case '.':
                this.advance();
                if (this.peek() === '.') {
                    this.advance();
                    return { type: TokenType.DOT_DOT, value: '..', line: this.line, column: startCol };
                }
                return { type: TokenType.DOT, value: '.', line: this.line, column: startCol };
            case '+':
                this.advance();
                return { type: TokenType.PLUS, value: '+', line: this.line, column: startCol };
            case '-':
                this.advance();
                return { type: TokenType.MINUS, value: '-', line: this.line, column: startCol };
            case '*':
                this.advance();
                return { type: TokenType.STAR, value: '*', line: this.line, column: startCol };
            case '/':
                // comments are already handled, so this is just division
                this.advance();
                return { type: TokenType.SLASH, value: '/', line: this.line, column: startCol };
            case '>':
                this.advance();
                return { type: TokenType.GT, value: '>', line: this.line, column: startCol };
            case '<':
                this.advance();
                return { type: TokenType.LT, value: '<', line: this.line, column: startCol };
            case '!':
                this.advance();
                if (this.peek() === '=') {
                    this.advance();
                    return { type: TokenType.NOT_EQ, value: '!=', line: this.line, column: startCol };
                }
                // Fallback for general unhandled
                throw new Error(`Unexpected character: ${char} at line ${this.line}`);
            default:
                throw new Error(`Unexpected character: ${char} at line ${this.line}`);
        }
    }
    createToken(type, value) {
        return { type, value, line: this.line, column: this.column };
    }
}
exports.Lexer = Lexer;
//# sourceMappingURL=lexer.js.map