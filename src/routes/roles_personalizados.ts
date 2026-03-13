import express from "express";
import {
  getPermisos,
  getRoles,
  getRolById,
  createRol,
  updateRol,
  deleteRol,
} from "../controllers/rolesController";
import { requireAuth } from "../middlewares/auth";
import { requirePermissions } from "../middlewares/permissions";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// Obtener permisos disponibles
router.get("/permisos", requirePermissions(["roles.ver"]), getPermisos);

// Rutas de roles personalizados
router.get("/", requirePermissions(["roles.ver"]), getRoles);
router.get("/:id", requirePermissions(["roles.ver"]), getRolById);
router.post("/", requirePermissions(["roles.crear"]), createRol);
router.put("/:id", requirePermissions(["roles.editar"]), updateRol);
router.delete("/:id", requirePermissions(["roles.eliminar"]), deleteRol);

export default router;
