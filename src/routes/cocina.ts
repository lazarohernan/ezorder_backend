import express from "express";
import { getPedidosCocina } from "../controllers/cocinaController";
import { requireAuth } from "../middlewares/auth";
import { requirePermissions } from "../middlewares/permissions";

const router = express.Router();

// Todas las rutas de cocina requieren autenticación
router.use(requireAuth);

// Obtener pedidos en preparación para cocina de un restaurante
router.get(
  "/:restaurante_id",
  requirePermissions(["cocina.ver"]),
  getPedidosCocina
);

export default router;
