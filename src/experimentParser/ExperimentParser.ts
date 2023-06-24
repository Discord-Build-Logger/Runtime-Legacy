import * as acorn from "acorn";
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
   * @param script The script to parse, in form of JavaScript code.
   */
  parseScript(script: string) {
    const ast = acorn.parse(script, this.acornOptions);
    new ExperimentASTVisitor().walk(ast, [script, this]);
  }

  addExperiment(experiment: Experiment) {
    const existing = this.experiments.find((exp) => exp.id === experiment.id);
    if (existing) {
      return;
    }

    this.experiments.push(experiment);
  }
}

export default ExperimentParser;
