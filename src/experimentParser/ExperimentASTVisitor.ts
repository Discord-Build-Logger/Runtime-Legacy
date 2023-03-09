import { Node } from "acorn";
import { ASTVisitor } from "../util/ast/ASTVisitor";
import ExperimentParser from "./ExperimentParser";

function hasProperty(node: any, name: string) {
  if (node.type !== "ObjectExpression") {
    return false;
  }

  return node.properties.some((prop: any) => {
    if (!prop.key) return false;

    if (prop.key.type === "Identifier") {
      return prop.key.name === name;
    } else if (prop.key.type === "Literal") {
      return prop.key.value === name;
    }

    return false;
  });
}

/**
 * Serializes an AST node to a JS value.
 */
function astToJSValue(node: any) {
  if (node.type === "Literal") {
    return node.value;
  } else if (node.type === "ObjectExpression") {
    const obj: any = {};

    for (const prop of node.properties) {
      if (!prop.key) continue;

      if (prop.key.type === "Identifier") {
        obj[prop.key.name] = astToJSValue(prop.value);
      } else if (prop.key.type === "Literal") {
        obj[prop.key.value] = astToJSValue(prop.value);
      }
    }

    return obj;
  } else if (node.type === "ArrayExpression") {
    return node.elements.map(astToJSValue);
  } else if (node.type === "UnaryExpression" && node.operator === "!") {
    const value = astToJSValue(node.argument);
    return value === 0 ? true : value === 1 ? false : undefined;
  } else {
    return undefined;
  }
}

const experimentProperties = ["kind", "id", "label"];

function isExperiment(node: any) {
  if (node.type !== "ObjectExpression") {
    return false;
  }

  return experimentProperties.every((property) => hasProperty(node, property));
}

class ExperimentASTVisitor extends ASTVisitor<ExperimentParser> {
  ObjectExpression(node: Node, parser: ExperimentParser) {
    if (!isExperiment(node)) {
      return;
    }

    const serialized = astToJSValue(node);

    console.log("Found experiment:", serialized);
  }
}

export default ExperimentASTVisitor;
