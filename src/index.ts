import app from "./app";

const port = process.env.PORT || 3001;

app.listen(port, () => {
  const env = process.env.NODE_ENV || "development";
  const envEmoji = env === "production" ? "🚀" : "⚡";

  console.log(`\n  ${envEmoji} EZOrder API v1.0.0`);
  console.log(`  ──────────────────────────────`);
  console.log(`  → http://localhost:${port}`);
  console.log(`  → ${env}\n`);
});
