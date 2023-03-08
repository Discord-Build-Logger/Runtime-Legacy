export enum ExperimentKind {
  GUILD = "guild",
  USER = "user",
}

export interface Experiment {
  kind: ExperimentKind;
  id: string;
  label: string;
  /** I think this is always set, but just want to be safe... */
  defaultConfig?: Record<string, any>;
  treatments: ExperimentTreatment[];
}

export interface ExperimentTreatment {
  id: number;
  label: string;
  config: Record<string, any>;
}

export default Experiment;
