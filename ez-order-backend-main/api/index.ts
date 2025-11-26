import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

// Import routes
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

// Initialize express
const app = express();

// Configuración de CORS
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "https://ezorder-frontal.vercel.app",
    "https://ezorder.vercel.app",
    /\.vercel\.app$/
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  maxAge: 86400,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Root route
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "¡Bienvenido a la API de EZOrder!" });
});

app.get("/api", (req: Request, res: Response) => {
  res.json({ message: "API de EZOrder funcionando correctamente", status: "ok" });
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

// Export the Express app for Vercel
export default app;
