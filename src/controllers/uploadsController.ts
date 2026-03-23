import type { FastifyRequest, FastifyReply } from "fastify";
import { supabaseAdmin } from "../supabase/supabase";
import type { UploadedFile } from "../utils/multipart";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const BUCKET_NAME = "ez-order-bucket";

export const uploadFile = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!request.user_info) {
      return reply.code(401).send({
        success: false,
        message: "No se encontró información del usuario autenticado",
      });
    }

    if (!supabaseAdmin) {
      return reply.code(500).send({
        success: false,
        message: "Error de configuración del servidor",
      });
    }

    if (!request.files || Object.keys(request.files).length === 0) {
      return reply.code(400).send({
        success: false,
        message: "No se ha seleccionado ningún archivo",
      });
    }

    const folder = (request.body as any)?.folder || "random";
    const file = (request.files as any)?.file as UploadedFile;

    if (!file) {
      return reply.code(400).send({
        success: false,
        message: "No se encontró el archivo en la solicitud",
      });
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
        return reply.code(500).send({
          success: false,
          message: `El bucket "${BUCKET_NAME}" no existe. Por favor, crea el bucket en Supabase Storage.`,
          error: error.message,
        });
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

        return reply.code(200).send({
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
      }

      return reply.code(500).send({
        success: false,
        message: "Error al subir el archivo a Supabase Storage",
        error: error.message,
      });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return reply.code(200).send({
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
  } catch (err: any) {
    console.error("Error en el controlador de carga de archivos:", err);
    throw err;
  }
};
