import express from "express";
import {
  getUsuarios,
  getUsuarioById,
  createUsuario,
  inviteUsuario,
  updateUsuario,
  deleteUsuario,
  getCurrentUserInfo,
  getInvitaciones,
} from "../controllers/usuarioController";
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

// Ruta para invitar un nuevo usuario (envía email de invitación)
router.post("/invite", requirePermissions(['usuarios.crear']), inviteUsuario);

// Ruta para crear información de un nuevo usuario
router.post("/", requirePermissions(['usuarios.crear']), createUsuario);

// Ruta para actualizar información de un usuario
router.put("/:id", requirePermissions(['usuarios.editar']), updateUsuario);

// Ruta para eliminar información de un usuario
router.delete("/:id", requirePermissions(['usuarios.eliminar']), deleteUsuario);

// Ruta para obtener todas las invitaciones
router.get("/invitaciones/list", requirePermissions(['usuarios.ver']), getInvitaciones);

export default router;
