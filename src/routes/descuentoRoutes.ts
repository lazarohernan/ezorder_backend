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

// Obtener todos los descuentos (cualquier usuario autenticado puede ver)
router.get("/", getDescuentos);

// Obtener solo descuentos activos (cualquier usuario autenticado puede ver)
router.get("/activos", getDescuentosActivos);

// Obtener un descuento por ID (cualquier usuario autenticado puede ver)
router.get("/:id", getDescuentoById);

// Crear un nuevo descuento (requiere permisos de descuentos)
router.post("/", requirePermissions(['descuentos.ver']), createDescuento);

// Actualizar un descuento existente (requiere permisos de descuentos)
router.put("/:id", requirePermissions(['descuentos.ver']), updateDescuento);

// Eliminar un descuento (requiere permisos de descuentos)
router.delete("/:id", requirePermissions(['descuentos.ver']), deleteDescuento);

export default router;
