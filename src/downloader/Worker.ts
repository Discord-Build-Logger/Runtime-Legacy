import cluster, { parentPort } from "node:worker_threads";
import {
  AppMainChecks,
  MainStylesheetChecks,
  Regexes,
  WebpackChunkChecks,
  WebpackVendorChecks,
} from "../Constants";
import File, { FileTags } from "../models/File";
import { FileMetadata } from "./BuildDownloader";

function handle(file: string, meta: FileMetadata): File | null {
  if (!meta.text) return null;

  const { text } = meta;

  if (meta.contentType === "text/css" || file.endsWith(".css")) {
    return new File({
      fileName: file,
      tags: [FileTags.StyleSheet],
      referencedFiles: [], // TODO: Extract asset URLs from CSS
      metadata: meta,
    });
  }

  if (meta.contentType === "application/javascript") {
    const newFile = new File({
      fileName: file,
      metadata: meta,
      tags: [FileTags.JavaScript],
    });

    // Detect webpack chunks
    if (WebpackChunkChecks.every((check) => text.includes(check))) {
      newFile.tags.push(FileTags.WebpackChunk);
    }

    // Whether the "type" has been found (webpack loader, vendor, etc.)
    let typeFound = false;

    // Detect webpack loader file
    if (!typeFound) {
      const moduleMap = Regexes.wpLoaderModules.exec(text);
      if (moduleMap?.[1]) {
        const modules = Object.values(
          new Function(`return ${moduleMap[1]} || {}`)()
        );
        if (modules.length) {
          newFile.referencedFiles.push(...modules.map((m) => `${m}.js`));
        }
        newFile.tags.push(FileTags.WebpackChunkLoader);
        typeFound = true;
      }
    }

    // Detect webpack vendor file
    if (
      !typeFound &&
      WebpackVendorChecks.some((check) => text.includes(check))
    ) {
      newFile.tags.push(FileTags.WebpackVendor);
      typeFound = true;
    }

    // Detect webpack style mapper file
    if (!typeFound) {
      const stylesheetMatches = MainStylesheetChecks.reduce((prev, curr) => {
        return prev + (text.includes(curr) ? 1 : 0);
      }, 0);

      // Must match at least 5 styles. TODO: Add more checks for better security.
      if (stylesheetMatches >= 5) {
        newFile.tags.push(FileTags.WebpackStyleMapper);
        typeFound = true;
      }
    }

    // Detect app main file
    if (!typeFound && AppMainChecks.every((check) => text.includes(check))) {
      newFile.tags.push(FileTags.AppMain);
    }

    return newFile;
  }

  // If type not found, return a generic File.
  return new File({
    fileName: file,
    metadata: meta,
  });
}

if (cluster.isMainThread) {
  throw new Error("Not main thread!");
}

if (!parentPort) {
  throw new Error("No parentPort!");
}

parentPort.on("message", async (param) => {
  if (typeof param !== "object") return;
  if (!param.fileName || !param.fileMeta) return;
  console.log(`[Worker ${cluster.threadId}] => ${param.fileName}`);

  const file = handle(param.fileName, param.fileMeta);

  parentPort!.postMessage(file);
});
