import express from "express";
import {
  createInvitacion,
  getInvitaciones,
  deleteInvitacion,
  resendInvitacion,
} from "../controllers/invitacionController";
import { requireAuth } from "../middlewares/auth";
import { requirePermissions } from "../middlewares/permissions";

const router = express.Router();

// Todas las rutas de invitaciones requieren autenticación
router.use(requireAuth);

// Ruta para crear una nueva invitación
router.post("/", requirePermissions(['invitaciones.crear']), createInvitacion);

// Ruta para obtener todas las invitaciones
router.get("/", requirePermissions(['invitaciones.ver']), getInvitaciones);

// Ruta para eliminar una invitación
router.delete("/:id", requirePermissions(['invitaciones.eliminar']), deleteInvitacion);

// Ruta para reenviar una invitación (con límites de tiempo y cantidad)
router.post("/:id/resend", requirePermissions(['invitaciones.reenviar']), resendInvitacion);

export default router;
