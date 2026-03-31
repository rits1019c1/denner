import { Token, TokenType } from './lexer';
import * as AST from './ast';

export class Parser {
  private tokens: Token[];
  private current: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): AST.Program {
    const statements: AST.Statement[] = [];
    while (!this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) continue; // ignore stray newlines at top level
      statements.push(this.parseStatement());
    }
    return {
      type: 'Program',
      body: statements,
      line: 1
    };
  }

  private parseStatement(): AST.Statement {
    if (this.match(TokenType.EXPORT)) {
      return this.parseExportStatement();
    }
    if (this.match(TokenType.IMPORT)) {
      return this.parseImportStatement();
    }
    if (this.match(TokenType.FUNCTION)) {
      return this.parseFunctionDeclaration();
    }
    if (this.match(TokenType.IF)) {
      return this.parseIfStatement();
    }
    if (this.match(TokenType.FOR)) {
      return this.parseForStatement();
    }
    if (this.match(TokenType.RETURN)) {
      return this.parseReturnStatement();
    }
    if (this.match(TokenType.WHILE)) {
      return this.parseWhileStatement();
    }
    if (this.match(TokenType.CLASS)) {
      return this.parseClassDeclaration();
    }

    // We disambiguate Variable Declaration from Assignment
    if (this.check(TokenType.IDENTIFIER)) {
      const next = this.peek(1).type;
      const isDecl = next === TokenType.COLON || next === TokenType.OBSERVE;
      if (isDecl) {
         return this.parseVariableDeclaration();
      }
    }

    return this.parseExpressionStatement();
  }

  // --- Statement Parsers ---

  private parseExportStatement(): AST.ExportStatement {
    const line = this.previous().line;
    if (this.match(TokenType.FUNCTION)) {
      const funcDecl = this.parseFunctionDeclaration(true);
      return {
        type: 'ExportStatement',
        declaration: funcDecl,
        line
      };
    } else if (this.check(TokenType.IDENTIFIER)) {
      const varDecl = this.parseVariableDeclaration();
      return {
        type: 'ExportStatement',
        declaration: varDecl,
        line
      };
    }
    throw this.error(this.peek(), "Expected function or variable declaration after 'export'.");
  }

  private parseImportStatement(): AST.ImportStatement {
    const line = this.previous().line;
    const sourceToken = this.consume(TokenType.STRING_LITERAL, "Expected string literal after 'import'.");
    let alias = null;
    if (this.match(TokenType.AS)) {
      const aliasToken = this.consume(TokenType.IDENTIFIER, "Expected identifier after 'as'.");
      alias = aliasToken.value;
    }
    this.consumeStatementEnd();
    return {
      type: 'ImportStatement',
      source: sourceToken.value,
      alias,
      line
    };
  }

  private parseFunctionDeclaration(isAlreadyParsedFunctionKeyword = false): AST.FunctionDeclaration {
    if (!isAlreadyParsedFunctionKeyword) {
      // already matched, just get line
    }
    const line = this.previous().line;
    
    const idToken = this.consume(TokenType.IDENTIFIER, "Expected function name.");
    this.consume(TokenType.LPAREN, "Expected '(' after function name.");
    
    const params: AST.Parameter[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        const paramId = this.consume(TokenType.IDENTIFIER, "Expected parameter name.");
        this.consume(TokenType.COLON, "Expected ':' after parameter name.");
        const typeToken = this.advance();
        params.push({
          id: { type: 'Identifier', name: paramId.value, line: paramId.line },
          typeAnnotation: this.getTypeString(typeToken)
        });
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN, "Expected ')' after parameters.");
    
    let returnType = 'void';
    if (this.match(TokenType.COLON)) {
      const typeToken = this.advance();
      returnType = this.getTypeString(typeToken);
    }

    const body = this.parseBlock();
    
    return {
      type: 'FunctionDeclaration',
      id: { type: 'Identifier', name: idToken.value, line: idToken.line },
      params,
      returnType,
      body,
      line
    };
  }

  private parseVariableDeclaration(): AST.VariableDeclaration {
    const idToken = this.consume(TokenType.IDENTIFIER, "Expected variable name.");
    const line = idToken.line;
    let typeAnnotation = null;

    if (this.match(TokenType.COLON)) {
      const typeToken = this.advance();
      typeAnnotation = this.getTypeString(typeToken);
    }

    let isObserved = false;
    if (this.match(TokenType.OBSERVE)) {
        isObserved = true;
    }

    this.consume(TokenType.ASSIGN, "Expected '=' after variable name.");
    const init = this.parseExpression();
    
    this.consumeStatementEnd();

    return {
      type: 'VariableDeclaration',
      id: { type: 'Identifier', name: idToken.value, line: idToken.line },
      typeAnnotation,
      isObserved,
      init,
      line
    };
  }

  private parseIfStatement(): AST.IfStatement {
    const line = this.previous().line;
    const test = this.parseExpression();
    const consequent = this.parseBlock();
    let alternate = null;

    if (this.match(TokenType.ELSE)) {
      if (this.match(TokenType.IF)) {
        alternate = this.parseIfStatement();
      } else {
        alternate = this.parseBlock();
      }
    }

    return {
      type: 'IfStatement',
      test,
      consequent,
      alternate,
      line
    };
  }

  private parseForStatement(): AST.Statement {
    const line = this.previous().line;
    
    // Parse iterators
    const iterators: AST.Identifier[] = [];
    iterators.push({ type: 'Identifier', name: this.consume(TokenType.IDENTIFIER, "Expected identifier in for loop.").value, line });
    
    if (this.match(TokenType.COMMA)) {
       iterators.push({ type: 'Identifier', name: this.consume(TokenType.IDENTIFIER, "Expected second identifier in for loop.").value, line });
    }

    this.consume(TokenType.IN, "Expected 'in' after for loop identifiers.");

    // Next could be a range (1..3) or an iterable expression.
    // Let's parse an expression:
    const exprOrRangeStart = this.parseExpression();

    // Check if it's a range
    if (this.match(TokenType.DOT_DOT)) {
      if (iterators.length > 1) {
         throw new Error("Range loop only supports a single iterator.");
      }
      const rangeEnd = this.parseExpression();
      const body = this.parseBlock();
      return {
        type: 'ForRangeStatement',
        iterator: iterators[0],
        start: exprOrRangeStart,
        end: rangeEnd,
        body,
        line
      };
    } else {
      const body = this.parseBlock();
      return {
        type: 'ForInStatement',
        iterators,
        iterable: exprOrRangeStart,
        body,
        line
      };
    }
  }

  private parseWhileStatement(): AST.WhileStatement {
    const line = this.previous().line;
    const test = this.parseExpression();
    const body = this.parseBlock();
    return {
      type: 'WhileStatement',
      test,
      body,
      line
    };
  }

  private parseReturnStatement(): AST.ReturnStatement {
    const line = this.previous().line;
    const argument = this.parseExpression();
    this.consumeStatementEnd();
    return {
      type: 'ReturnStatement',
      argument,
      line
    };
  }

  private parseBlock(): AST.BlockStatement {
    const line = this.peek().line;
    this.consume(TokenType.LBRACE, "Expected '{' to start block.");
    const statements: AST.Statement[] = [];
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) continue;
      statements.push(this.parseStatement());
    }
    
    this.consume(TokenType.RBRACE, "Expected '}' to end block.");
    // optionally consume newline after block
    this.match(TokenType.NEWLINE);

    return {
      type: 'BlockStatement',
      body: statements,
      line
    };
  }

  private parseExpressionStatement(): AST.ExpressionStatement {
    const expr = this.parseExpression();
    const line = expr.line;
    
    // Convert to AssignmentExpression if it's followed by ASSIGN
    // Since we parsed an expression, if next is `=`, it's an assignment statement.
    if (this.match(TokenType.ASSIGN)) {
      const operator = this.previous().value;
      const right = this.parseExpression();
      this.consumeStatementEnd();
      
      // We must wrap it in ExpressionStatement containing an AssignmentExpression
      // although our AST has AssignmentExpression.
      if (expr.type !== 'Identifier' && expr.type !== 'MemberExpression') {
         throw this.error(this.previous(), "Invalid assignment target.");
      }
      return {
        type: 'ExpressionStatement',
        expression: {
           type: 'AssignmentExpression',
           left: expr as AST.Identifier | AST.MemberExpression,
           operator,
           right,
           line
        },
        line
      };
    }

    this.consumeStatementEnd();
    return {
      type: 'ExpressionStatement',
      expression: expr,
      line
    };
  }

  // --- Expression Parsers ---

  private parseExpression(): AST.Expression {
    return this.parseEquality();
  }

  private parseEquality(): AST.Expression {
    let expr = this.parseComparison();

    while (this.match(TokenType.EQ_EQ) || this.match(TokenType.NOT_EQ)) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line
      };
    }

    return expr;
  }

  private parseComparison(): AST.Expression {
    let expr = this.parseTerm();

    while (this.match(TokenType.GT) || this.match(TokenType.LT)) {
      const operator = this.previous().value;
      const right = this.parseTerm();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line
      };
    }

    return expr;
  }

  private parseTerm(): AST.Expression {
    let expr = this.parseFactor();

    while (this.match(TokenType.PLUS) || this.match(TokenType.MINUS)) {
      const operator = this.previous().value;
      const right = this.parseFactor();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line
      };
    }

    return expr;
  }

  private parseFactor(): AST.Expression {
    let expr = this.parseCall();

    while (this.match(TokenType.STAR) || this.match(TokenType.SLASH)) {
      const operator = this.previous().value;
      const right = this.parseCall();
      expr = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line
      };
    }

    return expr;
  }

  private parseCall(): AST.Expression {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match(TokenType.LPAREN)) {
        expr = this.finishCall(expr);
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, "Expected property name after '.'.");
        expr = {
          type: 'MemberExpression',
          object: expr,
          property: { type: 'Identifier', name: name.value, line: name.line },
          line: expr.line
        };
      } else {
        break;
      }
    }

    return expr;
  }

  private finishCall(callee: AST.Expression): AST.CallExpression {
    const args: AST.Expression[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }
    const paren = this.consume(TokenType.RPAREN, "Expected ')' after arguments.");
    return {
      type: 'CallExpression',
      callee,
      arguments: args,
      line: paren.line
    };
  }

  private parsePrimary(): AST.Expression {
    const token = this.advance();
    switch (token.type) {
      case TokenType.NUMBER_LITERAL:
        return { type: 'NumberLiteral', value: parseFloat(token.value), line: token.line };
      case TokenType.STRING_LITERAL:
        return this.parseInterpolatedString(token.value, token.line);
      case TokenType.BOOLEAN_LITERAL:
        return { type: 'BooleanLiteral', value: token.value === 'true', line: token.line };
      case TokenType.IDENTIFIER:
        return { type: 'Identifier', name: token.value, line: token.line };
      case TokenType.THIS:
        return { type: 'Identifier', name: 'this', line: token.line };
      case TokenType.LPAREN:
        const expr = this.parseExpression();
        this.consume(TokenType.RPAREN, "Expected ')' after expression.");
        return expr;
      case TokenType.LBRACE:
        return this.parseObjectLiteral();
      case TokenType.FUNCTION:
        return this.parseFunctionExpression();
      case TokenType.LBRACKET:
        return this.parseListLiteral();
      case TokenType.MINUS:
      case TokenType.PLUS: {
        const operator = token.value;
        const argument = this.parsePrimary();
        return { type: 'UnaryExpression', operator, argument, line: token.line };
      }
      case TokenType.LT:
        return this.parseElementLiteral(token.line);
      default:
        throw this.error(token, `Unexpected token in primary expression: ${token.value} (${token.type})`);
    }
  }

  private parseFunctionExpression(): AST.FunctionExpression {
    const line = this.previous().line;
    this.consume(TokenType.LPAREN, "Expected '(' after 'function'.");
    const params: AST.Parameter[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        const id = this.consume(TokenType.IDENTIFIER, "Expected parameter name.");
        let typeAnnotation = 'any';
        if (this.match(TokenType.COLON)) {
           typeAnnotation = this.getTypeString(this.advance());
        }
        params.push({ id: { type: 'Identifier', name: id.value, line: id.line }, typeAnnotation });
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN, "Expected ')' after parameters.");
    
    let returnType = 'void';
    if (this.match(TokenType.COLON)) {
      returnType = this.getTypeString(this.advance());
    }
    
    const body = this.parseBlock();
    return { type: 'FunctionExpression', params, returnType, body, line };
  }

  private parseObjectLiteral(): AST.ObjectLiteral {
    const line = this.previous().line; // LBRACE was consumed by parsePrimary's advance() or match()
    const properties: { key: string, value: AST.Expression, line: number }[] = [];
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        const keyToken = this.consume(TokenType.IDENTIFIER, "Expected property name.");
        this.consume(TokenType.COLON, "Expected ':' after property name.");
        const value = this.parseExpression();
        properties.push({ key: keyToken.value, value, line: keyToken.line });
        
        if (!this.match(TokenType.COMMA)) break;
    }
    
    this.consume(TokenType.RBRACE, "Expected '}' after object literal.");
    return { type: 'ObjectLiteral', properties, line };
  }

  private parseListLiteral(): AST.ListLiteral {
    const line = this.previous().line; // LBRACKET consumed by parsePrimary's advance()
    const elements: AST.Expression[] = [];
    
    if (!this.check(TokenType.RBRACKET)) {
        do {
            elements.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
    }
    
    this.consume(TokenType.RBRACKET, "Expected ']' after list literal.");
    return { type: 'ListLiteral', elements, line };
  }

  private parseInterpolatedString(value: string, line: number): AST.Expression {
    const parts = value.split(/\{([^}]+)\}/g);
    
    if (parts.length === 1) {
        return { type: 'StringLiteral', value: parts[0], line };
    }
    
    let expr: AST.Expression = { type: 'StringLiteral', value: parts[0], line };
    
    for (let i = 1; i < parts.length; i += 2) {
        const innerSource = parts[i];
        const strPart = parts[i+1];
        
        // Parse the inner expression
        const innerLexer = new (require('./lexer').Lexer)(innerSource);
        const innerTokens = innerLexer.tokenize();
        const innerParser = new Parser(innerTokens);
        const innerExpr = innerParser.parseExpression();

        expr = {
            type: 'BinaryExpression',
            left: expr,
            operator: '+',
            right: innerExpr,
            line
        };
        
        if (strPart) {
            expr = {
                type: 'BinaryExpression',
                left: expr,
                operator: '+',
                right: { type: 'StringLiteral', value: strPart, line },
                line
            };
        }
    }
    return expr;
  }

  private parseElementLiteral(line: number): AST.ElementLiteral {
    let tagToken = this.peek();
    if (tagToken.type !== TokenType.IDENTIFIER && !this.isKeywordToken(tagToken.type)) {
       throw this.error(tagToken, "Expected tag name after '<'.");
    }
    this.advance();
    const tag = tagToken.value;
    const attributes: Record<string, AST.Expression> = {};

    while (!this.check(TokenType.GT) && !this.check(TokenType.SLASH) && !this.isAtEnd()) {
      if (this.match(TokenType.NEWLINE)) continue;
      
      let attrToken = this.peek();
      if (attrToken.type !== TokenType.IDENTIFIER && !this.isKeywordToken(attrToken.type)) {
         throw this.error(attrToken, "Expected attribute name.");
      }
      this.advance();
      let attrNameValue = attrToken.value;
      
      let attrValue: AST.Expression = { type: 'BooleanLiteral', value: true, line: attrToken.line };
      if (this.match(TokenType.ASSIGN)) {
        if (this.match(TokenType.STRING_LITERAL)) {
          attrValue = { type: 'StringLiteral', value: this.previous().value, line: this.previous().line };
        } else if (this.match(TokenType.LBRACE)) {
          attrValue = this.parseExpression();
          this.consume(TokenType.RBRACE, "Expected '}' after attribute expression.");
        } else if (this.match(TokenType.NUMBER_LITERAL)) {
          attrValue = { type: 'NumberLiteral', value: parseFloat(this.previous().value), line: this.previous().line };
        } else {
          throw this.error(this.peek(), "Expected string, number, or {expression} for attribute value.");
        }
      }
      attributes[attrNameValue] = attrValue;
    }

    const isSelfClosing = this.match(TokenType.SLASH);
    this.consume(TokenType.GT, isSelfClosing ? "Expected '>' after '/'." : "Expected '>' after tag name.");

    const children: AST.Expression[] = [];

    if (!isSelfClosing) {
      let textBuffer = "";
      let textLine = line;

      while (!this.isAtEnd()) {
         if (this.check(TokenType.LT) && this.peek(1).type === TokenType.SLASH) {
            break;
         }

         if (this.check(TokenType.LT)) {
            if (textBuffer.trim().length > 0) {
              children.push({ type: 'StringLiteral', value: textBuffer.trim(), line: textLine });
              textBuffer = "";
            }
            this.advance(); // consume `<`
            children.push(this.parseElementLiteral(this.previous().line));
         } else if (this.match(TokenType.LBRACE)) {
            if (textBuffer.trim().length > 0) {
              children.push({ type: 'StringLiteral', value: textBuffer.trim(), line: textLine });
              textBuffer = "";
            }
            children.push(this.parseExpression());
            this.consume(TokenType.RBRACE, "Expected '}' after expression.");
         } else {
            const token = this.advance();
            if (textBuffer === "") textLine = token.line;
            textBuffer += (token.leadingSpace || "") + token.value;
         }
      }

      if (textBuffer.trim().length > 0) {
         children.push({ type: 'StringLiteral', value: textBuffer.trim(), line: textLine });
      }

      this.consume(TokenType.LT, "Expected '<' for closing tag.");
      this.consume(TokenType.SLASH, "Expected '/' for closing tag.");
      
      let closeTagToken = this.peek();
      if (closeTagToken.type !== TokenType.IDENTIFIER && !this.isKeywordToken(closeTagToken.type)) {
          throw this.error(closeTagToken, "Expected closing tag name.");
      }
      this.advance();
      if (closeTagToken.value !== tag) {
          throw this.error(closeTagToken, `Expected closing tag '</${tag}>', but got '</${closeTagToken.value}>'.`);
      }
      this.consume(TokenType.GT, "Expected '>' after closing tag.");
    }

    return {
      type: 'ElementLiteral',
      tag,
      attributes,
      children,
      line
    };
  }

  // --- Utilities ---
  
  private isKeywordToken(type: TokenType): boolean {
     return type.startsWith('TYPE_') || [
        TokenType.IF, TokenType.ELSE, TokenType.WHILE,
        TokenType.FOR, TokenType.IN, TokenType.RETURN, TokenType.FUNCTION, 
        TokenType.CLASS, TokenType.THIS, 
        TokenType.IMPORT, TokenType.EXPORT, TokenType.OBSERVE, TokenType.AS
     ].includes(type);
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(offset: number = 0): Token {
    return this.tokens[this.current + offset];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(this.peek(), message);
  }

  private consumeStatementEnd() {
    // statement end is either NEWLINE, EOF, or the end of a block '}'
    if (this.isAtEnd()) return;
    if (this.check(TokenType.RBRACE)) return;
    this.consume(TokenType.NEWLINE, "Expected newline to end statement.");
  }

  private error(token: Token, message: string): Error {
    return new Error(`[Line ${token.line}] Error at '${token.value}': ${message}`);
  }

  private getTypeString(token: Token): string {
    switch (token.type) {
      case TokenType.TYPE_NUM: return 'num';
      case TokenType.TYPE_STR: return 'str';
      case TokenType.TYPE_BOOL: return 'bool';
      case TokenType.TYPE_LIST: return 'list';
      case TokenType.TYPE_OBJ: return 'obj';
      case TokenType.TYPE_ELEMENT: return 'element';
      case TokenType.IDENTIFIER: return token.value;
      default:
        throw new Error(`Unknown type token: ${token.type} at line ${token.line}`);
    }
  }

  private parseClassDeclaration(): AST.ClassDeclaration {
    const line = this.previous().line;
    const id = this.consume(TokenType.IDENTIFIER, "Expected class name.");
    this.consume(TokenType.LBRACE, "Expected '{' before class body.");

    const members: AST.ClassMember[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      while (this.match(TokenType.NEWLINE)); // ignore newlines between members
      if (this.check(TokenType.RBRACE)) break;

      if (this.match(TokenType.FUNCTION)) {
        members.push(this.parseClassMethod());
      } else if (this.check(TokenType.IDENTIFIER)) {
        members.push(this.parseClassProperty());
      } else {
        throw new Error(`Unexpected token in class body: ${this.peek().value} at line ${this.peek().line}`);
      }
    }

    this.consume(TokenType.RBRACE, "Expected '}' after class body.");
    return {
      type: 'ClassDeclaration',
      id: { type: 'Identifier', name: id.value, line: id.line },
      members,
      line
    };
  }

  private parseClassProperty(): AST.ClassProperty {
    const id = this.consume(TokenType.IDENTIFIER, "Expected property name.");
    const line = id.line;
    let typeAnnotation = null;

    if (this.match(TokenType.COLON)) {
      const typeToken = this.advance();
      typeAnnotation = this.getTypeString(typeToken);
    }

    let init = null;
    if (this.match(TokenType.ASSIGN)) {
      init = this.parseExpression();
    }
    
    // In class body, properties can end with newline or }
    if (!this.check(TokenType.RBRACE)) {
      this.consumeStatementEnd();
    }

    return {
      type: 'ClassProperty',
      id: { type: 'Identifier', name: id.value, line: id.line },
      typeAnnotation,
      init,
      line
    };
  }

  private parseClassMethod(): AST.ClassMethod {
    const decl = this.parseFunctionDeclaration(true);
    return {
      type: 'ClassMethod',
      id: decl.id,
      params: decl.params,
      returnType: decl.returnType,
      body: decl.body,
      line: decl.line
    };
  }
}
