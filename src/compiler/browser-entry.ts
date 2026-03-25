import { Lexer } from './lexer';
import { Parser } from './parser';
import { JSCodeGenerator } from './jscodegen';
import { BrowserResolver } from './browser-resolver';

export { Lexer, Parser, JSCodeGenerator, BrowserResolver };

// Global export for browser usage
if (typeof window !== 'undefined') {
  (window as any).Denner = { Lexer, Parser, JSCodeGenerator };
}
