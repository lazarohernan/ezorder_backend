import express from "express";
import {
  getMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
  getMenusByRestauranteId,
} from "../controllers/menuController";
import { requireAuth } from "../middlewares/auth";
import { requirePermissions } from "../middlewares/permissions";

const router = express.Router();

// Todas las rutas de menú requieren autenticación
router.use(requireAuth);

// Ruta para obtener todos los menús
router.get("/", requirePermissions(['menu.ver']), getMenus);

// Ruta para obtener menús por restaurante
router.get("/restaurante/:restaurante_id", requirePermissions(['menu.ver']), getMenusByRestauranteId);

// Ruta para obtener un menú por su ID
router.get("/:id", requirePermissions(['menu.ver']), getMenuById);

// Ruta para crear un nuevo menú
router.post("/", requirePermissions(['menu.crear']), createMenu);

// Ruta para actualizar un menú existente
router.put("/:id", requirePermissions(['menu.editar']), updateMenu);

// Ruta para eliminar un menú
router.delete("/:id", requirePermissions(['menu.eliminar']), deleteMenu);

export default router;
