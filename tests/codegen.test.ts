import { Lexer } from '../src/compiler/lexer';
import { Parser } from '../src/compiler/parser';
import { TypeChecker } from '../src/compiler/typechecker';
import { CodeGenerator } from '../src/compiler/codegen';

function generate(source: string): string {
  const tokens = new Lexer(source).tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const checker = new TypeChecker(ast);
  checker.check();
  
  const codegen = new CodeGenerator(ast);
  return codegen.generate();
}

describe('CodeGenerator', () => {
  it('should generate basic program structure', () => {
    const cpp = generate(`a:num = 10`);
    expect(cpp).toContain('#include <iostream>');
    expect(cpp).toContain('using namespace std;');
    expect(cpp).toContain('int main() {');
    expect(cpp).toContain('double a = 10');
    expect(cpp).toContain('return 0;');
  });

  it('should generate log.print to cout', () => {
    const cpp = generate(`log.print("hello")`);
    expect(cpp).toContain('cout << string("hello") << endl;');
  });

  it('should generate functions and calls', () => {
    const source = `
      function add(x:num, y:num):num {
        return x + y
      }
      res = add(10, 20)
    `;
    const cpp = generate(source);
    
    // forward decl
    expect(cpp).toContain('double add(double x, double y);');
    
    // definition
    expect(cpp).toContain('double add(double x, double y) {');
    expect(cpp).toContain('return denner_add(x, y);');
    
    // usage
    expect(cpp).toContain('double res = add(10, 20);'); // wait, res is unbound so the typechecker binds it to 'num', meaning it's a declaration!
  });

  it('should generate for loops', () => {
    const cpp = generate(`for i in 1..3 {\n log.print(i)\n}`);
    expect(cpp).toContain('for (double i = 1; i < 3; i++) {');
    expect(cpp).toContain('cout << i << endl;');
  });
});
