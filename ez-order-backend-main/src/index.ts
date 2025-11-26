import express, { Request, Response } from "express";
import path from "path";
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

// Initialize express
const app = express();
const port = process.env.PORT || 3000;

// Configuración de CORS
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:5176",
    "http://localhost:5177",
    "http://localhost:5178",
    "http://localhost:5179"
  ], // Orígenes permitidos (URL del frontend de Vue)
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Métodos HTTP permitidos
  allowedHeaders: ["Content-Type", "Authorization"], // Headers permitidos
  credentials: true, // Permite enviar cookies entre orígenes
  maxAge: 86400, // Tiempo en segundos que se cachean los resultados de preflight (OPTIONS)
};

// Middleware
app.use(cors(corsOptions)); // Aplicar CORS con las opciones definidas
app.use(express.json());

// Routes
app.get("/", (req: Request, res: Response) => {
  res.send("¡Bienvenido a la API de EZOrder!");
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

// Start the server
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
