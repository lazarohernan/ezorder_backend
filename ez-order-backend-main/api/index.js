// Vercel Serverless Function entry point
// This file exports the Express app as a Vercel serverless function

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes - TypeScript compila con exports.default, necesitamos acceder a .default
const healthRoutes = require('../dist/routes/health').default || require('../dist/routes/health');
const authRoutes = require('../dist/routes/auth').default || require('../dist/routes/auth');
const restaurantesRoutes = require('../dist/routes/restaurantes').default || require('../dist/routes/restaurantes');
const uploadsRoutes = require('../dist/routes/uploads').default || require('../dist/routes/uploads');
const usuariosRoutes = require('../dist/routes/usuarios').default || require('../dist/routes/usuarios');
const rolesRoutes = require('../dist/routes/roles').default || require('../dist/routes/roles');
const rolesPersonalizadosRoutes = require('../dist/routes/roles_personalizados').default || require('../dist/routes/roles_personalizados');
const menuRoutes = require('../dist/routes/menu').default || require('../dist/routes/menu');
const menuCategoriesRoutes = require('../dist/routes/menuCategories').default || require('../dist/routes/menuCategories');
const clientesRoutes = require('../dist/routes/clientes').default || require('../dist/routes/clientes');
const pedidosRoutes = require('../dist/routes/pedidos').default || require('../dist/routes/pedidos');
const pedidoItemsRoutes = require('../dist/routes/pedidoItems').default || require('../dist/routes/pedidoItems');
const metodoPagoRoutes = require('../dist/routes/metodoPagoRoutes').default || require('../dist/routes/metodoPagoRoutes');
const inventarioRoutes = require('../dist/routes/inventario').default || require('../dist/routes/inventario');
const cajaRoutes = require('../dist/routes/caja').default || require('../dist/routes/caja');
const gastosRoutes = require('../dist/routes/gastos').default || require('../dist/routes/gastos');
const notificacionesRoutes = require('../dist/routes/notificaciones').default || require('../dist/routes/notificaciones');

// Initialize express
const app = express();

// Configuración de CORS para Vercel
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:5173'];

// Función para validar el origen
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origen (como mobile apps o curl requests)
    if (!origin) return callback(null, true);
    
    // Verificar si el origen está en la lista permitida
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Permitir cualquier subdominio de vercel.app si no hay FRONTEND_URL configurado
    if (!process.env.FRONTEND_URL && origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    // Rechazar otros orígenes
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
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

