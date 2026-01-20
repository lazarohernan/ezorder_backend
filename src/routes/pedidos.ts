import express from "express";
import {
  getPedidos,
  getPedidoById,
  getPedidosByRestauranteId,
  createPedido,
  updatePedido,
  deletePedido,
} from "../controllers/pedidoController";
import { requireAuth } from "../middlewares/auth";
import { requirePermissions } from "../middlewares/permissions";

const router = express.Router();

// Todas las rutas de pedidos requieren autenticación
router.use(requireAuth);

// Obtener todos los pedidos
router.get("/", requirePermissions(['pedidos.ver']), getPedidos);

// Obtener pedidos por restaurante (antes de /:id para evitar conflicto)
router.get("/restaurante/:restaurante_id", requirePermissions(['pedidos.ver']), getPedidosByRestauranteId);

// Obtener un pedido por ID
router.get("/:id", requirePermissions(['pedidos.ver']), getPedidoById);

// Crear un nuevo pedido
router.post("/", requirePermissions(['pedidos.crear']), createPedido);

// Actualizar un pedido existente
router.put("/:id", requirePermissions(['pedidos.editar']), updatePedido);

// Eliminar un pedido
router.delete("/:id", requirePermissions(['pedidos.eliminar']), deletePedido);

export default router;
