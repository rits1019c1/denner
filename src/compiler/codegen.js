"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeGenerator = void 0;
class CodeGenerator {
    ast;
    indentLevel = 0;
    output = '';
    constructor(ast) {
        this.ast = ast;
    }
    generate() {
        this.emit('#include <iostream>');
        this.emit('#include <string>');
        this.emit('#include <vector>');
        this.emit('#include <map>');
        this.emit('');
        this.emit('using namespace std;');
        this.emit('');
        // Pre-declare functions so they can call each other
        for (const stmt of this.ast.body) {
            if (stmt.type === 'FunctionDeclaration') {
                this.emitFunctionForwardDeclaration(stmt);
            }
            else if (stmt.type === 'ExportStatement') {
                this.emitFunctionForwardDeclaration(stmt.declaration);
            }
        }
        this.emit('');
        // Generate non-main statements inside a special initialization function?
        // Wait, in C++, top level statements are not allowed outside functions except globals.
        // We should put all top-level statements that aren't functions into `int main() { ... }`.
        // First, emit all functions
        for (const stmt of this.ast.body) {
            if (stmt.type === 'FunctionDeclaration') {
                this.generateStatement(stmt);
            }
            else if (stmt.type === 'ExportStatement') {
                this.generateStatement(stmt.declaration);
            }
        }
        this.emit('int main() {');
        this.indent();
        for (const stmt of this.ast.body) {
            if (stmt.type !== 'FunctionDeclaration' && stmt.type !== 'ExportStatement' && stmt.type !== 'ImportStatement') {
                this.generateStatement(stmt);
            }
        }
        this.emit('return 0;');
        this.dedent();
        this.emit('}');
        return this.output;
    }
    emit(line) {
        if (line === '') {
            this.output += '\n';
        }
        else {
            this.output += '    '.repeat(this.indentLevel) + line + '\n';
        }
    }
    indent() {
        this.indentLevel++;
    }
    dedent() {
        this.indentLevel--;
    }
    mapType(dennerType) {
        switch (dennerType) {
            case 'num': return 'double'; // Using double universally to make it simpler
            case 'str': return 'string';
            case 'bool': return 'bool';
            case 'list': return 'vector<auto>'; // Needs C++20 or specific types; generic fallback to 'auto' or 'std::any' or template, but let's stick to C++14/17 generic. Actually, auto arrays are only allowed in templates. For our use case, we'll map to `auto` in for-loops mostly. In variables, we shouldn't allow raw lists without types. For MVP, we'll use `auto` with initialization.
            case 'obj': return 'map<string, auto>';
            case 'void': return 'void';
            default: return 'auto';
        }
    }
    emitFunctionForwardDeclaration(decl) {
        const returnType = this.mapType(decl.returnType);
        const params = decl.params.map(p => `${this.mapType(p.typeAnnotation)} ${p.id.name}`).join(', ');
        this.emit(`${returnType} ${decl.id.name}(${params});`);
    }
    generateStatement(stmt) {
        switch (stmt.type) {
            case 'VariableDeclaration': {
                const decl = stmt;
                const type = this.mapType(decl.typeAnnotation);
                const init = this.generateExpression(decl.init);
                this.emit(`${type} ${decl.id.name} = ${init};`);
                break;
            }
            case 'FunctionDeclaration': {
                const decl = stmt;
                const returnType = this.mapType(decl.returnType);
                const params = decl.params.map(p => `${this.mapType(p.typeAnnotation)} ${p.id.name}`).join(', ');
                this.emit(`${returnType} ${decl.id.name}(${params}) {`);
                this.indent();
                decl.body.body.forEach(s => this.generateStatement(s));
                this.dedent();
                this.emit(`}`);
                this.emit('');
                break;
            }
            case 'ExpressionStatement': {
                const expr = stmt.expression;
                this.emit(`${this.generateExpression(expr)};`);
                break;
            }
            case 'IfStatement': {
                const ifStmt = stmt;
                this.emit(`if (${this.generateExpression(ifStmt.test)}) {`);
                this.indent();
                ifStmt.consequent.body.forEach(s => this.generateStatement(s));
                this.dedent();
                if (ifStmt.alternate) {
                    if (ifStmt.alternate.type === 'IfStatement') {
                        // To properly chain else if without extra newlines, we can handle it specially, but emitting `} else { if { ... } }` is also valid C++.
                        this.emit(`} else {`);
                        this.indent();
                        this.generateStatement(ifStmt.alternate);
                        this.dedent();
                    }
                    else {
                        this.emit(`} else {`);
                        this.indent();
                        ifStmt.alternate.body.forEach(s => this.generateStatement(s));
                        this.dedent();
                    }
                }
                this.emit(`}`);
                break;
            }
            case 'ForRangeStatement': {
                const forRange = stmt;
                const start = this.generateExpression(forRange.start);
                const end = this.generateExpression(forRange.end);
                const iter = forRange.iterator.name;
                this.emit(`for (double ${iter} = ${start}; ${iter} < ${end}; ${iter}++) {`);
                this.indent();
                forRange.body.body.forEach(s => this.generateStatement(s));
                this.dedent();
                this.emit(`}`);
                break;
            }
            case 'ForInStatement': {
                const forIn = stmt;
                const iter = forIn.iterators[0].name; // ignoring index/key-val pairs for now
                const iterable = this.generateExpression(forIn.iterable);
                this.emit(`for (auto ${iter} : ${iterable}) {`);
                this.indent();
                forIn.body.body.forEach(s => this.generateStatement(s));
                this.dedent();
                this.emit(`}`);
                break;
            }
            case 'ReturnStatement': {
                const ret = stmt;
                this.emit(`return ${this.generateExpression(ret.argument)};`);
                break;
            }
            case 'BlockStatement': {
                this.emit(`{`);
                this.indent();
                stmt.body.forEach(s => this.generateStatement(s));
                this.dedent();
                this.emit(`}`);
                break;
            }
            case 'ImportStatement':
                // Handled by dependency resolver theoretically. For MVP, imports drop out from generated source into #includes or object linking.
                break;
            case 'ExportStatement':
                // For C++, exporting is basically making it not static / exposed in header. In single-file it's standard.
                break;
        }
    }
    generateExpression(expr) {
        switch (expr.type) {
            case 'Identifier':
                return expr.name;
            case 'NumberLiteral':
                return expr.value.toString();
            case 'StringLiteral':
                return `string("${expr.value}")`; // avoid const char* issues
            case 'BooleanLiteral':
                return expr.value ? 'true' : 'false';
            case 'BinaryExpression': {
                const bin = expr;
                // String concat in C++ with + is supported by std::string
                return `(${this.generateExpression(bin.left)} ${bin.operator} ${this.generateExpression(bin.right)})`;
            }
            case 'AssignmentExpression': {
                const assign = expr;
                if (assign.left.type === 'Identifier') {
                    const prefix = assign.isDeclaration ? `${this.mapType(assign.declType || null)} ` : '';
                    return `${prefix}${assign.left.name} = ${this.generateExpression(assign.right)}`;
                }
                // Member
                const mem = assign.left;
                return `${this.generateExpression(mem.object)}.${mem.property.name} = ${this.generateExpression(assign.right)}`;
            }
            case 'CallExpression': {
                const call = expr;
                const args = call.arguments.map(a => this.generateExpression(a)).join(', ');
                // Special case log.print
                if (call.callee.type === 'MemberExpression') {
                    const mem = call.callee;
                    if (mem.object.type === 'Identifier' && mem.object.name === 'log' && mem.property.name === 'print') {
                        if (call.arguments.length === 0)
                            return `cout << endl`;
                        return `cout << ${args} << endl`;
                    }
                }
                return `${this.generateExpression(call.callee)}(${args})`;
            }
            case 'MemberExpression': {
                const mem = expr;
                return `${this.generateExpression(mem.object)}.${mem.property.name}`;
            }
        }
        throw new Error(`Unknown expression type: ${expr.type}`);
    }
}
exports.CodeGenerator = CodeGenerator;
//# sourceMappingURL=codegen.js.map