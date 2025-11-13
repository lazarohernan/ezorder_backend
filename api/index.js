// Vercel Serverless Function entry point
// This file exports the Express app as a Vercel serverless function

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const healthRoutes = require('../ez-order-backend-main/dist/routes/health');
const authRoutes = require('../ez-order-backend-main/dist/routes/auth');
const restaurantesRoutes = require('../ez-order-backend-main/dist/routes/restaurantes');
const uploadsRoutes = require('../ez-order-backend-main/dist/routes/uploads');
const usuariosRoutes = require('../ez-order-backend-main/dist/routes/usuarios');
const rolesRoutes = require('../ez-order-backend-main/dist/routes/roles');
const rolesPersonalizadosRoutes = require('../ez-order-backend-main/dist/routes/roles_personalizados');
const menuRoutes = require('../ez-order-backend-main/dist/routes/menu');
const menuCategoriesRoutes = require('../ez-order-backend-main/dist/routes/menuCategories');
const clientesRoutes = require('../ez-order-backend-main/dist/routes/clientes');
const pedidosRoutes = require('../ez-order-backend-main/dist/routes/pedidos');
const pedidoItemsRoutes = require('../ez-order-backend-main/dist/routes/pedidoItems');
const metodoPagoRoutes = require('../ez-order-backend-main/dist/routes/metodoPagoRoutes');
const inventarioRoutes = require('../ez-order-backend-main/dist/routes/inventario');
const cajaRoutes = require('../ez-order-backend-main/dist/routes/caja');
const gastosRoutes = require('../ez-order-backend-main/dist/routes/gastos');
const notificacionesRoutes = require('../ez-order-backend-main/dist/routes/notificaciones');

// Initialize express
const app = express();

// Configuración de CORS para Vercel
const corsOptions = {
  origin: process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',') 
    : ['http://localhost:5173', 'https://*.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('¡Bienvenido a la API de EZOrder!');
});

// Use routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/restaurantes', restaurantesRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/roles-personalizados', rolesPersonalizadosRoutes);
app.use('/api/menu/categories', menuCategoriesRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/pedido-items', pedidoItemsRoutes);
app.use('/api/metodos-pago', metodoPagoRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/caja', cajaRoutes);
app.use('/api/gastos', gastosRoutes);
app.use('/api/notificaciones', notificacionesRoutes);

// Export the app as a Vercel serverless function
module.exports = app;

