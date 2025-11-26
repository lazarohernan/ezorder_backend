import express from "express";
import {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  getCurrentUserInfo,
} from "../controllers/usuarioController";
import { createInvitacion } from "../controllers/invitacionController";
import { requireAuth } from "../middlewares/auth";
import { requirePermissions } from "../middlewares/permissions";

const router = express.Router();

// Todas las rutas de usuarios requieren autenticación
router.use(requireAuth);

// Ruta para obtener el perfil del usuario actual (sin permisos especiales)
router.get("/me", getCurrentUserInfo);

// Ruta para obtener todos los usuarios
router.get("/", requirePermissions(['usuarios.ver']), getUsuarios);

// Ruta para obtener un usuario por su ID
router.get("/:id", requirePermissions(['usuarios.ver']), getUsuarioById);

// Ruta para crear una nueva invitación
router.post("/invite", requirePermissions(['usuarios.crear']), createInvitacion);

// Ruta para crear información de un nuevo usuario
router.post("/", requirePermissions(['usuarios.crear']), createUsuario);

// Ruta para actualizar información de un usuario
router.put("/:id", requirePermissions(['usuarios.editar']), updateUsuario);

// Ruta para eliminar información de un usuario
router.delete("/:id", requirePermissions(['usuarios.eliminar']), deleteUsuario);

export default router;
