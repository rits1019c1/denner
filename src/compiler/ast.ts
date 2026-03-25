export type NodeType =
  | 'Program'
  | 'VariableDeclaration'
  | 'FunctionDeclaration'
  | 'ExpressionStatement'
  | 'BlockStatement'
  | 'IfStatement'
  | 'ForRangeStatement'
  | 'ForInStatement'
  | 'ReturnStatement'
  | 'ImportStatement'
  | 'ExportStatement'
  // Expressions
  | 'BinaryExpression'
  | 'Identifier'
  | 'NumberLiteral'
  | 'StringLiteral'
  | 'BooleanLiteral'
  | 'CallExpression'
  | 'MemberExpression'
  | 'AssignmentExpression';

export interface BaseNode {
  type: NodeType;
  line: number;
}

export interface Program extends BaseNode {
  type: 'Program';
  body: Statement[];
}

export type Statement =
  | VariableDeclaration
  | FunctionDeclaration
  | ExpressionStatement
  | BlockStatement
  | IfStatement
  | ForRangeStatement
  | ForInStatement
  | ReturnStatement
  | ImportStatement
  | ExportStatement;

export type Expression =
  | BinaryExpression
  | Identifier
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | CallExpression
  | MemberExpression
  | AssignmentExpression;

// Statements

export interface VariableDeclaration extends BaseNode {
  type: 'VariableDeclaration';
  id: Identifier;
  typeAnnotation: string | null;
  init: Expression;
}

export interface Parameter {
  id: Identifier;
  typeAnnotation: string;
}

export interface FunctionDeclaration extends BaseNode {
  type: 'FunctionDeclaration';
  id: Identifier;
  params: Parameter[];
  returnType: string;
  body: BlockStatement;
}

export interface ExpressionStatement extends BaseNode {
  type: 'ExpressionStatement';
  expression: Expression;
}

export interface BlockStatement extends BaseNode {
  type: 'BlockStatement';
  body: Statement[];
}

export interface IfStatement extends BaseNode {
  type: 'IfStatement';
  test: Expression;
  consequent: BlockStatement;
  alternate: BlockStatement | IfStatement | null;
}

export interface ForRangeStatement extends BaseNode {
  type: 'ForRangeStatement';
  iterator: Identifier;
  start: Expression;
  end: Expression;
  body: BlockStatement;
}

export interface ForInStatement extends BaseNode {
  type: 'ForInStatement';
  iterators: Identifier[]; // [item] or [index, item] or [key, value]
  iterable: Expression;
  body: BlockStatement;
}

export interface ReturnStatement extends BaseNode {
  type: 'ReturnStatement';
  argument: Expression;
}

export interface ImportStatement extends BaseNode {
  type: 'ImportStatement';
  source: string; // URL or local path
  alias: string | null; // e.g. "as math"
}

export interface ExportStatement extends BaseNode {
  type: 'ExportStatement';
  declaration: FunctionDeclaration; // for now, assuming we export functions
}

// Expressions

export interface AssignmentExpression extends BaseNode {
  type: 'AssignmentExpression';
  left: Identifier | MemberExpression;
  operator: string;
  right: Expression;
  isDeclaration?: boolean;
  declType?: string;
}

export interface BinaryExpression extends BaseNode {
  type: 'BinaryExpression';
  left: Expression;
  operator: string;
  right: Expression;
}

export interface CallExpression extends BaseNode {
  type: 'CallExpression';
  callee: Expression; // usually Identifier or MemberExpression
  arguments: Expression[];
}

export interface MemberExpression extends BaseNode {
  type: 'MemberExpression';
  object: Expression;
  property: Identifier;
}

export interface Identifier extends BaseNode {
  type: 'Identifier';
  name: string;
}

export interface NumberLiteral extends BaseNode {
  type: 'NumberLiteral';
  value: number;
}

export interface StringLiteral extends BaseNode {
  type: 'StringLiteral';
  value: string;
}

export interface BooleanLiteral extends BaseNode {
  type: 'BooleanLiteral';
  value: boolean;
}
