import * as AST from './ast';

export class JSCodeGenerator {
  private indentLevel: number = 0;
  private output: string = '';

  constructor(private ast: AST.Program) {}

  public generate(): string {
    for (const stmt of this.ast.body) {
      if (stmt.type !== 'ImportStatement' && stmt.type !== 'ExportStatement') {
         this.generateStatement(stmt);
      } else if (stmt.type === 'ExportStatement') {
         this.generateStatement((stmt as AST.ExportStatement).declaration);
      }
    }
    return this.output;
  }

  private emit(line: string) {
    if (line === '') {
       this.output += '\n';
    } else {
       this.output += '    '.repeat(this.indentLevel) + line + '\n';
    }
  }

  private indent() { this.indentLevel++; }
  private dedent() { this.indentLevel--; }

  private generateStatement(stmt: AST.Statement) {
    switch (stmt.type) {
      case 'VariableDeclaration': {
        const decl = stmt as AST.VariableDeclaration;
        const init = this.generateExpression(decl.init);
        this.emit(`let ${decl.id.name} = ${init};`);
        break;
      }
      case 'FunctionDeclaration': {
        const decl = stmt as AST.FunctionDeclaration;
        const params = decl.params.map(p => p.id.name).join(', ');
        this.emit(`function ${decl.id.name}(${params}) {`);
        this.indent();
        decl.body.body.forEach(s => this.generateStatement(s));
        this.dedent();
        this.emit(`}`);
        this.emit('');
        break;
      }
      case 'ExpressionStatement': {
        const expr = (stmt as AST.ExpressionStatement).expression;
        this.emit(`${this.generateExpression(expr)};`);
        break;
      }
      case 'IfStatement': {
        const ifStmt = stmt as AST.IfStatement;
        this.emit(`if (${this.generateExpression(ifStmt.test)}) {`);
        this.indent();
        ifStmt.consequent.body.forEach(s => this.generateStatement(s));
        this.dedent();
        if (ifStmt.alternate) {
          if (ifStmt.alternate.type === 'IfStatement') {
             this.emit(`} else {`);
             this.indent();
             this.generateStatement(ifStmt.alternate);
             this.dedent();
          } else {
             this.emit(`} else {`);
             this.indent();
             (ifStmt.alternate as AST.BlockStatement).body.forEach(s => this.generateStatement(s));
             this.dedent();
          }
        }
        this.emit(`}`);
        break;
      }
      case 'ForRangeStatement': {
        const forRange = stmt as AST.ForRangeStatement;
        const start = this.generateExpression(forRange.start);
        const end = this.generateExpression(forRange.end);
        const iter = forRange.iterator.name;
        this.emit(`for (let ${iter} = ${start}; ${iter} < ${end}; ${iter}++) {`);
        this.indent();
        forRange.body.body.forEach(s => this.generateStatement(s));
        this.dedent();
        this.emit(`}`);
        break;
      }
      case 'ForInStatement': {
        const forIn = stmt as AST.ForInStatement;
        const iter = forIn.iterators[0].name;
        const iterable = this.generateExpression(forIn.iterable);
        this.emit(`for (let ${iter} of ${iterable}) {`);
        this.indent();
        forIn.body.body.forEach(s => this.generateStatement(s));
        this.dedent();
        this.emit(`}`);
        break;
      }
      case 'ReturnStatement': {
        const ret = stmt as AST.ReturnStatement;
        this.emit(`return ${this.generateExpression(ret.argument)};`);
        break;
      }
      case 'BlockStatement': {
         this.emit(`{`);
         this.indent();
         (stmt as AST.BlockStatement).body.forEach(s => this.generateStatement(s));
         this.dedent();
         this.emit(`}`);
         break;
      }
    }
  }

  private generateExpression(expr: AST.Expression): string {
    switch (expr.type) {
      case 'Identifier':
        return (expr as AST.Identifier).name;
      case 'NumberLiteral':
        return (expr as AST.NumberLiteral).value.toString();
      case 'StringLiteral':
        return JSON.stringify((expr as AST.StringLiteral).value);
      case 'BooleanLiteral':
        return (expr as AST.BooleanLiteral).value ? 'true' : 'false';
      case 'BinaryExpression': {
        const bin = expr as AST.BinaryExpression;
        let op = bin.operator;
        if (op === '..') throw new Error("Range operator cannot be used as a plain expression in JS");
        return `(${this.generateExpression(bin.left)} ${op} ${this.generateExpression(bin.right)})`;
      }
      case 'AssignmentExpression': {
        const assign = expr as AST.AssignmentExpression;
        if (assign.left.type === 'Identifier') {
           const prefix = assign.isDeclaration ? `let ` : '';
           return `${prefix}${(assign.left as AST.Identifier).name} = ${this.generateExpression(assign.right)}`;
        }
        const mem = assign.left as AST.MemberExpression;
        return `${mem.property.name} = ${this.generateExpression(assign.right)}`;
      }
      case 'CallExpression': {
        const call = expr as AST.CallExpression;
        const args = call.arguments.map((a: AST.Expression) => this.generateExpression(a)).join(', ');
        
        if (call.callee.type === 'MemberExpression') {
           const mem = call.callee as AST.MemberExpression;
           if (mem.object.type === 'Identifier') {
               const objName = (mem.object as AST.Identifier).name;
               const propName = mem.property.name;
               
               if (objName === 'log' && propName === 'print') {
                  if (call.arguments.length === 0) return `denner_system_print("")`;
                  return `denner_system_print(${args})`;
               }
               
               if (['os', 'path', 'net', 'cli', 'gui'].includes(objName)) {
                  let callStr = `denner.${objName}.${propName}(${args})`;
                  if (objName === 'net' || (objName === 'cli' && propName === 'input')) {
                      return `(await ${callStr})`;
                  }
                  return callStr;
               }
           }
        }
        
        return `${this.generateExpression(call.callee)}(${args})`;
      }
      case 'MemberExpression': {
        const mem = expr as AST.MemberExpression;
        return mem.property.name;
      }
    }
    throw new Error(`Unknown expression type: ${(expr as any).type}`);
  }
}
