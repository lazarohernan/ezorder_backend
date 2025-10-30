import { Router } from 'express';
import {
  obtenerInventario,
  obtenerInventarioPorId,
  crearInventario,
  actualizarInventario,
  eliminarInventario,
  obtenerMovimientos,
  crearMovimiento,
  obtenerAlertas,
  marcarAlertaLeida,
  marcarTodasAlertasLeidas,
  obtenerProductosStockBajo,
  verificarStockDisponible,
  obtenerEstadisticas
} from '../controllers/inventarioController';
import { requireAuth } from '../middlewares/auth';
import { requirePermissions } from '../middlewares/permissions';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(requireAuth);

// Rutas específicas PRIMERO (antes de las rutas con parámetros dinámicos)

// Rutas de estadísticas
router.get('/estadisticas', requirePermissions(['inventario.ver']), obtenerEstadisticas);

// Rutas de alertas (ANTES de /:id)
router.get('/alertas', requirePermissions(['alertas.ver']), obtenerAlertas);
router.put('/alertas/marcar-todas-leidas', requirePermissions(['alertas.ver']), marcarTodasAlertasLeidas);
router.put('/alertas/:id/leer', requirePermissions(['alertas.ver']), marcarAlertaLeida);

// Rutas de movimientos (ANTES de /:id)
router.get('/movimientos', requirePermissions(['inventario.ver_movimientos']), obtenerMovimientos);
router.post('/movimientos', requirePermissions(['inventario.registrar_movimientos']), crearMovimiento);

// Rutas de stock (ANTES de /:id)
router.get('/stock-bajo', requirePermissions(['inventario.ver']), obtenerProductosStockBajo);
router.get('/verificar-stock/:menuId', requirePermissions(['inventario.ver']), verificarStockDisponible);

// Rutas generales de inventario
router.get('/', requirePermissions(['inventario.ver']), obtenerInventario);
router.post('/', requirePermissions(['inventario.crear']), crearInventario);

// Rutas con parámetros dinámicos AL FINAL
router.get('/:id', requirePermissions(['inventario.ver']), obtenerInventarioPorId);
router.put('/:id', requirePermissions(['inventario.editar']), actualizarInventario);
router.delete('/:id', requirePermissions(['inventario.eliminar']), eliminarInventario);

export default router;
