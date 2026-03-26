export enum TokenType {
  // Literals
  IDENTIFIER = 'IDENTIFIER',
  NUMBER_LITERAL = 'NUMBER_LITERAL',
  STRING_LITERAL = 'STRING_LITERAL',
  BOOLEAN_LITERAL = 'BOOLEAN_LITERAL',

  // Keywords
  FUNCTION = 'FUNCTION',
  RETURN = 'RETURN',
  IF = 'IF',
  ELSE = 'ELSE',
  FOR = 'FOR',
  IN = 'IN',
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  AS = 'AS',
  WHILE = 'WHILE',
  OBSERVE = 'OBSERVE',

  // Type annotations
  TYPE_NUM = 'TYPE_NUM',
  TYPE_STR = 'TYPE_STR',
  TYPE_BOOL = 'TYPE_BOOL',
  TYPE_LIST = 'TYPE_LIST',
  TYPE_OBJ = 'TYPE_OBJ',

  // Operators & Punctuation
  ASSIGN = 'ASSIGN',
  COLON = 'COLON',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  COMMA = 'COMMA',
  DOT = 'DOT',
  DOT_DOT = 'DOT_DOT',

  // Math & Comparison
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  STAR = 'STAR',
  SLASH = 'SLASH',
  GT = 'GT',
  LT = 'LT',
  EQ_EQ = 'EQ_EQ',
  NOT_EQ = 'NOT_EQ',

  // Utility
  EOF = 'EOF',
  NEWLINE = 'NEWLINE' // Used for statement boundaries since semicolons are omitted
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const Keywords: Record<string, TokenType> = {
  function: TokenType.FUNCTION,
  return: TokenType.RETURN,
  if: TokenType.IF,
  else: TokenType.ELSE,
  for: TokenType.FOR,
  in: TokenType.IN,
  import: TokenType.IMPORT,
  export: TokenType.EXPORT,
  as: TokenType.AS,
  while: TokenType.WHILE,
  observe: TokenType.OBSERVE,
  true: TokenType.BOOLEAN_LITERAL,
  false: TokenType.BOOLEAN_LITERAL,
};

const TypeKeywords: Record<string, TokenType> = {
  num: TokenType.TYPE_NUM,
  str: TokenType.TYPE_STR,
  bool: TokenType.TYPE_BOOL,
  list: TokenType.TYPE_LIST,
  obj: TokenType.TYPE_OBJ,
};

export class Lexer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(source: string) {
    this.source = source;
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.position < this.source.length) {
      this.skipWhitespace();
      if (this.position >= this.source.length) break;

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
      } else if (this.isAlpha(char)) {
        tokens.push(this.readIdentifierOrKeyword());
      } else if (char === '"') {
        tokens.push(this.readString());
      } else {
        tokens.push(this.readSymbol());
      }
    }

    tokens.push(this.createToken(TokenType.EOF, ''));
    
    // Filter out trailing newlines before EOF
    const cleaned = [];
    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].type === TokenType.NEWLINE && tokens[i+1]?.type === TokenType.EOF) {
            continue;
        }
        cleaned.push(tokens[i]);
    }

    return cleaned;
  }

  private peek(offset: number = 0): string {
    if (this.position + offset >= this.source.length) return '\0';
    return this.source[this.position + offset];
  }

  private advance(): string {
    const char = this.source[this.position];
    this.position++;
    this.column++;
    return char;
  }

  private skipWhitespace() {
    while (this.position < this.source.length) {
      const char = this.peek();
      if (char === ' ' || char === '\r' || char === '\t') {
        this.advance();
      } else {
        break;
      }
    }
  }

  private skipComment() {
    while (this.position < this.source.length && this.peek() !== '\n') {
      this.advance();
    }
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private readNumber(): Token {
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

  private readIdentifierOrKeyword(): Token {
    let value = '';
    const startCol = this.column;
    while (this.isAlphaNumeric(this.peek())) {
      value += this.advance();
    }

    let type = TokenType.IDENTIFIER;
    if (Keywords[value]) {
      type = Keywords[value];
    } else if (TypeKeywords[value]) {
      type = TypeKeywords[value];
    }

    return { type, value, line: this.line, column: startCol };
  }

  private readString(): Token {
    const startCol = this.column;
    this.advance(); // consume opening quote
    let value = '';
    while (this.position < this.source.length && this.peek() !== '"') {
      value += this.advance();
    }
    this.advance(); // consume closing quote
    return { type: TokenType.STRING_LITERAL, value, line: this.line, column: startCol };
  }

  private readSymbol(): Token {
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

  private createToken(type: TokenType, value: string): Token {
    return { type, value, line: this.line, column: this.column };
  }
}
