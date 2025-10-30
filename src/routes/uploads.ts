import express from "express";
import fileUpload from "express-fileupload";
import { uploadFile } from "../controllers/uploadsController";

const router = express.Router();

// Configuración de fileUpload
router.use(
  fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB
    abortOnLimit: true,
    useTempFiles: false, // No usar archivos temporales
    createParentPath: true, // Crear carpetas si no existen
  })
);

// Ruta para subir archivos
router.post("/", uploadFile);

export default router;
