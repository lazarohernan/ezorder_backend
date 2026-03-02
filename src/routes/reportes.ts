import express from "express";
import { previewReporte } from "../controllers/reportesController";
import { requireAuth } from "../middlewares/auth";
import { requirePermissions } from "../middlewares/permissions";

const router = express.Router();

router.use(requireAuth);

// Fase 1: solo vista previa con lógica real
router.post("/preview", requirePermissions(["reportes.ver"]), previewReporte);

export default router;

