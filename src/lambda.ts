import awsLambdaFastify from "@fastify/aws-lambda";
import { buildApp } from "./app";

let proxy: ReturnType<typeof awsLambdaFastify> | null = null;

const getProxy = async () => {
  if (!proxy) {
    const app = await buildApp();
    await app.ready();
    proxy = awsLambdaFastify(app);
  }

  return proxy;
};

export const handler = async (event: any, context: any) => {
  const currentProxy = await getProxy();
  return currentProxy(event, context, undefined as any);
};
