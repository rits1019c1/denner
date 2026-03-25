"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
const lexer_1 = require("./lexer");
class Parser {
    tokens;
    current = 0;
    constructor(tokens) {
        this.tokens = tokens;
    }
    parse() {
        const statements = [];
        while (!this.isAtEnd()) {
            if (this.match(lexer_1.TokenType.NEWLINE))
                continue; // ignore stray newlines at top level
            statements.push(this.parseStatement());
        }
        return {
            type: 'Program',
            body: statements,
            line: 1
        };
    }
    parseStatement() {
        if (this.match(lexer_1.TokenType.EXPORT)) {
            return this.parseExportStatement();
        }
        if (this.match(lexer_1.TokenType.IMPORT)) {
            return this.parseImportStatement();
        }
        if (this.match(lexer_1.TokenType.FUNCTION)) {
            return this.parseFunctionDeclaration();
        }
        if (this.match(lexer_1.TokenType.IF)) {
            return this.parseIfStatement();
        }
        if (this.match(lexer_1.TokenType.FOR)) {
            return this.parseForStatement();
        }
        if (this.match(lexer_1.TokenType.RETURN)) {
            return this.parseReturnStatement();
        }
        // We disambiguate Variable Declaration from Assignment
        if (this.check(lexer_1.TokenType.IDENTIFIER)) {
            const isDecl = this.peek(1).type === lexer_1.TokenType.COLON;
            if (isDecl) {
                return this.parseVariableDeclaration();
            }
        }
        return this.parseExpressionStatement();
    }
    // --- Statement Parsers ---
    parseExportStatement() {
        const line = this.previous().line;
        this.consume(lexer_1.TokenType.FUNCTION, "Expected 'function' after 'export'.");
        const funcDecl = this.parseFunctionDeclaration(true);
        return {
            type: 'ExportStatement',
            declaration: funcDecl,
            line
        };
    }
    parseImportStatement() {
        const line = this.previous().line;
        const sourceToken = this.consume(lexer_1.TokenType.STRING_LITERAL, "Expected string literal after 'import'.");
        let alias = null;
        if (this.match(lexer_1.TokenType.AS)) {
            const aliasToken = this.consume(lexer_1.TokenType.IDENTIFIER, "Expected identifier after 'as'.");
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
    parseFunctionDeclaration(isAlreadyParsedFunctionKeyword = false) {
        if (!isAlreadyParsedFunctionKeyword) {
            // already matched, just get line
        }
        const line = this.previous().line;
        const idToken = this.consume(lexer_1.TokenType.IDENTIFIER, "Expected function name.");
        this.consume(lexer_1.TokenType.LPAREN, "Expected '(' after function name.");
        const params = [];
        if (!this.check(lexer_1.TokenType.RPAREN)) {
            do {
                const paramId = this.consume(lexer_1.TokenType.IDENTIFIER, "Expected parameter name.");
                this.consume(lexer_1.TokenType.COLON, "Expected ':' after parameter name.");
                const typeToken = this.advance(); // TYPE_NUM etc
                params.push({
                    id: { type: 'Identifier', name: paramId.value, line: paramId.line },
                    typeAnnotation: this.getTypeString(typeToken.type)
                });
            } while (this.match(lexer_1.TokenType.COMMA));
        }
        this.consume(lexer_1.TokenType.RPAREN, "Expected ')' after parameters.");
        this.consume(lexer_1.TokenType.COLON, "Expected ':' after function parameters for return type.");
        const returnTypeToken = this.advance();
        const body = this.parseBlock();
        return {
            type: 'FunctionDeclaration',
            id: { type: 'Identifier', name: idToken.value, line: idToken.line },
            params,
            returnType: this.getTypeString(returnTypeToken.type),
            body,
            line
        };
    }
    parseVariableDeclaration() {
        const idToken = this.consume(lexer_1.TokenType.IDENTIFIER, "Expected variable name.");
        const line = idToken.line;
        let typeAnnotation = null;
        if (this.match(lexer_1.TokenType.COLON)) {
            const typeToken = this.advance();
            typeAnnotation = this.getTypeString(typeToken.type);
        }
        this.consume(lexer_1.TokenType.ASSIGN, "Expected '=' after variable name.");
        const init = this.parseExpression();
        this.consumeStatementEnd();
        return {
            type: 'VariableDeclaration',
            id: { type: 'Identifier', name: idToken.value, line: idToken.line },
            typeAnnotation,
            init,
            line
        };
    }
    parseIfStatement() {
        const line = this.previous().line;
        const test = this.parseExpression();
        const consequent = this.parseBlock();
        let alternate = null;
        if (this.match(lexer_1.TokenType.ELSE)) {
            if (this.match(lexer_1.TokenType.IF)) {
                alternate = this.parseIfStatement();
            }
            else {
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
    parseForStatement() {
        const line = this.previous().line;
        // Parse iterators
        const iterators = [];
        iterators.push({ type: 'Identifier', name: this.consume(lexer_1.TokenType.IDENTIFIER, "Expected identifier in for loop.").value, line });
        if (this.match(lexer_1.TokenType.COMMA)) {
            iterators.push({ type: 'Identifier', name: this.consume(lexer_1.TokenType.IDENTIFIER, "Expected second identifier in for loop.").value, line });
        }
        this.consume(lexer_1.TokenType.IN, "Expected 'in' after for loop identifiers.");
        // Next could be a range (1..3) or an iterable expression.
        // Let's parse an expression:
        const exprOrRangeStart = this.parseExpression();
        // Check if it's a range
        if (this.match(lexer_1.TokenType.DOT_DOT)) {
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
        }
        else {
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
    parseReturnStatement() {
        const line = this.previous().line;
        const argument = this.parseExpression();
        this.consumeStatementEnd();
        return {
            type: 'ReturnStatement',
            argument,
            line
        };
    }
    parseBlock() {
        const line = this.peek().line;
        this.consume(lexer_1.TokenType.LBRACE, "Expected '{' to start block.");
        const statements = [];
        while (!this.check(lexer_1.TokenType.RBRACE) && !this.isAtEnd()) {
            if (this.match(lexer_1.TokenType.NEWLINE))
                continue;
            statements.push(this.parseStatement());
        }
        this.consume(lexer_1.TokenType.RBRACE, "Expected '}' to end block.");
        // optionally consume newline after block
        this.match(lexer_1.TokenType.NEWLINE);
        return {
            type: 'BlockStatement',
            body: statements,
            line
        };
    }
    parseExpressionStatement() {
        const expr = this.parseExpression();
        const line = expr.line;
        // Convert to AssignmentExpression if it's followed by ASSIGN
        // Since we parsed an expression, if next is `=`, it's an assignment statement.
        if (this.match(lexer_1.TokenType.ASSIGN)) {
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
                    left: expr,
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
    parseExpression() {
        return this.parseEquality();
    }
    parseEquality() {
        let expr = this.parseComparison();
        while (this.match(lexer_1.TokenType.EQ_EQ) || this.match(lexer_1.TokenType.NOT_EQ)) {
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
    parseComparison() {
        let expr = this.parseTerm();
        while (this.match(lexer_1.TokenType.GT) || this.match(lexer_1.TokenType.LT)) {
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
    parseTerm() {
        let expr = this.parseFactor();
        while (this.match(lexer_1.TokenType.PLUS) || this.match(lexer_1.TokenType.MINUS)) {
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
    parseFactor() {
        let expr = this.parseCall();
        while (this.match(lexer_1.TokenType.STAR) || this.match(lexer_1.TokenType.SLASH)) {
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
    parseCall() {
        let expr = this.parsePrimary();
        while (true) {
            if (this.match(lexer_1.TokenType.LPAREN)) {
                expr = this.finishCall(expr);
            }
            else if (this.match(lexer_1.TokenType.DOT)) {
                const name = this.consume(lexer_1.TokenType.IDENTIFIER, "Expected property name after '.'.");
                expr = {
                    type: 'MemberExpression',
                    object: expr,
                    property: { type: 'Identifier', name: name.value, line: name.line },
                    line: expr.line
                };
            }
            else {
                break;
            }
        }
        return expr;
    }
    finishCall(callee) {
        const args = [];
        if (!this.check(lexer_1.TokenType.RPAREN)) {
            do {
                args.push(this.parseExpression());
            } while (this.match(lexer_1.TokenType.COMMA));
        }
        const paren = this.consume(lexer_1.TokenType.RPAREN, "Expected ')' after arguments.");
        return {
            type: 'CallExpression',
            callee,
            arguments: args,
            line: paren.line
        };
    }
    parsePrimary() {
        const token = this.advance();
        switch (token.type) {
            case lexer_1.TokenType.NUMBER_LITERAL:
                return { type: 'NumberLiteral', value: parseFloat(token.value), line: token.line };
            case lexer_1.TokenType.STRING_LITERAL:
                return { type: 'StringLiteral', value: token.value, line: token.line };
            case lexer_1.TokenType.BOOLEAN_LITERAL:
                return { type: 'BooleanLiteral', value: token.value === 'true', line: token.line };
            case lexer_1.TokenType.IDENTIFIER:
                return { type: 'Identifier', name: token.value, line: token.line };
            case lexer_1.TokenType.LPAREN:
                const expr = this.parseExpression();
                this.consume(lexer_1.TokenType.RPAREN, "Expected ')' after expression.");
                return expr;
            default:
                throw this.error(token, `Unexpected token in primary expression: ${token.value} (${token.type})`);
        }
    }
    // --- Utilities ---
    match(...types) {
        for (const type of types) {
            if (this.check(type)) {
                this.advance();
                return true;
            }
        }
        return false;
    }
    check(type) {
        if (this.isAtEnd())
            return false;
        return this.peek().type === type;
    }
    advance() {
        if (!this.isAtEnd())
            this.current++;
        return this.previous();
    }
    isAtEnd() {
        return this.peek().type === lexer_1.TokenType.EOF;
    }
    peek(offset = 0) {
        return this.tokens[this.current + offset];
    }
    previous() {
        return this.tokens[this.current - 1];
    }
    consume(type, message) {
        if (this.check(type))
            return this.advance();
        throw this.error(this.peek(), message);
    }
    consumeStatementEnd() {
        // statement end is either NEWLINE, EOF, or the end of a block '}'
        if (this.isAtEnd())
            return;
        if (this.check(lexer_1.TokenType.RBRACE))
            return;
        this.consume(lexer_1.TokenType.NEWLINE, "Expected newline to end statement.");
    }
    error(token, message) {
        return new Error(`[Line ${token.line}] Error at '${token.value}': ${message}`);
    }
    getTypeString(type) {
        switch (type) {
            case lexer_1.TokenType.TYPE_NUM: return 'num';
            case lexer_1.TokenType.TYPE_STR: return 'str';
            case lexer_1.TokenType.TYPE_BOOL: return 'bool';
            case lexer_1.TokenType.TYPE_LIST: return 'list';
            case lexer_1.TokenType.TYPE_OBJ: return 'obj';
            default:
                throw new Error(`Unknown type token: ${type}`);
        }
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map