// Vercel Serverless Function entry point
// This file exports the Express app as a Vercel serverless function

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialize express
const app = express();

// Configuración de CORS para Vercel
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'https://ezorder-frontal.vercel.app',
    'https://ezorder.vercel.app',
    /\.vercel\.app$/
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ message: '¡Bienvenido a la API de EZOrder!' });
});

app.get('/api', (req, res) => {
  res.json({ message: 'API de EZOrder funcionando correctamente', status: 'ok' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import and use routes dynamically
try {
  const healthRoutes = require('../src/routes/health').default || require('../src/routes/health');
  const authRoutes = require('../src/routes/auth').default || require('../src/routes/auth');
  const restaurantesRoutes = require('../src/routes/restaurantes').default || require('../src/routes/restaurantes');
  const uploadsRoutes = require('../src/routes/uploads').default || require('../src/routes/uploads');
  const usuariosRoutes = require('../src/routes/usuarios').default || require('../src/routes/usuarios');
  const rolesRoutes = require('../src/routes/roles').default || require('../src/routes/roles');
  const rolesPersonalizadosRoutes = require('../src/routes/roles_personalizados').default || require('../src/routes/roles_personalizados');
  const menuRoutes = require('../src/routes/menu').default || require('../src/routes/menu');
  const menuCategoriesRoutes = require('../src/routes/menuCategories').default || require('../src/routes/menuCategories');
  const clientesRoutes = require('../src/routes/clientes').default || require('../src/routes/clientes');
  const pedidosRoutes = require('../src/routes/pedidos').default || require('../src/routes/pedidos');
  const pedidoItemsRoutes = require('../src/routes/pedidoItems').default || require('../src/routes/pedidoItems');
  const metodoPagoRoutes = require('../src/routes/metodoPagoRoutes').default || require('../src/routes/metodoPagoRoutes');
  const inventarioRoutes = require('../src/routes/inventario').default || require('../src/routes/inventario');
  const cajaRoutes = require('../src/routes/caja').default || require('../src/routes/caja');
  const gastosRoutes = require('../src/routes/gastos').default || require('../src/routes/gastos');
  const notificacionesRoutes = require('../src/routes/notificaciones').default || require('../src/routes/notificaciones');
  const invitacionesRoutes = require('../src/routes/invitaciones').default || require('../src/routes/invitaciones');

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
  app.use('/api/invitaciones', invitacionesRoutes);
} catch (error) {
  console.error('Error loading routes:', error);
}

// Export the app as a Vercel serverless function
module.exports = app;
