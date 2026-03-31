import * as AST from './ast';

export class TypeError extends Error {
  constructor(message: string, public line: number) {
    super(`[Line ${line}] TypeError: ${message}`);
  }
}

interface Env {
  parent?: Env;
  variables: Map<string, string>; // name -> type string
  functions: Map<string, { returnType: string; params: string[] }>;
}

interface ClassEntry {
  id: string;
  properties: Map<string, string>;
  methods: Map<string, { returnType: string; params: string[] }>;
}

export class TypeChecker {
  private ast: AST.Program;
  private currentEnv: Env;
  private classes: Map<string, ClassEntry> = new Map();

  constructor(ast: AST.Program) {
    this.ast = ast;
    // Base environment with built-ins
    this.currentEnv = {
      variables: new Map([
        ['log', 'builtin'],
        ['gui', 'builtin'],
        ['os', 'builtin'],
        ['path', 'builtin'],
        ['net', 'builtin'],
        ['cli', 'builtin'],
        ['string', 'builtin']
      ]),
      functions: new Map()
    };
  }

  public check() {
    this.checkProgram(this.ast);
  }

  private pushEnv() {
    this.currentEnv = {
      parent: this.currentEnv,
      variables: new Map(),
      functions: new Map()
    };
  }

  private popEnv() {
    if (this.currentEnv.parent) {
      this.currentEnv = this.currentEnv.parent;
    }
  }

  private defineVar(name: string, type: string, line: number) {
    if (this.currentEnv.variables.has(name)) {
      throw new TypeError(`Variable '${name}' is already defined.`, line);
    }
    this.currentEnv.variables.set(name, type);
  }

  private lookupVar(name: string, line: number): string {
    let env: Env | undefined = this.currentEnv;
    while (env) {
      if (env.variables.has(name)) return env.variables.get(name)!;
      env = env.parent;
    }
    throw new TypeError(`Undefined variable '${name}'.`, line);
  }

  private defineFunc(name: string, returnType: string, params: string[], line: number) {
    if (this.currentEnv.functions.has(name)) {
      throw new TypeError(`Function '${name}' is already defined.`, line);
    }
    this.currentEnv.functions.set(name, { returnType, params });
  }

  private lookupFunc(name: string, line: number): { returnType: string; params: string[] } {
    let env: Env | undefined = this.currentEnv;
    while (env) {
      if (env.functions.has(name)) return env.functions.get(name)!;
      env = env.parent;
    }
    throw new TypeError(`Undefined function '${name}'.`, line);
  }

  private checkProgram(node: AST.Program) {
    // Pass 1: Register all function declarations so they can be called before definition
    for (const stmt of node.body) {
      if (stmt.type === 'FunctionDeclaration') {
        const decl = stmt as AST.FunctionDeclaration;
        const paramTypes = decl.params.map(p => p.typeAnnotation);
        this.defineFunc(decl.id.name, decl.returnType, paramTypes, decl.line);
      } else if (stmt.type === 'ExportStatement') {
        const decl = (stmt as AST.ExportStatement).declaration;
        if (decl.type === 'FunctionDeclaration') {
          const paramTypes = decl.params.map(p => p.typeAnnotation);
          this.defineFunc(decl.id.name, decl.returnType, paramTypes, decl.line);
        }
      } else if (stmt.type === 'ClassDeclaration') {
        const decl = stmt as AST.ClassDeclaration;
        this.registerClass(decl);
      }
    }

    // Pass 2: Check statements
    for (const stmt of node.body) {
      if (stmt.type === 'FunctionDeclaration') {
        this.checkFunctionDeclarationBody(stmt as AST.FunctionDeclaration);
      } else if (stmt.type === 'ExportStatement') {
        const decl = (stmt as AST.ExportStatement).declaration;
        if (decl.type === 'FunctionDeclaration') {
          this.checkFunctionDeclarationBody(decl);
        } else {
          this.checkVariableDeclaration(decl);
        }
      } else if (stmt.type === 'ClassDeclaration') {
        this.checkClassDeclaration(stmt as AST.ClassDeclaration);
      } else {
        this.checkStatement(stmt, null); // Top level has no expected return
      }
    }
  }

  private checkStatement(stmt: AST.Statement, expectedReturnType: string | null) {
    switch (stmt.type) {
      case 'VariableDeclaration':
        this.checkVariableDeclaration(stmt as AST.VariableDeclaration);
        break;
      // Note: Function and Export statement checking is now handled directly in Pass 2 of checkProgram
      // to avoid redundant checks, but they can remain here if nested in blocks.
      // Denner doesn't support nested functions according to specs, but we can safely skip if called here.
      case 'ExpressionStatement':
        this.checkExpression((stmt as AST.ExpressionStatement).expression);
        break;
      case 'BlockStatement':
        this.pushEnv();
        for (const s of (stmt as AST.BlockStatement).body) {
          this.checkStatement(s, expectedReturnType);
        }
        this.popEnv();
        break;
      case 'IfStatement':
        const ifStmt = stmt as AST.IfStatement;
        const testType = this.checkExpression(ifStmt.test);
        if (testType !== 'bool') {
          throw new TypeError(`If condition must be a boolean, got ${testType}.`, ifStmt.line);
        }
        this.checkStatement(ifStmt.consequent, expectedReturnType);
        if (ifStmt.alternate) {
          this.checkStatement(ifStmt.alternate, expectedReturnType);
        }
        break;
      case 'ForRangeStatement':
        const forRange = stmt as AST.ForRangeStatement;
        const startType = this.checkExpression(forRange.start);
        const endType = this.checkExpression(forRange.end);
        if (startType !== 'num' || endType !== 'num') {
          throw new TypeError(`Range loop requires 'num' for start and end, got ${startType} and ${endType}.`, forRange.line);
        }
        this.pushEnv();
        this.defineVar(forRange.iterator.name, 'num', forRange.line);
        this.checkStatement(forRange.body, expectedReturnType);
        this.popEnv();
        break;
      case 'ForInStatement':
        // Simplified check
        break;
      case 'ClassDeclaration':
        this.checkClassDeclaration(stmt as AST.ClassDeclaration);
        break;
        const forIn = stmt as AST.ForInStatement;
        const iterType = this.checkExpression(forIn.iterable);
        // Lists/Objects handling: in denner, arrays give items (type any), objects give keys (str).
        // Since generics are out, we will map items to 'any' conceptually, but we can't type check tightly inside `for in` yet.
        this.pushEnv();
        if (iterType === 'list') {
          forIn.iterators.forEach(id => this.defineVar(id.name, 'unknown', id.line)); // or 'num'/'str' if we had generics
        } else if (iterType === 'obj') {
          forIn.iterators.forEach(id => this.defineVar(id.name, 'unknown', id.line));
        } else {
          throw new TypeError(`For-in loop requires 'list' or 'obj', got ${iterType}.`, forIn.line);
        }
        this.checkStatement(forIn.body, expectedReturnType);
        this.popEnv();
        break;
      case 'ReturnStatement':
        if (!expectedReturnType) {
          throw new TypeError(`Return statement not inside a function.`, stmt.line);
        }
        const retStmt = stmt as AST.ReturnStatement;
        const actualType = this.checkExpression(retStmt.argument);
        if (actualType !== expectedReturnType) {
          throw new TypeError(`Expected return type ${expectedReturnType}, but got ${actualType}.`, retStmt.line);
        }
        break;
      case 'ImportStatement': {
        // Register the import alias as a variable of type 'module' so uses don't raise Undefined variable
        const imp = stmt as AST.ImportStatement;
        if (imp.alias) {
          // Don't throw if already defined (duplicate import)
          if (!this.currentEnv.variables.has(imp.alias)) {
            this.currentEnv.variables.set(imp.alias, 'module');
          }
        }
        break;
      }
      case 'ExportStatement': {
        const decl = (stmt as AST.ExportStatement).declaration;
        if (decl.type === 'FunctionDeclaration') {
          this.checkFunctionDeclarationBody(decl);
        } else {
          this.checkVariableDeclaration(decl);
        }
        break;
      }
    }
  }

  private checkVariableDeclaration(decl: AST.VariableDeclaration) {
    const initType = this.checkExpression(decl.init);
    if (decl.typeAnnotation) {
      // Allow unknown init types (e.g. from net.get) to be assigned to any annotated type
      if (initType !== 'unknown' && decl.typeAnnotation !== initType && initType !== 'obj') {
        throw new TypeError(`Cannot assign ${initType} to variable of type ${decl.typeAnnotation}.`, decl.line);
      }
    } else {
      // Infer and mutate AST node to have precise type
      decl.typeAnnotation = initType;
    }

    this.defineVar(decl.id.name, decl.typeAnnotation, decl.line);
  }

  private checkFunctionDeclarationBody(decl: AST.FunctionDeclaration) {
    this.pushEnv();
    for (const p of decl.params) {
      this.defineVar(p.id.name, p.typeAnnotation, p.id.line);
    }

    // Check body
    for (const s of decl.body.body) {
      this.checkStatement(s, decl.returnType);
    }

    this.popEnv();
  }

  private checkExpression(expr: AST.Expression): string {
    switch (expr.type) {
      case 'NumberLiteral': return 'num';
      case 'StringLiteral': return 'str';
      case 'BooleanLiteral': return 'bool';
      case 'Identifier':
        return this.lookupVar((expr as AST.Identifier).name, expr.line);
      case 'BinaryExpression':
        return this.checkBinaryExpression(expr as AST.BinaryExpression);
      case 'AssignmentExpression':
        return this.checkAssignmentExpression(expr as AST.AssignmentExpression);
      case 'CallExpression':
        return this.checkCallExpression(expr as AST.CallExpression);
      case 'MemberExpression':
        // HACK: for basic MVP, return 'unknown' or bypass stdlib like log.print
        const mem = expr as AST.MemberExpression;
        if (mem.object.type === 'Identifier') {
            const name = (mem.object as AST.Identifier).name;
            if (['log', 'gui', 'os', 'path', 'net', 'cli', 'string'].includes(name)) {
                return 'builtin';
            }
        }
        const objType = this.checkExpression(mem.object);
        if (objType === 'builtin') {
            return 'builtin';
        }
        if (objType === 'gui_object') {
            return 'gui_method';
        }
        return 'unknown';
      case 'ObjectLiteral': return 'obj';
      case 'FunctionExpression': return 'function';
      case 'ListLiteral': return 'list';
      case 'ElementLiteral': return 'element';
      case 'UnaryExpression': {
        // Unary minus/plus — treat as num
        return 'num';
      }
    }
    throw new Error(`Unknown expression type: ${(expr as any).type}`);
  }

  private checkBinaryExpression(expr: AST.BinaryExpression): string {
    const leftType = this.checkExpression(expr.left);
    const rightType = this.checkExpression(expr.right);

    if (['+', '-', '*', '/'].includes(expr.operator)) {
      if (expr.operator === '+' && (leftType === 'str' || rightType === 'str')) {
        return 'str';
      }
      // Allow unknown/gui_method/builtin types (e.g. player.x) to pass through arithmetic
      const flexTypes = new Set(['unknown', 'gui_method', 'builtin', 'module']);
      if (flexTypes.has(leftType) || flexTypes.has(rightType)) return 'num';
      if (leftType !== 'num' || rightType !== 'num') {
        throw new TypeError(`Operator ${expr.operator} requires 'num', got ${leftType} and ${rightType}.`, expr.line);
      }
      return 'num';
    }

    if (['==', '!=', '<', '>', '<=', '>='].includes(expr.operator)) {
      // Allow unknown types (e.g. net.get return value) in comparisons
      if (leftType === 'unknown' || rightType === 'unknown') return 'bool';
      if (leftType !== rightType) {
        throw new TypeError(`Cannot compare ${leftType} with ${rightType}.`, expr.line);
      }
      return 'bool';
    }

    return 'unknown';
  }

  private checkAssignmentExpression(expr: AST.AssignmentExpression): string {
    const rightType = this.checkExpression(expr.right);
    if (expr.left.type === 'Identifier') {
      const leftId = expr.left as AST.Identifier;
      try {
        const declaredType = this.lookupVar(leftId.name, leftId.line);
        if (declaredType !== 'unknown' && declaredType !== rightType) {
          throw new TypeError(`Cannot assign type ${rightType} to variable of type ${declaredType}.`, expr.line);
        }
      } catch (e: any) {
        if (e instanceof TypeError && e.message.includes('Undefined variable')) {
          // Variable not defined, so this assignment acts as a declaration
          this.defineVar(leftId.name, rightType, leftId.line);
          expr.isDeclaration = true;
          expr.declType = rightType;
        } else {
          throw e;
        }
      }
    } else {
      // Member assignment e.g. a.b = 10 -> skipping strict type checks on objects for now
    }
    return rightType;
  }

  private checkCallExpression(expr: AST.CallExpression): string {
    if (expr.callee.type === 'Identifier') {
      const name = (expr.callee as AST.Identifier).name;
      const func = this.lookupFunc(name, expr.line);

      if (expr.arguments.length !== func.params.length) {
        throw new TypeError(`Function '${name}' expects ${func.params.length} arguments, got ${expr.arguments.length}.`, expr.line);
      }

      for (let i = 0; i < expr.arguments.length; i++) {
        const argType = this.checkExpression(expr.arguments[i]);
        if (argType !== func.params[i]) {
          throw new TypeError(`Argument ${i + 1} of '${name}' expected ${func.params[i]}, got ${argType}.`, expr.line);
        }
      }

      return func.returnType;
     } else if (expr.callee.type === 'MemberExpression') {
          const mem = expr.callee as AST.MemberExpression;
          const calleeType = this.checkExpression(mem);

          if (calleeType === 'gui_method') {
              const propName = mem.property.name;
              if (propName === 'enablePhysics') {
                  return 'gui_object'; // Returns self for chaining
              }
              if (propName === 'on') {
                  // e.g. .on('collision', func)
                  return 'gui_object';
              }
          }

          if (mem.object.type === 'Identifier') {
        const objName = (mem.object as AST.Identifier).name;
        const propName = mem.property.name;

        if (objName === 'log' && propName === 'print') {
          expr.arguments.forEach(arg => this.checkExpression(arg));
          return 'void';
        }

        if (objName === 'gui') {
          if (propName === 'setup') {
            if (expr.arguments.length !== 2) throw new TypeError(`gui.setup expects 2 arguments, got ${expr.arguments.length}.`, expr.line);
            expr.arguments.forEach(arg => { if (this.checkExpression(arg) !== 'num') throw new TypeError(`gui.setup arguments must be 'num'.`, expr.line); });
            return 'void';
          }
          if (propName === 'clear') {
            if (expr.arguments.length !== 1) throw new TypeError(`gui.clear expects 1 argument, got ${expr.arguments.length}.`, expr.line);
            if (this.checkExpression(expr.arguments[0]) !== 'str') throw new TypeError(`gui.clear argument must be 'str'.`, expr.line);
            return 'void';
          }
          if (propName === 'rect') {
            if (expr.arguments.length !== 5) throw new TypeError(`gui.rect expects 5 arguments (x, y, w, h, color), got ${expr.arguments.length}.`, expr.line);
            for (let i = 0; i < 4; i++) if (this.checkExpression(expr.arguments[i]) !== 'num') throw new TypeError(`gui.rect coordinates and size must be 'num'.`, expr.line);
            if (this.checkExpression(expr.arguments[4]) !== 'str') throw new TypeError(`gui.rect color must be 'str'.`, expr.line);
            return 'gui_object';
          }
          if (propName === 'image') {
            if (expr.arguments.length !== 5) throw new TypeError(`gui.image expects 5 arguments (url, x, y, w, h), got ${expr.arguments.length}.`, expr.line);
            if (this.checkExpression(expr.arguments[0]) !== 'str') throw new TypeError(`gui.image url must be 'str'.`, expr.line);
            for (let i = 1; i < 5; i++) if (this.checkExpression(expr.arguments[i]) !== 'num') throw new TypeError(`gui.image coordinates and size must be 'num'.`, expr.line);
            return 'gui_object';
          }
          if (propName === 'text') {
            if (expr.arguments.length !== 4) throw new TypeError(`gui.text expects 4 arguments (txt, x, y, color), got ${expr.arguments.length}.`, expr.line);
            if (this.checkExpression(expr.arguments[0]) !== 'str') throw new TypeError(`gui.text content must be 'str'.`, expr.line);
            if (this.checkExpression(expr.arguments[1]) !== 'num' || this.checkExpression(expr.arguments[2]) !== 'num') throw new TypeError(`gui.text coordinates must be 'num'.`, expr.line);
            if (this.checkExpression(expr.arguments[3]) !== 'str') throw new TypeError(`gui.text color must be 'str'.`, expr.line);
            return 'void';
          }
          if (propName === 'loop') {
            return 'void';
          }
          if (propName === 'get_last_key') {
            return 'str';
          }
        }

        const objType = this.checkExpression(mem.object);
        if (objType === 'module') {
           return 'unknown'; // Dynamic access allowed for modules
        }
        if (this.classes.has(objType)) {
          const entry = this.classes.get(objType)!;
          if (entry.properties.has(propName)) return entry.properties.get(propName)!;
          if (entry.methods.has(propName)) return entry.methods.get(propName)!.returnType;
          throw new TypeError(`Property '${propName}' does not exist on class '${objType}'.`, mem.line);
        }

        if (objName === 'cli') {
          if (propName === 'get_key') {
            return 'str';
          }
        }

        if (objName === 'string') {
          const strMethods = ['replace', 'split', 'trim', 'length', 'upper', 'lower', 'startswith', 'endswith', 'includes', 'indexof', 'substr', 'substring', 'charat', 'repeat', 'padstart', 'padend', 'starts', 'ends'];
          if (strMethods.includes(propName)) {
            expr.arguments.forEach(arg => this.checkExpression(arg));
            return propName === 'length' ? 'num' : 'str';
          }
        }
      }
    }

    return 'unknown';
  }

  private registerClass(node: AST.ClassDeclaration) {
    if (this.classes.has(node.id.name)) {
      throw new TypeError(`Class '${node.id.name}' is already defined.`, node.line);
    }
    const entry: ClassEntry = {
      id: node.id.name,
      properties: new Map(),
      methods: new Map()
    };
    for (const member of node.members) {
      if (member.type === 'ClassProperty') {
        const prop = member as AST.ClassProperty;
        entry.properties.set(prop.id.name, prop.typeAnnotation || 'unknown');
      } else if (member.type === 'ClassMethod') {
        const method = member as AST.ClassMethod;
        entry.methods.set(method.id.name, {
          returnType: method.returnType,
          params: method.params.map(p => p.typeAnnotation)
        });
      }
    }
    this.classes.set(node.id.name, entry);
    // Also define class name as a function for constructor calls
    const constructor = entry.methods.get('constructor');
    this.defineFunc(node.id.name, node.id.name, constructor ? constructor.params : [], node.line);
  }

  private checkClassDeclaration(node: AST.ClassDeclaration) {
    for (const member of node.members) {
      if (member.type === 'ClassMethod') {
        this.checkClassMethodBody(member as AST.ClassMethod, node.id.name);
      } else if (member.type === 'ClassProperty') {
        const prop = member as AST.ClassProperty;
        if (prop.init) {
          const initType = this.checkExpression(prop.init);
          if (prop.typeAnnotation && initType !== prop.typeAnnotation && initType !== 'unknown') {
            throw new TypeError(`Property '${prop.id.name}' initialization type mismatch. Expected ${prop.typeAnnotation}, got ${initType}.`, prop.line);
          }
        }
      }
    }
  }

  private checkClassMethodBody(node: AST.ClassMethod, className: string) {
    this.pushEnv();
    this.defineVar('this', className, node.line);
    for (const param of node.params) {
      this.defineVar(param.id.name, param.typeAnnotation, node.line);
    }
    this.checkStatement(node.body, node.returnType);
    this.popEnv();
  }
}
