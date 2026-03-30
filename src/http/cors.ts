import type { FastifyCorsOptions } from "@fastify/cors";

const allowedOrigins: Array<string | RegExp> = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "http://localhost:5178",
  "http://localhost:5179",
  "https://d3239g075g7j2i.cloudfront.net",
  "https://chickfryend.com",
  "https://www.chickfryend.com",

];

export const corsOptions: FastifyCorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    const isAllowed = allowedOrigins.some((allowedOrigin) =>
      typeof allowedOrigin === "string"
        ? allowedOrigin === origin
        : allowedOrigin.test(origin)
    );

    callback(null, isAllowed);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
};
