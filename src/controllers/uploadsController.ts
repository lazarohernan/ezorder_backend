import { Request, Response } from "express";
import { supabaseAdmin } from "../supabase/supabase";
import { UploadedFile } from "express-fileupload";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const BUCKET_NAME = "ez-order-bucket";

export const uploadFile = async (req: Request, res: Response) => {
  try {
    if (!req.user_info) {
      res.status(401).json({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
      return;
    }

    if (!supabaseAdmin) {
      res.status(500).json({
        success: false,
        message: "Error de configuración del servidor",
      });
      return;
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      res.status(400).json({
        success: false,
        message: "No se ha seleccionado ningún archivo",
      });
      return;
    }

    const folder = req.body.folder || "random";
    const file = req.files.file as UploadedFile;

    if (!file) {
      res.status(400).json({
        success: false,
        message: "No se encontró el archivo en la solicitud",
      });
      return;
    }

    const fileExtension = path.extname(file.name);
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = `${folder}/${fileName}`;
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, file.data, {
        contentType: file.mimetype || "application/octet-stream",
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      if (error.message.includes("Bucket not found") || error.message.includes("not found")) {
        res.status(500).json({
          success: false,
          message: `El bucket "${BUCKET_NAME}" no existe. Por favor, crea el bucket en Supabase Storage.`,
          error: error.message,
        });
        return;
      }

      if (error.message.includes("The resource already exists")) {
        const retryFileName = `${uuidv4()}${fileExtension}`;
        const retryFilePath = `${folder}/${retryFileName}`;
        
        const { data: retryData, error: retryError } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .upload(retryFilePath, file.data, {
            contentType: file.mimetype || "application/octet-stream",
            cacheControl: "3600",
            upsert: false,
          });

          if (retryError) {
            throw retryError;
          }

          const { data: urlData } = supabaseAdmin.storage
          .from(BUCKET_NAME)
          .getPublicUrl(retryFilePath);

        res.status(200).json({
          success: true,
          message: "Archivo subido correctamente",
          data: {
            fileName: retryFileName,
            originalName: file.name,
            size: file.size,
            mimetype: file.mimetype,
            path: retryFilePath,
            publicUrl: urlData.publicUrl,
          },
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: "Error al subir el archivo a Supabase Storage",
        error: error.message,
      });
      return;
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

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
      message: "Error interno del servidor al procesar el archivo",
      error: err.message || "Error desconocido",
    });
    return;
  }
};
