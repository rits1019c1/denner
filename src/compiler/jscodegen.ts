import * as AST from './ast';

export class JSCodeGenerator {
  private indentLevel: number = 0;
  private output: string = '';
  public observedVars: Set<string> = new Set();
  private classNames: Set<string> = new Set();

  constructor(private ast: AST.Program) {
    for (const stmt of ast.body) {
      if (stmt.type === 'ClassDeclaration') {
        this.classNames.add((stmt as AST.ClassDeclaration).id.name);
      }
    }
  }

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

  public generatePackage(): { functions: Record<string, string>, main: string, state: string[] } {
    let functions: Record<string, string> = {};
    let mainOutput = '';
    let stateOut: string[] = [];

    // Temporarily hijack emit
    const originalEmit = this.emit;
    
    for (const stmt of this.ast.body) {
      if (stmt.type === 'ImportStatement') continue;
      
      let targetStmt = stmt;
      if (stmt.type === 'ExportStatement') {
         targetStmt = (stmt as AST.ExportStatement).declaration;
      }

      this.output = '';
      this.indentLevel = 0;
      
      if (targetStmt.type === 'FunctionDeclaration') {
        const decl = targetStmt as AST.FunctionDeclaration;
        this.generateStatement(targetStmt);
        functions[decl.id.name] = this.output;
      } else if (targetStmt.type === 'VariableDeclaration' && (targetStmt as AST.VariableDeclaration).isObserved) {
        const decl = targetStmt as AST.VariableDeclaration;
        this.generateStatement(targetStmt); // Adds to observedVars
        stateOut.push(decl.id.name);
        mainOutput += this.output;
      } else {
        this.generateStatement(targetStmt);
        mainOutput += this.output;
      }
    }
    
    this.output = mainOutput;
    
    return { functions, main: mainOutput, state: stateOut };
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
        if (decl.isObserved) {
            this.observedVars.add(decl.id.name);
            this.emit(`denner_state.${decl.id.name} = ${init};`);
        } else {
            this.emit(`let ${decl.id.name} = ${init};`);
        }
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
      case 'WhileStatement': {
        const whileStmt = stmt as AST.WhileStatement;
        const test = this.generateExpression(whileStmt.test);
        this.emit(`while (${test}) {`);
        this.indent();
        whileStmt.body.body.forEach(s => this.generateStatement(s));
        this.dedent();
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
        for (const s of forIn.body.body) this.generateStatement(s);
        this.dedent();
        this.emit(`}`);
        break;
      }
      case 'ClassDeclaration': {
        const decl = stmt as AST.ClassDeclaration;
        this.emit(`class ${decl.id.name} {`);
        this.indent();
        for (const member of decl.members) {
          if (member.type === 'ClassProperty') {
            const prop = member as AST.ClassProperty;
            const init = prop.init ? ` = ${this.generateExpression(prop.init)}` : '';
            this.emit(`${prop.id.name}${init};`);
          } else if (member.type === 'ClassMethod') {
            const method = member as AST.ClassMethod;
            const params = method.params.map(p => p.id.name).join(', ');
            this.emit(`${method.id.name}(${params}) {`);
            this.indent();
            for (const s of method.body.body) this.generateStatement(s);
            this.dedent();
            this.emit(`}`);
          }
        }
        this.dedent();
        this.emit(`}`);
        this.emit('');
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
      case 'Identifier': {
        const name = (expr as AST.Identifier).name;
        if (this.observedVars.has(name)) return `denner_state.${name}`;
        return name;
      }
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
          const name = (assign.left as AST.Identifier).name;
          if (this.observedVars.has(name)) {
              return `denner_state.${name} = ${this.generateExpression(assign.right)}`;
          }
          const prefix = assign.isDeclaration ? `let ` : '';
          return `${prefix}${name} = ${this.generateExpression(assign.right)}`;
        }
        // MemberExpression left side (e.g. list[i] = ...) — use full expression
        const leftStr = this.generateExpression(assign.left);
        return `${leftStr} = ${this.generateExpression(assign.right)}`;
      }
      case 'CallExpression': {
        const call = expr as AST.CallExpression;
        const args = call.arguments.map((a: AST.Expression) => this.generateExpression(a)).join(', ');

        if (call.callee.type === 'Identifier') {
          const calleeId = (call.callee as AST.Identifier).name;
          if (this.classNames.has(calleeId)) {
            return `new ${calleeId}(${args})`;
          }
        }

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
              if (objName === 'net' || (objName === 'cli' && (propName === 'input' || propName === 'get_key')) || (objName === 'gui' && propName === 'loop')) {
                return `(await ${callStr})`;
              }
              return callStr;
            }
            
            if (objName === 'string') {
              const strMethods: Record<string, string> = {
                'replace': 'denner_string_replace',
                'split': 'denner_string_split',
                'trim': 'denner_string_trim',
                'length': 'denner_string_length',
                'upper': 'denner_string_upper',
                'lower': 'denner_string_lower',
                'startswith': 'denner_string_starts',
                'endswith': 'denner_string_ends',
                'includes': 'denner_string_includes',
                'indexof': 'denner_string_indexof',
                'substr': 'denner_string_substr',
                'substring': 'denner_string_substring',
                'charat': 'denner_string_charat',
                'repeat': 'denner_string_repeat',
                'padstart': 'denner_string_padstart',
                'padend': 'denner_string_padend',
                'starts': 'denner_string_starts',
                'ends': 'denner_string_ends'
              };
              if (strMethods[propName]) {
                return `${strMethods[propName]}(${args})`;
              }
            }
          } else {
              // Method call on an object (e.g. rect.enablePhysics())
              const obj = this.generateExpression(mem.object);
              const prop = mem.property.name;
              return `${obj}.${prop}(${args})`;
          }
        }

        return `${this.generateExpression(call.callee)}(${args})`;
      }
      case 'MemberExpression': {
        const mem = expr as AST.MemberExpression;
        return `${this.generateExpression(mem.object)}.${mem.property.name}`;
      }
      case 'ObjectLiteral': {
        const obj = expr as AST.ObjectLiteral;
        const props = obj.properties.map(p => `${p.key}: ${this.generateExpression(p.value)}`).join(', ');
        return `{ ${props} }`;
      }
      case 'FunctionExpression': {
        const func = expr as AST.FunctionExpression;
        const params = func.params.map(p => p.id.name).join(', ');
        const subGen = new JSCodeGenerator({ type: 'Program', body: func.body.body, line: func.line } as any);
        this.observedVars.forEach(v => subGen.observedVars.add(v));
        this.classNames.forEach(v => subGen.classNames.add(v));
        const body = subGen.generate().split('\n').map(l => '  ' + l).join('\n');
        return `function(${params}) {\n${body}\n}`;
      }
      case 'ListLiteral': {
        const list = expr as AST.ListLiteral;
        const elements = list.elements.map(e => this.generateExpression(e)).join(', ');
        return `[${elements}]`;
      }
      case 'UnaryExpression': {
        const un = expr as AST.UnaryExpression;
        return `(${un.operator}${this.generateExpression(un.argument)})`;
      }
      case 'ElementLiteral': {
        const el = expr as AST.ElementLiteral;
        const attrsStr = Object.entries(el.attributes)
            .map(([k, v]) => `'${k}': ${this.generateExpression(v)}`).join(', ');
        const chillStr = el.children.map(c => this.generateExpression(c)).join(', ');
        return `new DennerElement("${el.tag}", {${attrsStr}}, [${chillStr}])`;
      }
    }
    throw new Error(`Unknown expression type: ${(expr as any).type}`);
  }
}
