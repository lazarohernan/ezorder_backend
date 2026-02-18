import express, { Request, Response } from "express";
import cors from "cors";
import healthRoutes from "./routes/health";
import authRoutes from "./routes/auth";
import restaurantesRoutes from "./routes/restaurantes";
import uploadsRoutes from "./routes/uploads";
import usuariosRoutes from "./routes/usuarios";
import rolesRoutes from "./routes/roles";
import rolesPersonalizadosRoutes from "./routes/roles_personalizados";
import menuRoutes from "./routes/menu";
import menuCategoriesRoutes from "./routes/menuCategories";
import clientesRoutes from "./routes/clientes";
import pedidosRoutes from "./routes/pedidos";
import pedidoItemsRoutes from "./routes/pedidoItems";
import metodoPagoRoutes from "./routes/metodoPagoRoutes";
import inventarioRoutes from "./routes/inventario";
import cajaRoutes from "./routes/caja";
import gastosRoutes from "./routes/gastos";
import notificacionesRoutes from "./routes/notificaciones";
import invitacionesRoutes from "./routes/invitaciones";
import descuentoRoutes from "./routes/descuentoRoutes";

// Initialize express
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
    "https://d3239g075g7j2i.cloudfront.net",
    /\.vercel\.app$/, // Permitir todos los subdominios de vercel.app
    /^https:\/\/ezorder-frontal-.+\.vercel\.app$/, // Permitir previews específicas de ezorder-frontal
  ], // Orígenes permitidos (URL del frontend de Vue)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"], // Métodos HTTP permitidos
  allowedHeaders: ["Content-Type", "Authorization"], // Headers permitidos
  credentials: true, // Permite enviar cookies entre orígenes
  maxAge: 86400, // Tiempo en segundos que se cachean los resultados de preflight (OPTIONS)
};

// Middleware
app.use(cors(corsOptions)); // Aplicar CORS con las opciones definidas
app.use(express.json({ limit: "5mb" })); // Limitar tamaño de payload (5mb para Lambda)
app.use(express.urlencoded({ extended: true, limit: "5mb" })); // Soporte para URL encoded

// Request logging middleware (solo en desarrollo)
if (process.env.NODE_ENV !== "production") {
  app.use((req: Request, res: Response, next) => {
    const timestamp = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const method = req.method.padEnd(6);
    const methodEmoji = {
      "GET": "✓",
      "POST": "+",
      "PUT": "↻",
      "DELETE": "✗",
      "PATCH": "~"
    }[req.method] || "•";

    console.log(`  ${timestamp} ${methodEmoji} ${method} ${req.path}`);
    next();
  });
}

// Routes - Root endpoint with modern connection success container
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
    deployment: "aws-lambda"
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
app.use("/api/descuentos", descuentoRoutes);

// Error handling middleware (debe ir después de todas las rutas)
app.use((err: any, req: Request, res: Response, next: any) => {
  const timestamp = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  console.error(`  ${timestamp} ✗ ${req.method} ${req.path} → ${err.message || "Error"}`);
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
