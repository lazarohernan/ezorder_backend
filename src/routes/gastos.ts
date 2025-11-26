import { Router } from 'express';
import { gastosController } from '../controllers/gastosController';
import { requireAuth } from '../middlewares/auth';
import { requirePermissions } from '../middlewares/permissions';

const router = Router();

// Log básico para depurar rutas de gastos
router.use((req, _res, next) => {
  console.log(`[GASTOS] ${req.method} ${req.originalUrl}`);
  next();
});

// Ruta de prueba sin autenticación
router.get('/test/:restaurante_id', (req, res) => {
  const { restaurante_id } = req.params;
  res.json({
    message: 'Ruta de gastos funcionando',
    restaurante_id,
    timestamp: new Date().toISOString()
  });
});

// Aplicar autenticación a las demás rutas
router.use(requireAuth);

// Obtener todos los gastos de un restaurante
router.get('/restaurante/:restaurante_id', requirePermissions(['gastos.ver']), gastosController.getGastos);

// Obtener resumen de gastos por categoría
router.get('/restaurante/:restaurante_id/resumen-categoria', requirePermissions(['gastos.ver']), gastosController.getResumenPorCategoria);

// Obtener total de gastos
router.get('/restaurante/:restaurante_id/total', requirePermissions(['gastos.ver']), gastosController.getTotalGastos);

// Obtener un gasto específico por ID
router.get('/:id', requirePermissions(['gastos.ver']), gastosController.getGastoById);

// Crear un nuevo gasto
router.post('/', requirePermissions(['gastos.crear']), gastosController.createGasto);

// Actualizar un gasto
router.put('/:id', requirePermissions(['gastos.editar']), gastosController.updateGasto);

// Eliminar un gasto
router.delete('/:id', requirePermissions(['gastos.eliminar']), gastosController.deleteGasto);

export default router;


