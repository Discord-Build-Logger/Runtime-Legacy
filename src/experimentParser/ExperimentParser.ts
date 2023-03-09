import acorn from "acorn";
import * as walk from "acorn-walk";
import Experiment from "../models/Experiment";
import ExperimentASTVisitor from "./ExperimentASTVisitor";

const defaultAcornOptions: acorn.Options = {
  ecmaVersion: "latest",
};

class ExperimentParser {
  /**
   * List of all found experiments.
   */
  experiments: Experiment[];

  /**
   * Default options to pass to acorn AST parser.
   */
  acornOptions: acorn.Options;

  constructor() {
    this.experiments = [];
    this.acornOptions = defaultAcornOptions;
  }

  /**
   * Parses a script and adds all found experiments to ExperimentParser.experiments.
   * @param script The script to parse. Accepts either code as a string or parsed AST as an object.
   */
  parseScript(script: string | acorn.Node) {
    if (typeof script === "string") {
      const ast = acorn.parse(script, this.acornOptions);
      return this.parseAST(ast);
    } else if (typeof script === "object") {
      return this.parseAST(script);
    } else {
      throw new Error(
        `Invalid script passed. Expected string or object, got ${typeof script}`
      );
    }
  }

  parseAST(ast: acorn.Node) {
    new ExperimentASTVisitor().walk(ast, this);
  }
}

export default ExperimentParser;
