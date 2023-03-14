import { FileMetadata } from "../downloader/BuildDownloader";
import Experiment from "./Experiment";

interface FileConstructor {
  fileName: string;
  metadata: FileMetadata;
  tags?: (FileTags | string)[];
  experiments?: Experiment[];
  referencedFiles?: string[];
}

class File {
  /** Filename, including extension. */
  fileName: string;

  /** File Metadata */
  metadata: FileMetadata;

  /** A list of tags, e.g. "webpackLoader" */
  tags: (FileTags | string)[] = [];

  experiments: Experiment[] = [];

  /** A list of JS files referenced by this one. */
  referencedFiles: string[] = [];

  constructor(opts: FileConstructor) {
    this.fileName = opts.fileName;
    this.metadata = opts.metadata;
    if (opts.tags) this.tags = opts.tags;
    if (opts.experiments) this.experiments = opts.experiments;
    if (opts.referencedFiles) this.referencedFiles = opts.referencedFiles;
  }
}

export default File;

export enum FileTags {
  /** Generic JavaScript File */
  JavaScript = "JavaScript",
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
  /** Script containing pre-load polyfills like RegeneratorRuntime, and Sentry init stuff. */
  WebpackVendor = "WebpackVendor",
  /** Main app location. This is the BIG JS file that gets loaded to do all the Discord-y stuff. */
  AppMain = "AppMain",

  /** Assets such as audio, images, videos, etc. */
  Asset = "Asset",
}
