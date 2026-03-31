import { Lexer } from '../src/compiler/lexer';
import { Parser } from '../src/compiler/parser';
import { TypeChecker, TypeError } from '../src/compiler/typechecker';

function check(source: string) {
  const tokens = new Lexer(source).tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const checker = new TypeChecker(ast);
  checker.check();
  return ast;
}

describe('TypeChecker', () => {
  it('should infer types correctly', () => {
    expect(() => check(`a = 10`)).not.toThrow();
    expect(() => check(`b = "hello"`)).not.toThrow();
  });

  it('should enforce explicit types', () => {
    expect(() => check(`a:num = 10`)).not.toThrow();
    expect(() => check(`a:str = 10`)).toThrow(TypeError);
  });

  it('should prevent reassignment to a different type', () => {
    expect(() => check(`a = 10\na = "str"`)).toThrow(TypeError);
    expect(() => check(`a = 10\na = 20`)).not.toThrow();
  });

  it('should check function arguments and returns', () => {
    const valid = `
      function add(x:num, y:num):num {
        return x + y
      }
      add(10, 20)
    `;
    expect(() => check(valid)).not.toThrow();

    const invalidArgs = `
      function add(x:num, y:num):num {
        return x + y
      }
      add("hello", 20)
    `;
    expect(() => check(invalidArgs)).toThrow(TypeError);

    const invalidReturn = `
      function doSmth():str {
        return 10
      }
    `;
    expect(() => check(invalidReturn)).toThrow(TypeError);
  });

  it('should allow concatenating strings', () => {
    expect(() => check(`a = "hello" + " world"`)).not.toThrow();
  });

  it('should not allow subtracting strings', () => {
    expect(() => check(`a = "hello" - " world"`)).toThrow(TypeError);
  });
  
  it('should type check if conditions', () => {
     expect(() => check(`if 1 { }`)).toThrow(TypeError); // condition must be bool
     expect(() => check(`if true { }`)).not.toThrow();
  });
});
