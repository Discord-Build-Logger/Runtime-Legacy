import Experiment from "./Experiment";

class File {
  /** Filename, including extension. */
  name: string;

  /** A list of tags, e.g. "webpackLoader" */
  tags: (FileType | string)[];

  experiments: Experiment[];

  constructor(name: string, tags?: (FileType | string)[]) {
    this.name = name;
    this.tags = tags ?? [];
    this.experiments = [];
  }

  /** Grab Tags and Experiments from file */
  parse() {
    // TODO: Implement this.
  }

  toJSON() {
    return {
      name: this.name,
      tags: this.tags,
      experiments: this.experiments,
    };
  }
}

export default File;

export enum FileType {
  /**
   * Root Scripts are ones that are directly loaded and executed on the HTML.
   * This does not include preload scripts.
   */
  RootScript = "RootScript",
  /** CSS Stylesheet. Ordinarily there should only be one of these obtained from the HTML. */
  StyleSheet = "StyleSheet",
  /** Webpack Chunk. */
  WebpackChunk = "WebpackChunk",

  /** Webpack Loader. */
  WebpackChunkLoader = "WebpackChunkLoader",
  /** Contains Webpack Modules that map variable names to CSS class names. */
  WebpackStyleMapper = "StyleMapper",
  /** Script containing pre-load polyfills like RegeneratorRuntime. */
  WebpackPolyfills = "WebpackPolyfills",
  /** Main app location. This is the BIG JS file that gets loaded to do all the Discord-y stuff. */
  AppMain = "AppMain",

  /** Assets such as audio, images, videos, etc. */
  Asset = "Asset",
}
