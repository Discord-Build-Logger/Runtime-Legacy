import { Node } from "acorn";
import Experiment from "../models/Experiment";
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

function isEnumExpression(node: any) {
  if (node.type !== "MemberExpression") {
    return false;
  }

  if (node.object.type === "MemberExpression" && !node.computed) {
    return isEnumExpression(node.object);
  } else if (node.object.type === "Identifier" && !node.computed) {
    return node.property.type === "Identifier";
  }

  return false;
}

/**
 * Serializes an AST node to a JS value.
 */
function astToJSValue(script: string, node: any) {
  if (node.type === "Literal") {
    return node.value;
  } else if (node.type === "ObjectExpression") {
    const obj: any = {};

    for (const prop of node.properties) {
      if (!prop.key) continue;

      if (prop.key.type === "Identifier") {
        obj[prop.key.name] = astToJSValue(script, prop.value);
      } else if (prop.key.type === "Literal") {
        obj[prop.key.value] = astToJSValue(script, prop.value);
      }
    }

    return obj;
  } else if (node.type === "ArrayExpression") {
    return node.elements.map((elem: any) => astToJSValue(script, elem));
  } else if (node.type === "UnaryExpression" && node.operator === "!") {
    const value = astToJSValue(script, node.argument);
    if (typeof value === "number") {
      if (value === 0) {
        return true;
      } else if (value === 1) {
        return false;
      }
    }
  } else if (isEnumExpression(node)) {
    return node.property.name;
  }

  // if we can't serialize it, let's return raw JS code as string otherwise for now
  if (node.start === undefined || node.end === undefined) {
    return undefined;
  }

  return script.substring(node.start, node.end);
}

const experimentProperties = ["kind", "id", "label"];

function isExperiment(node: any) {
  if (node.type !== "ObjectExpression") {
    return false;
  }

  return experimentProperties.every((property) => hasProperty(node, property));
}

class ExperimentASTVisitor extends ASTVisitor<[string, ExperimentParser]> {
  ObjectExpression(node: Node, state: [string, ExperimentParser]) {
    if (!isExperiment(node)) {
      return;
    }

    const [script, parser] = state;

    const serialized = astToJSValue(script, node);
    const experiment: Experiment = {
      kind: serialized.kind,
      id: serialized.id,
      label: serialized.label,
      treatments: serialized.treatments || [],
      defaultConfig: serialized.defaultConfig,
    };

    parser.addExperiment(experiment);
  }
}

export default ExperimentASTVisitor;
