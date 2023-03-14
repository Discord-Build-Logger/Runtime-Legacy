import { writeFileSync } from "node:fs";
import BuildDownloader from "./downloader/BuildDownloader";

// TODO: Pull from /app
const downloader = new BuildDownloader("https://discord.com/assets/", [
  "cd419838ea4a5acfcc4a.js",
  "1192b898dca269d37364.js",
  "d44ff9afbe89cbb46517.js",
  "5fb40bbd35d3eeebea90.js",
  "40532.4edc73d7c44300b9ad0e.css",
]);

downloader.start().then((d) => {
  writeFileSync("./out.json", JSON.stringify(d, null, 4));
});
