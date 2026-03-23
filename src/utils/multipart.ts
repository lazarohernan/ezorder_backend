import type { FastifyRequest } from "fastify";
import type { MultipartFile } from "@fastify/multipart";

export type UploadedFile = {
  name: string;
  data: Buffer;
  size: number;
  encoding: string;
  tempFilePath: string;
  truncated: boolean;
  mimetype: string;
  md5: string;
  mv: () => Promise<void>;
};

export type UploadedFileMap = Record<string, UploadedFile | UploadedFile[]>;

const pushValue = <T>(current: T | T[] | undefined, value: T): T | T[] => {
  if (current === undefined) return value;
  if (Array.isArray(current)) { current.push(value); return current; }
  return [current, value];
};

const createUploadedFile = async (part: MultipartFile): Promise<UploadedFile> => {
  const buffer = await part.toBuffer();
  return {
    name: part.filename,
    data: buffer,
    size: buffer.length,
    encoding: part.encoding,
    tempFilePath: "",
    truncated: false,
    mimetype: part.mimetype,
    md5: "",
    mv: async () => { throw new Error("mv() no está soportado en Fastify"); },
  };
};

export const parseMultipartRequest = async (request: FastifyRequest) => {
  const body: Record<string, unknown> = {};
  const files: UploadedFileMap = {};

  if (!request.isMultipart()) {
    return { body, files: undefined };
  }

  try {
    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === "file") {
        const uploadedFile = await createUploadedFile(part);
        files[part.fieldname] = pushValue(files[part.fieldname] as any, uploadedFile) as UploadedFile | UploadedFile[];
        continue;
      }
      body[part.fieldname] = pushValue(body[part.fieldname] as any, part.value);
    }
  } catch (error: any) {
    if (
      error?.code === "FST_REQ_FILE_TOO_LARGE" ||
      error?.code === "FST_FILES_LIMIT" ||
      error?.code === "FST_PARTS_LIMIT"
    ) {
      error.statusCode = 400;
      error.message = "El archivo excede el tamaño máximo permitido de 5MB";
    }
    throw error;
  }

  return {
    body,
    files: Object.keys(files).length > 0 ? files : undefined,
  };
};
