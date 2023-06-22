import { StaticPool } from "node-worker-threads-pool";
import fs, { writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import cluster from "node:worker_threads";
import { BLOBS_DIR, Domains, Paths, Regexes } from "../Constants";
import Build, { BuildEnv, ReleaseChannel } from "../models/Build";
import File from "../models/File";
import PromiseQueue from "./PromiseQueue";

/**
 * Config for main thread.
 */
interface BuildDownloaderConfig {
  /** Will use all available threads by default. */
  maxThreads?: number;
  /**
   * Save downloaded files to disk.
   * @default false
   */
  saveToDisk?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ThreadPoolFn = (param: {
  fileName: string;
  fileMeta: FileMetadata;
}) => Promise<File>;

class BuildDownloader {
  private saveToDisk = false;
  private maxThreads: number;
  private downloadQueue = new PromiseQueue({ concurrency: 32 });
  private downloadRetryAttempts = 5;
  private downloadRetryDelay = 2000;
  private threadPool: StaticPool<ThreadPoolFn, any>;

  private handledFiles: string[] = [];

  private downloadResults: Record<string, FileMetadata> = {};

  constructor(
    private releaseChannel: ReleaseChannel,
    config?: BuildDownloaderConfig
  ) {
    if (!cluster.isMainThread) throw new Error("Not main thread!");

    // Delegate to workers. Maximum of os.cpus().length threads.
    this.maxThreads = config?.maxThreads
      ? Math.min(os.cpus().length, config.maxThreads)
      : os.cpus().length;

    this.threadPool = new StaticPool({
      size: this.maxThreads,
      task: path.join(__dirname, "Worker"),
    });

    if (config?.saveToDisk) {
      this.saveToDisk = true;
      if (!fs.existsSync(BLOBS_DIR)) fs.mkdirSync(BLOBS_DIR);
    }
  }

  async start(rootinfo?: {
    id: string;
    date: string;
    files: string[];
    body: string;
  }): Promise<Build> {
    if (!cluster.isMainThread) throw new Error("Not main thread!");

    const build = new Build();

    build.releaseChannel = this.releaseChannel;

    switch (this.releaseChannel) {
      case ReleaseChannel.CANARY:
      case ReleaseChannel.PTB:
      case ReleaseChannel.STABLE:
        build.buildEnv = BuildEnv.PRODUCTION;
        break;
      case ReleaseChannel.STAGING:
        build.buildEnv = BuildEnv.STAGING;
        break;
    }

    const {
      files: rootFiles,
      date,
      id,
      body: rootBody,
    } = rootinfo ?? (await this.getRootInfo());

    build.id = id;
    build.date = new Date(date);

    const globalEnv = Regexes.htmlGlobalEnv.exec(rootBody)?.[1] ?? "{}";
    build.globalEnv = Function(
      `return ${globalEnv.replace("Date.now()", '"Date.now()"')}`
    )();

    // console.log(`[Downloader Main] Threads: ${this.maxThreads}`);
    // console.log(`[Downloader Main] Root Files: ${rootFiles.length}`);

    for (const file of rootFiles) {
      this.downloadQueue.add(() => this.download(file));
    }

    await this.downloadQueue.awaitAll();

    const files = await this.process(rootFiles);

    build.files = files;
    // TODO: Set build.assets

    return build;
  }

  async process(files: string[]): Promise<File[]> {
    if (!cluster.isMainThread) throw new Error("Not main thread!");
    // console.log(`[Downloader Main] Processing ${files.length} files...`);

    const results: File[] = [];

    const newFiles: string[] = [];

    const promises = files.map(async (file) => {
      const result = await this.threadPool
        .createExecutor()
        .setTimeout(10_000)
        .exec({
          fileName: file,
          fileMeta: this.downloadResults[file],
        });
      if (result?.referencedFiles?.length) {
        this.downloadQueue.add(
          result.referencedFiles.map((f) => () => this.download(f))
        );
        newFiles.push(...result.referencedFiles);
      }
      this.handledFiles.push(file);
      results.push(result);
    });

    await Promise.all(promises);

    // @ts-ignore awaitAll doesn't resolve if queue is empty
    if (this.downloadQueue.queue.length) await this.downloadQueue.awaitAll();

    if (newFiles.filter((f) => !this.handledFiles.includes(f)).length) {
      const files = await this.process(
        newFiles.filter((f) => !this.handledFiles.includes(f))
      );
      results.push(...files);
    }

    this.threadPool.destroy();

    return results;
  }

  async getRootInfo(opts?: { id?: string }): Promise<{
    id: string;
    date: string;
    files: string[];
    body: string;
  }> {
    if (!cluster.isMainThread) throw new Error("Not main thread!");

    const files: string[] = [];

    if (opts?.id) {
      if (!process.env.INTERNAL_BUILD_GRABBER_URL)
        throw new Error("INTERNAL_BUILD_GRABBER_URL not set!");
      if (!process.env.INTERNAL_BUILD_GRABBER_AUTH)
        throw new Error("INTERNAL_BUILD_GRABBER_AUTH not set!");
    }

    let url: URL;

    if (opts?.id) {
      url = new URL(process.env.INTERNAL_BUILD_GRABBER_URL!);
      url.searchParams.set("auth", process.env.INTERNAL_BUILD_GRABBER_AUTH!);
      url.searchParams.set("hash", opts.id);
    } else {
      url = new URL(`${Domains[this.releaseChannel]}${Paths.app}`);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const body = await response.text();

    let asset: any;
    while ((asset = Regexes.htmlScripts.exec(body))) {
      if (!asset[1]) continue;
      files.push(asset[1]);
    }

    while ((asset = Regexes.htmlStylesheets.exec(body))) {
      if (!asset[1]) continue;
      files.push(asset[1]);
    }

    const id = response.headers.get("x-build-id") || "";
    const date = response.headers.get("last-modified") || "";

    return {
      id,
      date,
      files,
      body,
    };
  }

  async download(file: string, attempt = 0) {
    if (!cluster.isMainThread) throw new Error("Not main thread!");
    let response!: Response;

    try {
      response = await fetch(
        `${Domains[this.releaseChannel]}${Paths.assets}/${file}`
      );
    } catch (e) {
      if (attempt < this.downloadRetryAttempts) {
        console.error(
          `[Downloader Main] Caught error (attempt ${attempt}) ${file}`
        );
        await sleep(this.downloadRetryDelay);
        return this.download(file, attempt + 1);
      }
    }

    if (!response?.ok) {
      if (attempt < this.downloadRetryAttempts) {
        console.error(
          `[Downloader Main] HTTP status: ${response.status} (attempt ${attempt}) ${file}`
        );
        await sleep(this.downloadRetryDelay);
        return this.download(file, attempt + 1);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    }

    const headers = response.headers;

    this.downloadResults[file] = {
      contentType: headers.get("content-type") || null,
      lastModified: headers.get("last-modified") || null,
      text: null,
    };

    const data = await response.text();

    if (!data) {
      if (attempt < this.downloadRetryAttempts) {
        console.error(
          `[Downloader] HTTP status: ${response.status} (attempt ${attempt}) ${file}`
        );
        await sleep(this.downloadRetryDelay);
        return this.download(file, attempt + 1);
      } else {
        throw new Error(`No data!`);
      }
    }

    this.downloadResults[file].text = data.replace("\n", "");

    if (this.saveToDisk) {
      // download to "builds" folder
      const location = path.join(__dirname, "..", "..", "blobs", file);
      writeFileSync(location, data);
    }
  }
}

export default BuildDownloader;

export interface FileMetadata {
  contentType: string | null;
  lastModified: string | null;
  text: string | null;
}
