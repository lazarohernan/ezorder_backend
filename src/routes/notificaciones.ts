import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  getNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
  deleteNotificacion,
  getNotificacionesNoLeidasCount
} from "../controllers/notificacionesController";

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(requireAuth);

// Obtener notificaciones del usuario con filtros y paginación
// GET /api/notificaciones?leida=false&tipo=order&pagina=1&limite=10
router.get("/", getNotificaciones);

// Obtener conteo de notificaciones no leídas
// GET /api/notificaciones/no-leidas/count
router.get("/no-leidas/count", getNotificacionesNoLeidasCount);

// Marcar notificación como leída
// PUT /api/notificaciones/:id/leida
router.put("/:id/leida", marcarNotificacionLeida);

// Marcar todas las notificaciones como leídas
// PUT /api/notificaciones/marcar-todas-leidas
router.put("/marcar-todas-leidas", marcarTodasNotificacionesLeidas);

// Eliminar notificación
// DELETE /api/notificaciones/:id
router.delete("/:id", deleteNotificacion);

export default router;
