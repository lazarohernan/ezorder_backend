import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../src/app";

let appPromise: ReturnType<typeof buildApp> | null = null;

const getApp = async () => {
  if (!appPromise) {
    appPromise = buildApp();
  }

  const app = await appPromise;
  await app.ready();
  return app;
};

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  const app = await getApp();
  app.server.emit("request", req, res);
}
