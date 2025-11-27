import express from "express";
import {
  getRoles,
  getRolById,
  createRol,
  updateRol,
  deleteRol,
  getUserPermissions,
} from "../controllers/rolesController";
import { requireAuth } from "../middlewares/auth";
import { requirePermissions } from "../middlewares/permissions";

const router = express.Router();

// Todas las rutas de roles requieren autenticación
router.use(requireAuth);

// Ruta para obtener todos los roles
router.get("/", requirePermissions(['roles.ver']), getRoles);

// Ruta para obtener un rol por su ID
router.get("/:id", requirePermissions(['roles.ver']), getRolById);

// Ruta para crear un nuevo rol
router.post("/", requirePermissions(['roles.crear']), createRol);

// Ruta para actualizar un rol existente
router.put("/:id", requirePermissions(['roles.editar']), updateRol);

// Ruta para eliminar un rol
router.delete("/:id", requirePermissions(['roles.eliminar']), deleteRol);

// Ruta para obtener permisos del usuario actual
router.get("/user/permissions", getUserPermissions);

export default router;
