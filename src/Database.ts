import { Prisma, PrismaClient } from "@prisma/client";
import Build, { BuildEnv, ReleaseChannel } from "./models/Build";

/**
 * Main database singleton.
 */
export const database = new PrismaClient();

export async function getBuildById(id: string) {
  return database.build.findUnique({
    where: {
      id,
    },
  });
}

// make a function for creating a build and its files
export async function createBuild(build: Build) {
  return database.build.create({
    data: {
      id: build.id,
      releaseChannel: ReleaseChannel[build.releaseChannel],
      buildEnv: BuildEnv[build.buildEnv],
      date: build.date,
      assets: build.assets,
      globalEnv: build.globalEnv,
      files: {
        connectOrCreate: build.files.map((file) => ({
          where: { name: file.fileName },
          create: {
            name: file.fileName,
            tags: file.tags,
            date: file.metadata.lastModified
              ? new Date(file.metadata.lastModified)
              : new Date(),
            referencedFiles: file.referencedFiles,
            experiments: file.experiments as unknown as Prisma.JsonArray,
          },
        })),
      },
    },
  });
}
