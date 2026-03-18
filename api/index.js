const { buildApp } = require("../dist/app");

let appPromise = null;

const getApp = async () => {
  if (!appPromise) {
    appPromise = buildApp();
  }

  const app = await appPromise;
  await app.ready();
  return app;
};

module.exports = async function handler(req, res) {
  const app = await getApp();
  app.server.emit("request", req, res);
};
