import express from "express";
import {
  getMetodosPago,
  getMetodoPagoById,
  createMetodoPago,
  updateMetodoPago,
  deleteMetodoPago,
} from "../controllers/metodoPagoController";
import { requireAuth } from "../middlewares/auth";
import { requirePermissions } from "../middlewares/permissions";

const router = express.Router();

// Todas las rutas de métodos de pago requieren autenticación
router.use(requireAuth);

// Obtener todos los métodos de pago (cualquier usuario autenticado puede ver)
router.get("/", getMetodosPago);

// Obtener un método de pago por ID (cualquier usuario autenticado puede ver)
router.get("/:id", getMetodoPagoById);

// Crear un nuevo método de pago (requiere permisos de dashboard)
router.post("/", requirePermissions(['dashboard.ver']), createMetodoPago);

// Actualizar un método de pago existente (requiere permisos de dashboard)
router.put("/:id", requirePermissions(['dashboard.ver']), updateMetodoPago);

// Eliminar un método de pago (requiere permisos de dashboard)
router.delete("/:id", requirePermissions(['dashboard.ver']), deleteMetodoPago);

export default router;
