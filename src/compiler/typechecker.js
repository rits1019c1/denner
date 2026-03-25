"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeChecker = exports.TypeError = void 0;
class TypeError extends Error {
    line;
    constructor(message, line) {
        super(`[Line ${line}] TypeError: ${message}`);
        this.line = line;
    }
}
exports.TypeError = TypeError;
class TypeChecker {
    ast;
    currentEnv;
    constructor(ast) {
        this.ast = ast;
        // Base environment with built-ins
        this.currentEnv = {
            variables: new Map(),
            functions: new Map()
        };
        // Add log.print pseudo-built-in for now or handle via object resolution later
        // In our simplified version, log is an object maybe? Or we just special case "log.print"
        // Let's add a log "module" to variables that returns special types if needed, but for now we skip strict checking on `log.print`.
    }
    check() {
        this.checkProgram(this.ast);
    }
    pushEnv() {
        this.currentEnv = {
            parent: this.currentEnv,
            variables: new Map(),
            functions: new Map()
        };
    }
    popEnv() {
        if (this.currentEnv.parent) {
            this.currentEnv = this.currentEnv.parent;
        }
    }
    defineVar(name, type, line) {
        if (this.currentEnv.variables.has(name)) {
            throw new TypeError(`Variable '${name}' is already defined.`, line);
        }
        this.currentEnv.variables.set(name, type);
    }
    lookupVar(name, line) {
        let env = this.currentEnv;
        while (env) {
            if (env.variables.has(name))
                return env.variables.get(name);
            env = env.parent;
        }
        throw new TypeError(`Undefined variable '${name}'.`, line);
    }
    defineFunc(name, returnType, params, line) {
        if (this.currentEnv.functions.has(name)) {
            throw new TypeError(`Function '${name}' is already defined.`, line);
        }
        this.currentEnv.functions.set(name, { returnType, params });
    }
    lookupFunc(name, line) {
        let env = this.currentEnv;
        while (env) {
            if (env.functions.has(name))
                return env.functions.get(name);
            env = env.parent;
        }
        throw new TypeError(`Undefined function '${name}'.`, line);
    }
    checkProgram(node) {
        for (const stmt of node.body) {
            this.checkStatement(stmt, null); // Top level has no expected return
        }
    }
    checkStatement(stmt, expectedReturnType) {
        switch (stmt.type) {
            case 'VariableDeclaration':
                this.checkVariableDeclaration(stmt);
                break;
            case 'FunctionDeclaration':
                this.checkFunctionDeclaration(stmt);
                break;
            case 'ExpressionStatement':
                this.checkExpression(stmt.expression);
                break;
            case 'BlockStatement':
                this.pushEnv();
                for (const s of stmt.body) {
                    this.checkStatement(s, expectedReturnType);
                }
                this.popEnv();
                break;
            case 'IfStatement':
                const ifStmt = stmt;
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
                const forRange = stmt;
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
                const forIn = stmt;
                const iterType = this.checkExpression(forIn.iterable);
                // Lists/Objects handling: in denner, arrays give items (type any), objects give keys (str).
                // Since generics are out, we will map items to 'any' conceptually, but we can't type check tightly inside `for in` yet.
                this.pushEnv();
                if (iterType === 'list') {
                    forIn.iterators.forEach(id => this.defineVar(id.name, 'unknown', id.line)); // or 'num'/'str' if we had generics
                }
                else if (iterType === 'obj') {
                    forIn.iterators.forEach(id => this.defineVar(id.name, 'unknown', id.line));
                }
                else {
                    throw new TypeError(`For-in loop requires 'list' or 'obj', got ${iterType}.`, forIn.line);
                }
                this.checkStatement(forIn.body, expectedReturnType);
                this.popEnv();
                break;
            case 'ReturnStatement':
                if (!expectedReturnType) {
                    throw new TypeError(`Return statement not inside a function.`, stmt.line);
                }
                const retStmt = stmt;
                const actualType = this.checkExpression(retStmt.argument);
                if (actualType !== expectedReturnType) {
                    throw new TypeError(`Expected return type ${expectedReturnType}, but got ${actualType}.`, retStmt.line);
                }
                break;
            case 'ImportStatement':
                // Trust for now, resolution binds types later if needed
                break;
            case 'ExportStatement':
                this.checkFunctionDeclaration(stmt.declaration);
                break;
        }
    }
    checkVariableDeclaration(decl) {
        const initType = this.checkExpression(decl.init);
        if (decl.typeAnnotation) {
            if (decl.typeAnnotation !== initType) {
                throw new TypeError(`Cannot assign ${initType} to variable of type ${decl.typeAnnotation}.`, decl.line);
            }
        }
        else {
            // Infer and mutate AST node to have precise type
            decl.typeAnnotation = initType;
        }
        this.defineVar(decl.id.name, decl.typeAnnotation, decl.line);
    }
    checkFunctionDeclaration(decl) {
        const paramTypes = decl.params.map(p => p.typeAnnotation);
        this.defineFunc(decl.id.name, decl.returnType, paramTypes, decl.line);
        this.pushEnv();
        for (const p of decl.params) {
            this.defineVar(p.id.name, p.typeAnnotation, p.id.line);
        }
        // Check body
        for (const s of decl.body.body) {
            this.checkStatement(s, decl.returnType);
        }
        // Verify it actually returns? (A deeper data flow analysis. Skipping for basic typechecker)
        this.popEnv();
    }
    checkExpression(expr) {
        switch (expr.type) {
            case 'NumberLiteral': return 'num';
            case 'StringLiteral': return 'str';
            case 'BooleanLiteral': return 'bool';
            case 'Identifier':
                return this.lookupVar(expr.name, expr.line);
            case 'BinaryExpression':
                return this.checkBinaryExpression(expr);
            case 'AssignmentExpression':
                return this.checkAssignmentExpression(expr);
            case 'CallExpression':
                return this.checkCallExpression(expr);
            case 'MemberExpression':
                // HACK: for basic MVP, return 'unknown' or bypass stdlib like log.print
                const mem = expr;
                if (mem.object.type === 'Identifier' && mem.object.name === 'log') {
                    return 'builtin';
                }
                return 'unknown';
        }
        throw new Error(`Unknown expression type: ${expr.type}`);
    }
    checkBinaryExpression(expr) {
        const leftType = this.checkExpression(expr.left);
        const rightType = this.checkExpression(expr.right);
        if (['+', '-', '*', '/'].includes(expr.operator)) {
            if (leftType !== 'num' || rightType !== 'num') {
                // allow str + str?
                if (expr.operator === '+' && leftType === 'str' && rightType === 'str') {
                    return 'str';
                }
                throw new TypeError(`Operator ${expr.operator} requires 'num', got ${leftType} and ${rightType}.`, expr.line);
            }
            return 'num';
        }
        if (['==', '!=', '<', '>', '<=', '>='].includes(expr.operator)) {
            if (leftType !== rightType) {
                throw new TypeError(`Cannot compare ${leftType} with ${rightType}.`, expr.line);
            }
            return 'bool';
        }
        return 'unknown';
    }
    checkAssignmentExpression(expr) {
        const rightType = this.checkExpression(expr.right);
        if (expr.left.type === 'Identifier') {
            const leftId = expr.left;
            try {
                const declaredType = this.lookupVar(leftId.name, leftId.line);
                if (declaredType !== 'unknown' && declaredType !== rightType) {
                    throw new TypeError(`Cannot assign type ${rightType} to variable of type ${declaredType}.`, expr.line);
                }
            }
            catch (e) {
                if (e instanceof TypeError && e.message.includes('Undefined variable')) {
                    // Variable not defined, so this assignment acts as a declaration
                    this.defineVar(leftId.name, rightType, leftId.line);
                    expr.isDeclaration = true;
                    expr.declType = rightType;
                }
                else {
                    throw e;
                }
            }
        }
        else {
            // Member assignment e.g. a.b = 10 -> skipping strict type checks on objects for now
        }
        return rightType;
    }
    checkCallExpression(expr) {
        if (expr.callee.type === 'Identifier') {
            const name = expr.callee.name;
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
        }
        else if (expr.callee.type === 'MemberExpression') {
            const mem = expr.callee;
            if (mem.object.type === 'Identifier' && mem.object.name === 'log') {
                // log.print any args
                expr.arguments.forEach(arg => this.checkExpression(arg));
                return 'void';
            }
        }
        return 'unknown';
    }
}
exports.TypeChecker = TypeChecker;
//# sourceMappingURL=typechecker.js.map