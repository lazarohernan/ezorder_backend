import { buildApp } from "./app";

const start = async () => {
  const port = Number(process.env.PORT || 3001);
  const app = await buildApp();

  try {
    await app.listen({ port, host: "0.0.0.0" });

    const env = process.env.NODE_ENV || "development";
    const envEmoji = env === "production" ? "🚀" : "⚡";

    console.log(`\n  ${envEmoji} EZOrder API v1.0.0`);
    console.log("  ──────────────────────────────");
    console.log(`  → http://localhost:${port}`);
    console.log(`  → ${env}\n`);
  } catch (error) {
    console.error("Error al iniciar EZOrder API:", error);
    process.exit(1);
  }
};

void start();
