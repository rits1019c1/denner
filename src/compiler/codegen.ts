import * as AST from './ast';

export class CodeGenerator {
  private indentLevel: number = 0;
  private output: string = '';

  constructor(private ast: AST.Program) {}

  private requiredStdlibs = new Set<string>();

  public generate(): string {
    this.identifyStdlibs(this.ast);
    this.emit('#include <iostream>');
    this.emit('#include <string>');
    this.emit('#include <vector>');
    this.emit('#include <map>');
    if (this.requiredStdlibs.has('os') || this.requiredStdlibs.has('path') || this.requiredStdlibs.has('gui') || this.requiredStdlibs.has('net')) {
       this.emit('#include <cstdlib>');
    }
    if (this.requiredStdlibs.has('net')) {
       this.emit('#include <cstdio>');
       this.emit('#include <memory>');
       this.emit('#include <stdexcept>');
       this.emit('#include <array>');
    }
    if (this.requiredStdlibs.has('cli')) {
       this.emit('#ifdef _WIN32\n#include <conio.h>\n#else\n#include <termios.h>\n#include <unistd.h>\n#endif');
    }
    
    this.emit('');
    this.emit('using namespace std;');
    this.emit('');
    
    this.emitStdlibStubs();

    // Pre-declare functions so they can call each other
    for (const stmt of this.ast.body) {
      if (stmt.type === 'FunctionDeclaration') {
         this.emitFunctionForwardDeclaration(stmt as AST.FunctionDeclaration);
      } else if (stmt.type === 'ExportStatement') {
         this.emitFunctionForwardDeclaration((stmt as AST.ExportStatement).declaration);
      }
    }
    this.emit('');

    // First, emit all functions
    for (const stmt of this.ast.body) {
       if (stmt.type === 'FunctionDeclaration') {
          this.generateStatement(stmt);
       } else if (stmt.type === 'ExportStatement') {
          this.generateStatement((stmt as AST.ExportStatement).declaration);
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

  private identifyStdlibs(node: any) {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(n => this.identifyStdlibs(n));
    } else if (typeof node === 'object') {
      if (node.type === 'MemberExpression' && node.object?.type === 'Identifier') {
         if (['os', 'path', 'net', 'cli', 'gui'].includes(node.object.name)) {
            this.requiredStdlibs.add(node.object.name);
         }
      }
      Object.values(node).forEach(v => this.identifyStdlibs(v));
    }
  }

  private emitStdlibStubs() {
    if (this.requiredStdlibs.has('os')) {
       this.emit('string denner_os_name() {');
       this.emit('#ifdef _WIN32\n    return "windows";\n#elif __APPLE__\n    return "macos";\n#elif __linux__\n    return "linux";\n#else\n    return "unknown";\n#endif\n}');
       this.emit('string denner_os_env(string key) {');
       this.emit('    if (const char* env_p = std::getenv(key.c_str())) return string(env_p);');
       this.emit('    return "";\n}');
    }
    if (this.requiredStdlibs.has('path')) {
       this.emit('string denner_path_join(string a, string b) {');
       this.emit('    string sep = "/";');
       this.emit('#ifdef _WIN32\n    sep = "\\\\";\n#endif');
       this.emit('    if (a.empty()) return b;');
       this.emit('    if (a.back() == sep[0]) return a + b;');
       this.emit('    return a + sep + b;\n}');
    }
    if (this.requiredStdlibs.has('cli')) {
       this.emit('string denner_cli_input(string prompt_text) {');
       this.emit('    cout << prompt_text;');
       this.emit('    string val;');
       this.emit('    getline(cin, val);');
       this.emit('    return val;\n}');
       
       this.emit('string denner_cli_get_key() {');
       this.emit('#ifdef _WIN32');
       this.emit('    int ch = _getch();');
       this.emit('    if (ch == 0 || ch == 224) {');
       this.emit('        ch = _getch();');
       this.emit('        if (ch == 72) return "Up";');
       this.emit('        if (ch == 80) return "Down";');
       this.emit('        if (ch == 75) return "Left";');
       this.emit('        if (ch == 77) return "Right";');
       this.emit('    }');
       this.emit('    return string(1, (char)ch);');
       this.emit('#else');
       this.emit('    struct termios oldt, newt;');
       this.emit('    tcgetattr(STDIN_FILENO, &oldt);');
       this.emit('    newt = oldt;');
       this.emit('    newt.c_lflag &= ~(ICANON | ECHO);');
       this.emit('    tcsetattr(STDIN_FILENO, TCSANOW, &newt);');
       this.emit('    char buf[3];');
       this.emit('    int n = read(STDIN_FILENO, buf, 3);');
       this.emit('    tcsetattr(STDIN_FILENO, TCSANOW, &oldt);');
       this.emit('    if (n == 3 && buf[0] == \'\\033\' && buf[1] == \'[\') {');
       this.emit('        if (buf[2] == \'A\') return "Up";');
       this.emit('        if (buf[2] == \'B\') return "Down";');
       this.emit('        if (buf[2] == \'C\') return "Right";');
       this.emit('        if (buf[2] == \'D\') return "Left";');
       this.emit('    }');
       this.emit('    if (n > 0) return string(1, buf[0]);');
       this.emit('    return "";');
       this.emit('#endif\n}');
    }
    if (this.requiredStdlibs.has('gui')) {
       this.emit('void denner_gui_alert(string msg) {');
       this.emit('#ifdef _WIN32');
       this.emit('    system(("msg * " + msg).c_str());');
       this.emit('#elif __APPLE__');
       this.emit('    system(("osascript -e \\"display alert \\\\"" + msg + "\\\\"\\"").c_str());');
       this.emit('#else');
       this.emit('    system(("xmessage \\"" + msg + "\\"").c_str());');
       this.emit('#endif\n}');
    }
    if (this.requiredStdlibs.has('net')) {
       this.emit('string denner_net_get(string url) {');
       this.emit('    std::array<char, 128> buffer;');
       this.emit('    std::string result;');
       this.emit('    std::unique_ptr<FILE, decltype(&pclose)> pipe(popen(("curl -s \\"" + url + "\\"").c_str(), "r"), pclose);');
       this.emit('    if (!pipe) throw std::runtime_error("popen() failed!");');
       this.emit('    while (fgets(buffer.data(), buffer.size(), pipe.get()) != nullptr) {');
       this.emit('        result += buffer.data();');
       this.emit('    }');
       this.emit('    return result;\n}');
    }

    // Always emit string concatenation helper for interpolation support
    this.emit('template<typename T> string denner_to_str(T v) { return to_string(v); }');
    this.emit('string denner_to_str(string v) { return v; }');
    this.emit('string denner_to_str(const char* v) { return string(v); }');
    this.emit('template<typename L, typename R> auto denner_add(L l, R r) -> decltype(l + r) { return l + r; }');
    this.emit('template<typename T> string denner_add(string l, T r) { return l + denner_to_str(r); }');
    this.emit('template<typename T> string denner_add(T l, string r) { return denner_to_str(l) + r; }');
    this.emit('string denner_add(string l, string r) { return l + r; }');
  }

  private emit(line: string) {
    if (line === '') {
       this.output += '\n';
    } else {
       this.output += '    '.repeat(this.indentLevel) + line + '\n';
    }
  }

  private indent() {
    this.indentLevel++;
  }

  private dedent() {
    this.indentLevel--;
  }

  private mapType(dennerType: string | null): string {
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

  private emitFunctionForwardDeclaration(decl: AST.FunctionDeclaration) {
    const returnType = this.mapType(decl.returnType);
    const params = decl.params.map(p => `${this.mapType(p.typeAnnotation)} ${p.id.name}`).join(', ');
    this.emit(`${returnType} ${decl.id.name}(${params});`);
  }

  private generateStatement(stmt: AST.Statement) {
    switch (stmt.type) {
      case 'VariableDeclaration': {
        const decl = stmt as AST.VariableDeclaration;
        const type = this.mapType(decl.typeAnnotation);
        const init = this.generateExpression(decl.init);
        this.emit(`${type} ${decl.id.name} = ${init};`);
        break;
      }
      case 'FunctionDeclaration': {
        const decl = stmt as AST.FunctionDeclaration;
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
             // To properly chain else if without extra newlines, we can handle it specially, but emitting `} else { if { ... } }` is also valid C++.
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
        this.emit(`for (double ${iter} = ${start}; ${iter} < ${end}; ${iter}++) {`);
        this.indent();
        forRange.body.body.forEach(s => this.generateStatement(s));
        this.dedent();
        this.emit(`}`);
        break;
      }
      case 'ForInStatement': {
        const forIn = stmt as AST.ForInStatement;
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
      case 'ImportStatement':
         // Handled by dependency resolver theoretically. For MVP, imports drop out from generated source into #includes or object linking.
         break;
      case 'ExportStatement':
         // For C++, exporting is basically making it not static / exposed in header. In single-file it's standard.
         break;
    }
  }

  private generateExpression(expr: AST.Expression): string {
    switch (expr.type) {
      case 'Identifier':
        return (expr as AST.Identifier).name;
      case 'NumberLiteral':
        return (expr as AST.NumberLiteral).value.toString();
      case 'StringLiteral':
        return `string("${(expr as AST.StringLiteral).value}")`; // avoid const char* issues
      case 'BooleanLiteral':
        return (expr as AST.BooleanLiteral).value ? 'true' : 'false';
      case 'BinaryExpression': {
        const bin = expr as AST.BinaryExpression;
        if (bin.operator === '+') {
           return `denner_add(${this.generateExpression(bin.left)}, ${this.generateExpression(bin.right)})`;
        }
        return `(${this.generateExpression(bin.left)} ${bin.operator} ${this.generateExpression(bin.right)})`;
      }
      case 'AssignmentExpression': {
        const assign = expr as AST.AssignmentExpression;
        if (assign.left.type === 'Identifier') {
           const prefix = assign.isDeclaration ? `${this.mapType(assign.declType || null)} ` : '';
           return `${prefix}${(assign.left as AST.Identifier).name} = ${this.generateExpression(assign.right)}`;
        }
        // Member assignment in MVP flattened AST
        const mem = assign.left as AST.MemberExpression;
        return `${mem.property.name} = ${this.generateExpression(assign.right)}`;
      }
      case 'CallExpression': {
        const call = expr as AST.CallExpression;
        const args = call.arguments.map(a => this.generateExpression(a)).join(', ');
        
        // Special case log.print
        if (call.callee.type === 'MemberExpression') {
           const mem = call.callee as AST.MemberExpression;
           if (mem.object.type === 'Identifier') {
               const objName = (mem.object as AST.Identifier).name;
               const propName = mem.property.name;
               
               if (objName === 'log' && propName === 'print') {
                  if (call.arguments.length === 0) return `cout << endl`;
                  return `cout << ${args} << endl`;
               }
               
               if (['os', 'path', 'net', 'cli', 'gui'].includes(objName)) {
                  return `denner_${objName}_${propName}(${args})`;
               }
           }
        }
        
        return `${this.generateExpression(call.callee)}(${args})`;
      }
      case 'MemberExpression': {
        const mem = expr as AST.MemberExpression;
        if (mem.object.type === 'Identifier') {
            const objName = (mem.object as AST.Identifier).name;
            if (['os', 'path', 'net', 'cli', 'gui'].includes(objName)) {
                // If referenced as variable? Unlikely to work in MVP C++ codegen, but handle for safety
                return `denner_${objName}_${mem.property.name}`;
            }
        }
        // For MVP imports are concatenated globally. Ignore the module alias and output the global function name.
        return mem.property.name;
      }
    }
    throw new Error(`Unknown expression type: ${(expr as any).type}`);
  }
}
