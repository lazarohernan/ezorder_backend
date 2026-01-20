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
import { requireSuperAdmin } from "../middlewares/permissions";

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// Obtener permisos disponibles (Admin Tradicional y Super Admin)
router.get("/permisos", getPermisos);

// Rutas de roles personalizados (Admin Tradicional y Super Admin)
router.get("/", getRoles);
router.get("/:id", getRolById);
router.post("/", requireSuperAdmin, createRol);
router.put("/:id", requireSuperAdmin, updateRol);
router.delete("/:id", requireSuperAdmin, deleteRol);

export default router;
