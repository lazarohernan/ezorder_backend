import { Router } from 'express';
import { cajaController } from '../controllers/cajaController';
import { requireAuth } from '../middlewares/auth';
import { requirePermissions, requireSuperAdmin } from '../middlewares/permissions';
import { supabase } from '../supabase/supabase';

const router = Router();

// Log básico para depurar rutas de caja
router.use((req, _res, next) => {
  // Nota: al estar montado en /api/caja, originalUrl incluirá el prefijo completo
  console.log(`[CAJA] ${req.method} ${req.originalUrl}`);
  next();
});

// Ruta de prueba sin autenticación
router.get('/test/:restaurante_id', (req, res) => {
  const { restaurante_id } = req.params;
  res.json({
    message: 'Ruta de prueba funcionando',
    restaurante_id,
    timestamp: new Date().toISOString()
  });
});

// Aplicar autenticación a las demás rutas
router.use(requireAuth);

// Rutas para administradores (ver todas las cajas)
router.get('/all', requirePermissions(['caja.ver']), requireSuperAdmin, cajaController.getAllCajas);
router.get('/open', requirePermissions(['caja.ver']), requireSuperAdmin, cajaController.getAllCajasAbiertas);

// Rutas específicas por restaurante (para usuarios normales)
router.get('/restaurante/:restaurante_id', requirePermissions(['caja.ver']), cajaController.getCajas);

// Obtener caja actual (abierta) de un restaurante
router.get('/restaurante/:restaurante_id/actual', requirePermissions(['caja.ver']), cajaController.getCajaActual);

// Obtener resumen de caja del día
router.get('/restaurante/:restaurante_id/resumen', requirePermissions(['caja.ver']), cajaController.getResumenCaja);

// Obtener una caja específica por ID
router.get('/:id', requirePermissions(['caja.ver']), cajaController.getCajaById);

// Abrir caja
router.post('/abrir', requirePermissions(['caja.abrir']), cajaController.abrirCaja);

// Cerrar caja
router.put('/:id/cerrar', requirePermissions(['caja.cerrar']), cajaController.cerrarCaja);

// Actualizar caja (ingresos/egresos adicionales)
router.put('/:id', requirePermissions(['caja.registrar_ingresos']), cajaController.actualizarCaja);

export default router;
