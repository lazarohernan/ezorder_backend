import express, { Request, Response } from "express";

const app = express();

// Middleware
app.use(express.json());

// Routes - Root endpoint with modern API information
app.get("/", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Connection successful",
    api: {
      name: "EZOrder API",
      version: "1.0.0",
      status: "online",
      environment: process.env.NODE_ENV || "production"
    },
    endpoints: {
      health: "/api/health",
      auth: "/api/auth/login",
      docs: "/api/health"
    },
    timestamp: new Date().toISOString(),
    deployment: "vercel-updated"
  });
});

app.get("/api", (req: Request, res: Response) => {
  res.json({ message: "API de EZOrder funcionando correctamente", status: "ok" });
});

// Error handling
app.use((err: any, req: Request, res: Response, next: any) => {
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    status: err.status || 500
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
    method: req.method
  });
});

export default app;
