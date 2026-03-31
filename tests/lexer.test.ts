import { Lexer, TokenType } from '../src/compiler/lexer';

describe('Lexer', () => {
  it('should tokenize variable declarations', () => {
    const source = `a:num = 10\nb = 20`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[0].value).toBe('a');
    
    expect(tokens[1].type).toBe(TokenType.COLON);
    
    expect(tokens[2].type).toBe(TokenType.TYPE_NUM);
    
    expect(tokens[3].type).toBe(TokenType.ASSIGN);
    
    expect(tokens[4].type).toBe(TokenType.NUMBER_LITERAL);
    expect(tokens[4].value).toBe('10');
    
    expect(tokens[5].type).toBe(TokenType.NEWLINE);

    expect(tokens[6].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[6].value).toBe('b');

    expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
  });

  it('should tokenize function definitions', () => {
    const source = `function add(x:num, y:num):num { return x + y }`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens.map(t => t.type)).toEqual([
      TokenType.FUNCTION,
      TokenType.IDENTIFIER,
      TokenType.LPAREN,
      TokenType.IDENTIFIER,
      TokenType.COLON,
      TokenType.TYPE_NUM,
      TokenType.COMMA,
      TokenType.IDENTIFIER,
      TokenType.COLON,
      TokenType.TYPE_NUM,
      TokenType.RPAREN,
      TokenType.COLON,
      TokenType.TYPE_NUM,
      TokenType.LBRACE,
      TokenType.RETURN,
      TokenType.IDENTIFIER,
      TokenType.PLUS,
      TokenType.IDENTIFIER,
      TokenType.RBRACE,
      TokenType.EOF
    ]);
  });
  
  it('should tokenize range loops correctly', () => {
    const source = `for i in 1..3 {}`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    expect(tokens.map(t => t.type)).toEqual([
      TokenType.FOR,
      TokenType.IDENTIFIER,
      TokenType.IN,
      TokenType.NUMBER_LITERAL,
      TokenType.DOT_DOT,
      TokenType.NUMBER_LITERAL,
      TokenType.LBRACE,
      TokenType.RBRACE,
      TokenType.EOF
    ]);
  });

  it('should ignore comments', () => {
    const source = `// this is a comment\na:num = 1`;
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    expect(tokens[0].type).toBe(TokenType.IDENTIFIER);
    expect(tokens[0].value).toBe('a');
  });
  
  it('should handle strings correctly', () => {
      const source = `import "https://example.com/lib.den"`;
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      
      expect(tokens[0].type).toBe(TokenType.IMPORT);
      expect(tokens[1].type).toBe(TokenType.STRING_LITERAL);
      expect(tokens[1].value).toBe('https://example.com/lib.den');
  });
});
