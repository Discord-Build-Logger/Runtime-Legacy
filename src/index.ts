import { writeFileSync } from "node:fs";
import BuildDownloader from "./downloader/BuildDownloader";
import { ReleaseChannel } from "./models/Build";

const downloader = new BuildDownloader(ReleaseChannel.STABLE);

downloader.start().then((d) => {
  writeFileSync("./out.json", JSON.stringify(d, null, 4));
});
