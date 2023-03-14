import acorn from "acorn";
import * as walk from "acorn-walk";
import { RecursiveWalkerFn, SimpleWalkerFn } from "acorn-walk";

export abstract class RecursiveASTVisitor<TState> {
  [key: string]: RecursiveWalkerFn<TState>;

  walk(node: acorn.Node, state: TState) {
    walk.recursive(node, state, this);
  }
}

export abstract class ASTVisitor<TState> {
  [key: string]: SimpleWalkerFn<TState>;

  walk(node: acorn.Node, state: TState) {
    walk.simple(node, this, undefined, state);
  }
}
