import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { requirePermissions } from "../middlewares/permissions";
import {
  getMenuCategories,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
} from "../controllers/menuCategoriesController";

const router = Router();

router.use(requireAuth);

router.get("/", requirePermissions(['categorias.ver']), getMenuCategories);
router.post("/", requirePermissions(['categorias.crear']), createMenuCategory);
router.put("/:id", requirePermissions(['categorias.editar']), updateMenuCategory);
router.delete("/:id", requirePermissions(['categorias.eliminar']), deleteMenuCategory);

export default router;
