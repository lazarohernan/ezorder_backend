import type { FastifyReply, FastifyRequest } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import type { UploadedFile } from "express-fileupload";

type NextFunction = (error?: unknown) => void;

export type ExpressLikeHandler = (...args: any[]) => unknown | Promise<unknown>;

type UploadedFileMap = Record<string, UploadedFile | UploadedFile[]>;

export type CompatibilityContext = {
  req: any;
  res: any;
};

const pushValue = <T>(current: T | T[] | undefined, value: T): T | T[] => {
  if (current === undefined) {
    return value;
  }

  if (Array.isArray(current)) {
    current.push(value);
    return current;
  }

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
    mv: async () => {
      throw new Error("mv() no está soportado en la capa Fastify");
    },
  } as UploadedFile;
};

export const parseMultipartRequest = async (request: FastifyRequest) => {
  const body: Record<string, unknown> = {};
  const files: UploadedFileMap = {};

  if (!request.isMultipart()) {
    return {
      body,
      files: undefined,
    };
  }

  try {
    const parts = request.parts();

    for await (const part of parts) {
      if (part.type === "file") {
        const uploadedFile = await createUploadedFile(part);
        files[part.fieldname] = pushValue(files[part.fieldname] as any, uploadedFile) as
          | UploadedFile
          | UploadedFile[];
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

export const createCompatibilityContext = (
  request: FastifyRequest,
  reply: FastifyReply
): CompatibilityContext => {
  const req = {
    body: request.body ?? {},
    headers: request.headers,
    hostname: request.hostname,
    ip: request.ip,
    method: request.method,
    originalUrl: request.raw.url || request.url,
    params: request.params ?? {},
    path: request.url.split("?")[0],
    protocol: request.protocol,
    query: request.query ?? {},
    raw: request.raw,
    secure: request.protocol === "https",
    url: request.url,
    __fastifyRequest: request,
    get(name: string) {
      return request.headers[name.toLowerCase()] as string | undefined;
    },
    header(name: string) {
      return request.headers[name.toLowerCase()] as string | undefined;
    },
  } as any;

  const res = {
    locals: {},
    status(code: number) {
      reply.code(code);
      return this;
    },
    code(code: number) {
      reply.code(code);
      return this;
    },
    json(payload: unknown) {
      reply.send(payload);
      return this;
    },
    send(payload: unknown) {
      reply.send(payload);
      return this;
    },
    set(name: string, value: string) {
      reply.header(name, value);
      return this;
    },
    header(name: string, value: string) {
      reply.header(name, value);
      return this;
    },
    setHeader(name: string, value: string) {
      reply.header(name, value);
      return this;
    },
    getHeader(name: string) {
      return reply.getHeader(name);
    },
    end(payload?: unknown) {
      reply.send(payload);
      return this;
    },
    get headersSent() {
      return reply.sent;
    },
  } as any;

  return { req, res };
};

export const runExpressHandlers = async (
  handlers: ExpressLikeHandler[],
  context: CompatibilityContext
) => {
  for (const handler of handlers) {
    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const finish = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };

      const fail = (error: unknown) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };

      const next: NextFunction = (error?: unknown) => {
        if (error) {
          fail(error);
          return;
        }

        finish();
      };

      try {
        const result =
          handler.length >= 3
            ? handler(context.req, context.res, next)
            : handler(context.req, context.res);

        Promise.resolve(result)
          .then(() => {
            if (context.res.headersSent || handler.length < 3) {
              finish();
              return;
            }

            finish();
          })
          .catch(fail);
      } catch (error) {
        fail(error);
      }
    });

    if (context.res.headersSent) {
      return;
    }
  }
};
