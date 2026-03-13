import express from "express";
import {
  getDescuentos,
  getDescuentoById,
  getDescuentosActivos,
  createDescuento,
  updateDescuento,
  deleteDescuento,
} from "../controllers/descuentoController";
import { requireAuth } from "../middlewares/auth";
import { requirePermissions } from "../middlewares/permissions";

const router = express.Router();

// Todas las rutas de descuentos requieren autenticación
router.use(requireAuth);

// Obtener todos los descuentos
router.get("/", requirePermissions(['descuentos.ver']), getDescuentos);

// Obtener solo descuentos activos (pedidos.crear necesita ver descuentos disponibles)
router.get("/activos", requirePermissions(['descuentos.ver', 'pedidos.crear']), getDescuentosActivos);

// Obtener un descuento por ID
router.get("/:id", requirePermissions(['descuentos.ver']), getDescuentoById);

// Crear un nuevo descuento (requiere permisos de descuentos)
router.post("/", requirePermissions(['descuentos.crear']), createDescuento);

// Actualizar un descuento existente (requiere permisos de descuentos)
router.put("/:id", requirePermissions(['descuentos.editar']), updateDescuento);

// Eliminar un descuento (requiere permisos de descuentos)
router.delete("/:id", requirePermissions(['descuentos.eliminar']), deleteDescuento);

export default router;
