import { Router } from 'express';
import { facturacionController } from '../controllers/facturacionController';
import { requireAuth } from '../middlewares/auth';
import { requirePermissions } from '../middlewares/permissions';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(requireAuth);

// ==================== DATOS FISCALES ====================

// Obtener datos fiscales activos de un restaurante
router.get(
  '/datos-fiscales/:restaurante_id',
  requirePermissions(['facturacion.ver']),
  facturacionController.getDatosFiscales
);

// Crear datos fiscales
router.post(
  '/datos-fiscales',
  requirePermissions(['facturacion.editar']),
  facturacionController.createDatosFiscales
);

// Actualizar datos fiscales
router.put(
  '/datos-fiscales/:id',
  requirePermissions(['facturacion.editar']),
  facturacionController.updateDatosFiscales
);

// ==================== FACTURAS ====================

// Generar factura desde pedido (debe ir antes de /:restaurante_id para evitar conflicto)
router.post(
  '/facturas/generar',
  requirePermissions(['facturacion.crear']),
  facturacionController.generarFactura
);

// Detalle de una factura
router.get(
  '/facturas/detalle/:id',
  requirePermissions(['facturacion.ver']),
  facturacionController.getFacturaDetalle
);

// Facturas del día
router.get(
  '/facturas/:restaurante_id/hoy',
  requirePermissions(['facturacion.ver']),
  facturacionController.getFacturasHoy
);

// Resumen del día
router.get(
  '/facturas/:restaurante_id/resumen',
  requirePermissions(['facturacion.ver']),
  facturacionController.getResumenDia
);

// Listar facturas con paginación y filtros
router.get(
  '/facturas/:restaurante_id',
  requirePermissions(['facturacion.ver']),
  facturacionController.getFacturas
);

// Anular factura
router.put(
  '/facturas/:id/anular',
  requirePermissions(['facturacion.anular']),
  facturacionController.anularFactura
);

export default router;
