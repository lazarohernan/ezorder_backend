import express from "express";
import {
  getRestaurantes,
  getRestauranteById,
  createRestaurante,
  updateRestaurante,
  deleteRestaurante,
} from "../controllers/restauranteController";
import { requireAuth } from "../middlewares/auth";
import { requirePermissions } from "../middlewares/permissions";

const router = express.Router();

// Todas las rutas de restaurantes requieren autenticación
router.use(requireAuth);

// Ruta para obtener todos los restaurantes
router.get("/", requirePermissions(['restaurantes.ver']), getRestaurantes);

// Ruta para obtener un restaurante por su ID
router.get("/:id", requirePermissions(['restaurantes.ver']), getRestauranteById);

// Ruta para crear un nuevo restaurante
router.post("/", requirePermissions(['restaurantes.crear']), createRestaurante);

// Ruta para actualizar un restaurante existente
router.put("/:id", requirePermissions(['restaurantes.editar']), updateRestaurante);

// Ruta para eliminar un restaurante
router.delete("/:id", requirePermissions(['restaurantes.eliminar']), deleteRestaurante);

export default router;
