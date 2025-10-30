import express from "express";
import {
  getPedidoItems,
  getPedidoItemById,
  getItemsByPedidoId,
  createPedidoItem,
  updatePedidoItem,
  deletePedidoItem,
  marcarEnviadoACocina,
  createPedidoItemsBatch,
} from "../controllers/pedidoItemController";
import { requireAuth } from "../middlewares/auth";
import { requirePermissions } from "../middlewares/permissions";

const router = express.Router();

// Todas las rutas de ítems de pedido requieren autenticación
router.use(requireAuth);

// Obtener todos los ítems de pedido
router.get("/", requirePermissions(['pedidos.ver']), getPedidoItems);

// Obtener ítems por pedido (antes de /:id)
router.get("/pedido/:pedido_id", requirePermissions(['pedidos.ver']), getItemsByPedidoId);

// Obtener un ítem de pedido por ID
router.get("/:id", requirePermissions(['pedidos.ver']), getPedidoItemById);

// Crear un nuevo ítem de pedido
router.post("/", requirePermissions(['pedidos.crear']), createPedidoItem);

// Crear múltiples ítems de pedido en batch
router.post("/batch", requirePermissions(['pedidos.crear']), createPedidoItemsBatch);

// Actualizar un ítem de pedido existente
router.put("/:id", requirePermissions(['pedidos.editar']), updatePedidoItem);

// Rutas especiales para actualización de estados (antes de /:id general)
router.put("/:id/enviar-cocina", requirePermissions(['pedidos.cambiar_estado']), marcarEnviadoACocina);

// Eliminar un ítem de pedido
router.delete("/:id", requirePermissions(['pedidos.editar']), deletePedidoItem);

export default router;
