import express from "express";
import {
  getClientes,
  getClientesByRestauranteId,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
} from "../controllers/clienteController";
import { requireAuth } from "../middlewares/auth";
import { requirePermissions } from "../middlewares/permissions";

const router = express.Router();

// Todas las rutas de clientes requieren autenticación
router.use(requireAuth);

// Ruta para obtener todos los clientes (pedidos.crear necesita seleccionar cliente)
router.get("/", requirePermissions(['clientes.ver', 'pedidos.crear']), getClientes);

// Ruta para obtener todos los clientes por restaurante
router.get("/restaurante/:restaurante_id", requirePermissions(['clientes.ver', 'pedidos.crear']), getClientesByRestauranteId);

// Ruta para obtener un cliente por su ID
router.get("/:id", requirePermissions(['clientes.ver', 'pedidos.crear']), getClienteById);

// Ruta para crear un nuevo cliente (también desde el flujo de pedidos)
router.post("/", requirePermissions(['clientes.crear', 'pedidos.crear']), createCliente);

// Ruta para actualizar un cliente existente
router.put("/:id", requirePermissions(['clientes.editar']), updateCliente);

// Ruta para eliminar un cliente
router.delete("/:id", requirePermissions(['clientes.eliminar']), deleteCliente);

export default router;
