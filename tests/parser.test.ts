import { Lexer } from '../src/compiler/lexer';
import { Parser } from '../src/compiler/parser';
import * as AST from '../src/compiler/ast';

describe('Parser', () => {
  it('should parse variable declarations', () => {
    const source = `a:num = 10\n b = 20`;
    const tokens = new Lexer(source).tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.type).toBe('Program');
    expect(ast.body.length).toBe(2);

    const decl1 = ast.body[0] as AST.VariableDeclaration;
    expect(decl1.type).toBe('VariableDeclaration');
    expect(decl1.id.name).toBe('a');
    expect(decl1.typeAnnotation).toBe('num');
    expect((decl1.init as AST.NumberLiteral).value).toBe(10);

    const exprStmt = ast.body[1] as AST.ExpressionStatement;
    expect(exprStmt.type).toBe('ExpressionStatement');
    const assignExpr = exprStmt.expression as AST.AssignmentExpression;
    expect(assignExpr.type).toBe('AssignmentExpression');
    expect((assignExpr.left as AST.Identifier).name).toBe('b');
    expect((assignExpr.right as AST.NumberLiteral).value).toBe(20);
  });

  it('should parse functions', () => {
    const source = `function add(x:num, y:num):num { return x + y }`;
    const tokens = new Lexer(source).tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const func = ast.body[0] as AST.FunctionDeclaration;
    expect(func.type).toBe('FunctionDeclaration');
    expect(func.id.name).toBe('add');
    expect(func.params.length).toBe(2);
    expect(func.returnType).toBe('num');
    
    const retStmt = func.body.body[0] as AST.ReturnStatement;
    expect(retStmt.type).toBe('ReturnStatement');
    const binExpr = retStmt.argument as AST.BinaryExpression;
    expect(binExpr.operator).toBe('+');
    expect((binExpr.left as AST.Identifier).name).toBe('x');
    expect((binExpr.right as AST.Identifier).name).toBe('y');
  });

  it('should parse loops', () => {
    const source = `for i in 1..3 {\n log.print(i) \n}`;
    const tokens = new Lexer(source).tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    const forLoop = ast.body[0] as AST.ForRangeStatement;
    expect(forLoop.type).toBe('ForRangeStatement');
    expect(forLoop.iterator.name).toBe('i');
    expect((forLoop.start as AST.NumberLiteral).value).toBe(1);
    expect((forLoop.end as AST.NumberLiteral).value).toBe(3);
    
    const callExprStmt = forLoop.body.body[0] as AST.ExpressionStatement;
    const callExpr = callExprStmt.expression as AST.CallExpression;
    expect(callExpr.type).toBe('CallExpression');
    const member = callExpr.callee as AST.MemberExpression;
    expect((member.object as AST.Identifier).name).toBe('log');
    expect((member.property as AST.Identifier).name).toBe('print');
    
    expect((callExpr.arguments[0] as AST.Identifier).name).toBe('i');
  });
  
  it('should parse exports and imports', () => {
    const source = `import "lib.den" as lib\n export function sayHi():str { return "Hi" }`;
    const tokens = new Lexer(source).tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.body[0].type).toBe('ImportStatement');
    expect((ast.body[0] as AST.ImportStatement).source).toBe('lib.den');
    expect((ast.body[0] as AST.ImportStatement).alias).toBe('lib');

    expect(ast.body[1].type).toBe('ExportStatement');
    expect((ast.body[1] as AST.ExportStatement).declaration.id.name).toBe('sayHi');
  });
});
