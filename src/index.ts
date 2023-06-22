import { writeFileSync } from "node:fs";
import amqplib from "amqplib";
import { createBuild, getBuildById } from "./Database";
import BuildDownloader from "./downloader/BuildDownloader";
import { ReleaseChannel } from "./models/Build";

const USE_RABBITMQ = process.env.USE_RABBITMQ ? true : false;

const queue = "tasks";
let conn: amqplib.Channel;

const connect = async () => {
  try {
    const connection = await amqplib.connect(
      "amqp://guest:guest@rabbitmq:5672"
    );
    console.log("Connected to RabbitMQ");
    const channel = await connection.createChannel();
    await channel.assertQueue(queue);
    return channel;
  } catch (error) {
    console.log(error);
  }
};

const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL ?? "5000");

const active = new Map<ReleaseChannel, boolean>();

async function run(branch: ReleaseChannel) {
  const downloader = new BuildDownloader(branch, { saveToDisk: true });

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

async function main() {
  conn = (await connect()) as amqplib.Channel;
  if (!conn) throw new Error("Failed to connect to RabbitMQ");

  conn.prefetch(1);

  conn.consume(queue, async (msg) => {
    if (!msg?.content) return conn.ack(msg!);
    const downloader = new BuildDownloader(ReleaseChannel.CANARY, {
      saveToDisk: false,
    });

    const id = msg.content.toString();
    if (!/^[a-z0-9]+$/i.test(id)) {
      console.log("Invalid build id");
      return conn.ack(msg);
    }

    const rootInfo = await downloader.getRootInfo({ id }).catch(console.error);
    if (!rootInfo) return conn.ack(msg);

    const buildExists = await getBuildById(rootInfo.id).catch(console.error);
    if (buildExists) return conn.ack(msg);

    console.log(`[CANARY]: Starting build ${rootInfo.id}...`);

    const build = await downloader.start(rootInfo).catch(console.error);
    if (!build) return conn.ack(msg);

    const newBuild = await createBuild(build).catch(console.error);
    if (newBuild) console.log(`[CANARY]: Finished build ${rootInfo.id}...`);

    conn.ack(msg);
  });
}

// Regular check interval
setInterval(() => {
  if (active.get(ReleaseChannel.CANARY)) return;
  active.set(ReleaseChannel.CANARY, true);
  run(ReleaseChannel.CANARY)
    .catch(console.error)
    .finally(() => {
      active.set(ReleaseChannel.CANARY, false);
    });
}, CHECK_INTERVAL);

if (USE_RABBITMQ) main();
