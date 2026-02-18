import express from "express";
import fileUpload from "express-fileupload";
import { uploadFile } from "../controllers/uploadsController";
import { requireAuth } from "../middlewares/auth";

const router = express.Router();

// Aplicar autenticación a todas las rutas de uploads
router.use(requireAuth);

// Configuración de fileUpload
router.use(
  fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB (Lambda payload max = 6MB)
    abortOnLimit: true,
    useTempFiles: false, // No usar archivos temporales
    createParentPath: true, // Crear carpetas si no existen
  })
);

// Ruta para subir archivos
router.post("/", uploadFile);

export default router;
