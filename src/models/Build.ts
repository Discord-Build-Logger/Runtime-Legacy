import File from "./File";

class Build {
  /**
   * The Build ID is the hexadecimal hash of a build.
   * Old builds use a short hash, new builds use a long hash
   */
  public id: string;

  /** Build Override metadata. No override applied if null. */
  public buildOverride: BuildOverrideMeta | null;
  /** This may not be present on every build with an override!!! */
  public buildOverrideUrl: string | null;

  /** List of file names */
  public files: File[];

  /** List of assets */
  public assets: string[];
}

export default Build;

/** Release Channels is the name discord uses for the "Branch" of a build. */
export enum ReleaseChannel {
  /* Public Release Channels */
  CANARY = "canary",
  PTB = "ptb",
  STABLE = "stable",
  /** This is usually set for BuildEnv.DEVELOPMENT and BuildEnv.STAGING */
  STAGING = "staging",
}

/** Build env is the environment it's running in. Canary/PTB/Stable are all Production. */
export enum BuildEnv {
  /** Production Discord, aka *.discord.com */
  PRODUCTION = "production",
  /** Development Discord, aka localhost */
  DEVELOPMENT = "development",
  /** Staging Discord, aka *.discord.co */
  STAGING = "staging",
}

export interface BuildOverride {
  /** Build ID or Branch of the override */
  id: string;
  /**
   * If the type is "id", it uses the commit hash.
   * If "branch", it uses the latest build of a GitHub branch.
   */
  type: "id" | "branch";
}

export interface BuildOverrideMeta {
  /** Release channel that the override targets. */
  releaseChannel: `${ReleaseChannel}` | null;
  expiresAt: string;
  validForUserIds: string[];
  /** TODO: I believe this is referring to the ReleaseChannel. */
  allowedVersions?: string[];
  /** Overrides can have different targets depending on platform. */
  targetBuildOverride: {
    discord_web?: BuildOverride;
    discord_ios?: BuildOverride;
    discord_android?: BuildOverride;
    discord_marketing?: BuildOverride;
  };
}
