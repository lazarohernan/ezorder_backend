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
  eliminarAlerta,
  obtenerProductosStockBajo,
  verificarStockDisponible,
  obtenerEstadisticas,
  obtenerDesglose,
  crearReglaDesglose,
  eliminarReglaDesglose,
} from '../controllers/inventarioController';
import { requireAuth } from '../middlewares/auth';
import { requirePermissions } from '../middlewares/permissions';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(requireAuth);

// Rutas específicas PRIMERO (antes de las rutas con parámetros dinámicos)

// Rutas de estadísticas
router.get('/estadisticas', requirePermissions(['inventario.ver']), obtenerEstadisticas);

// Rutas de alertas - inventario.ver O pedidos.crear (cajeros que crean pedidos deben ver alertas de stock)
router.get('/alertas', requirePermissions(['inventario.ver', 'pedidos.crear']), obtenerAlertas);
router.put('/alertas/marcar-todas-leidas', requirePermissions(['inventario.ver', 'pedidos.crear']), marcarTodasAlertasLeidas);
router.put('/alertas/:id/leer', requirePermissions(['inventario.ver', 'pedidos.crear']), marcarAlertaLeida);
router.delete('/alertas/:id', requirePermissions(['inventario.ver', 'pedidos.crear']), eliminarAlerta);

// Rutas de movimientos (ANTES de /:id)
router.get('/movimientos', requirePermissions(['movimientos.ver']), obtenerMovimientos);
router.post('/movimientos', requirePermissions(['movimientos.crear']), crearMovimiento);

// Rutas de stock (ANTES de /:id)
router.get('/stock-bajo', requirePermissions(['inventario.ver']), obtenerProductosStockBajo);
router.get('/verificar-stock/:inventarioId', requirePermissions(['inventario.ver']), verificarStockDisponible);

// Rutas generales de inventario
router.get('/', requirePermissions(['inventario.ver']), obtenerInventario);
router.post('/', requirePermissions(['inventario.crear']), crearInventario);

// Rutas de desglose (ANTES de /:id genérico)
router.get('/:id/desglose', requirePermissions(['inventario.ver']), obtenerDesglose);
router.post('/:id/desglose', requirePermissions(['inventario.editar']), crearReglaDesglose);
router.delete('/:id/desglose/:reglaId', requirePermissions(['inventario.editar']), eliminarReglaDesglose);

// Rutas con parámetros dinámicos AL FINAL
router.get('/:id', requirePermissions(['inventario.ver']), obtenerInventarioPorId);
router.put('/:id', requirePermissions(['inventario.editar']), actualizarInventario);
router.delete('/:id', requirePermissions(['inventario.eliminar']), eliminarInventario);

export default router;
