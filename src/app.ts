import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyFormbody from "@fastify/formbody";
import fastifyMultipart from "@fastify/multipart";
import checkDatabaseConnection from "./controllers/healthController";
import { corsOptions } from "./http/cors";
import { registerRoutes } from "./http/registerRoutes";

export const buildApp = async () => {
  const app = Fastify({
    logger: false,
    bodyLimit: 5 * 1024 * 1024,
  });

  await app.register(fastifyCors, corsOptions);
  await app.register(fastifyFormbody);
  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });

  // Declarar propiedades custom del request (requerido por Fastify 5)
  app.decorateRequest<any>("user", null);
  app.decorateRequest<any>("user_info", null);
  app.decorateRequest<any>("restaurante_filter", null);

  if (process.env.NODE_ENV !== "production") {
    app.addHook("onRequest", async (request) => {
      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const method = request.method.padEnd(6);
      const methodEmoji =
        {
          GET: "✓",
          POST: "+",
          PUT: "↻",
          DELETE: "✗",
          PATCH: "~",
        }[request.method] || "•";

      console.log(`  ${timestamp} ${methodEmoji} ${method} ${request.url.split("?")[0]}`);
    });
  }

  app.get("/", async () => ({
    success: true,
    message: "Connection successful",
    api: {
      name: "EZOrder API",
      version: "1.0.0",
      status: "online",
      environment: process.env.NODE_ENV || "production",
    },
    endpoints: {
      health: "/api/health",
      auth: "/api/auth/login",
      docs: "/api/health",
    },
    timestamp: new Date().toISOString(),
    deployment: "fastify",
  }));

  app.get("/api", async () => ({
    message: "API de EZOrder funcionando correctamente",
    status: "ok",
  }));

  app.get("/api/health", checkDatabaseConnection);

  await registerRoutes(app);

  app.setErrorHandler((error, request, reply) => {
    const errorWithStatus = error as {
      message?: string;
      status?: number;
      statusCode?: number;
    };
    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    console.error(
      `  ${timestamp} ✗ ${request.method} ${request.url.split("?")[0]} → ${errorWithStatus.message || "Error"}`
    );

    reply.status(errorWithStatus.statusCode || errorWithStatus.status || 500).send({
      error: errorWithStatus.message || "Internal server error",
      status: errorWithStatus.statusCode || errorWithStatus.status || 500,
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: "Not found",
      path: request.url.split("?")[0],
      method: request.method,
    });
  });

  return app;
};
