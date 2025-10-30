import { Request, Response } from "express";
import { supabase } from "../supabase/supabase";
import { UploadedFile } from "express-fileupload";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Nombre del bucket de Supabase
const BUCKET_NAME = "ez-order-bucket";

export const uploadFile = async (req: Request, res: Response) => {
  try {
    // Verificar si hay un archivo
    if (!req.files || Object.keys(req.files).length === 0) {
      res.status(400).json({
        success: false,
        message: "No se ha seleccionado ningún archivo",
      });
      return;
    }

    // Obtener la carpeta de destino (si no se especifica, usar "random")
    const folder = req.body.folder || "random";

    // Obtener el archivo
    const file = req.files.file as UploadedFile;

    // Generar un nombre único para el archivo
    const fileExtension = path.extname(file.name);
    const fileName = `${uuidv4()}${fileExtension}`;

    // Ruta completa en el bucket
    const filePath = `${folder}/${fileName}`;

    // Subir el archivo a Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file.data, {
        contentType: file.mimetype,
        cacheControl: "3600",
      });

    if (error) {
      console.error("Error al subir el archivo:", error);
      res.status(500).json({
        success: false,
        message: "Error al subir el archivo",
        error: error.message,
      });
      return;
    }

    // Obtener la URL pública del archivo
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    // Responder con la información del archivo subido
    res.status(200).json({
      success: true,
      message: "Archivo subido correctamente",
      data: {
        fileName: fileName,
        originalName: file.name,
        size: file.size,
        mimetype: file.mimetype,
        path: filePath,
        publicUrl: urlData.publicUrl,
      },
    });
    return;
  } catch (err: any) {
    console.error("Error en el controlador de carga de archivos:", err);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: err.message,
    });
    return;
  }
};
