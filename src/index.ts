import { writeFileSync } from "node:fs";
import { createBuild, getBuildById } from "./Database";
import BuildDownloader from "./downloader/BuildDownloader";
import { ReleaseChannel } from "./models/Build";

const CHECK_INTERVAL = 5000;

async function run(branch: ReleaseChannel) {
  const downloader = new BuildDownloader(branch);

  const rootInfo = await downloader.getRootInfo().catch(console.error);
  if (!rootInfo) return;

  const buildExists = await getBuildById(rootInfo.id).catch(console.error);
  if (buildExists) return;

  console.log(`[${branch}]: Starting build ${rootInfo.id}...`);

  const build = await downloader.start(rootInfo).catch(console.error);
  if (!build) return;

  const newBuild = await createBuild(build).catch(console.error);
  if (newBuild) console.log(`[${branch}]: Finished build ${rootInfo.id}...`);
}

setInterval(() => {
  run(ReleaseChannel.CANARY).catch(console.error);
}, CHECK_INTERVAL);
