import express, { Request, Response } from "express";
import cors from "cors";
import healthRoutes from "../src/routes/health";
import authRoutes from "../src/routes/auth";
import restaurantesRoutes from "../src/routes/restaurantes";
import uploadsRoutes from "../src/routes/uploads";
import usuariosRoutes from "../src/routes/usuarios";
import rolesRoutes from "../src/routes/roles";
import rolesPersonalizadosRoutes from "../src/routes/roles_personalizados";
import menuRoutes from "../src/routes/menu";
import menuCategoriesRoutes from "../src/routes/menuCategories";
import clientesRoutes from "../src/routes/clientes";
import pedidosRoutes from "../src/routes/pedidos";
import pedidoItemsRoutes from "../src/routes/pedidoItems";
import metodoPagoRoutes from "../src/routes/metodoPagoRoutes";
import inventarioRoutes from "../src/routes/inventario";
import cajaRoutes from "../src/routes/caja";
import gastosRoutes from "../src/routes/gastos";
import notificacionesRoutes from "../src/routes/notificaciones";
import invitacionesRoutes from "../src/routes/invitaciones";

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://localhost:5178",
    "http://localhost:5179",
    "https://ezorder-frontal.vercel.app",
    "https://ezorder.vercel.app",
    /\.vercel\.app$/, // Permitir todos los subdominios de vercel.app
    /^https:\/\/ezorder-frontal-.+\.vercel\.app$/, // Permitir previews específicas de ezorder-frontal
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes - Root endpoint
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
    deployment: "vercel-full"
  });
});

// Use routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/restaurantes", restaurantesRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/roles", rolesRoutes);
app.use("/api/roles-personalizados", rolesPersonalizadosRoutes);
app.use("/api/menu/categories", menuCategoriesRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/pedido-items", pedidoItemsRoutes);
app.use("/api/metodos-pago", metodoPagoRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/caja", cajaRoutes);
app.use("/api/gastos", gastosRoutes);
app.use("/api/notificaciones", notificacionesRoutes);
app.use("/api/invitaciones", invitacionesRoutes);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(`Error: ${req.method} ${req.path} → ${err.message || "Error"}`);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    status: err.status || 500
  });
});

// 404 handler para rutas no encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
    method: req.method
  });
});

export default app;
