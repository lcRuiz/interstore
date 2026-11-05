import type { Request, RequestHandler, Response } from 'express';
import type { z } from 'zod';
import { AppError } from '../errors/app-error.js';

type Location = 'params' | 'query' | 'body';
type Schemas = Partial<Record<Location, z.ZodType>>;

type InferPart<S, K extends Location> = S extends Record<K, infer T extends z.ZodType> ? z.output<T> : undefined;

export type ValidatedInput<S extends Schemas> = {
  params: InferPart<S, 'params'>;
  query: InferPart<S, 'query'>;
  body: InferPart<S, 'body'>;
};

export interface ValidationIssue {
  location: Location;
  path: string;
  message: string;
}

/**
 * Envuelve un handler: valida params/query/body con Zod y entrega al handler
 * los datos ya parseados y tipados. Si algo falla, responde 400
 * VALIDATION_ERROR con todos los problemas encontrados (no solo el primero).
 *
 * Se entrega el input como argumento en vez de mutar `req` porque en
 * Express 5 `req.query` es de solo lectura.
 */
export function withValidation<S extends Schemas>(
  schemas: S,
  handler: (input: ValidatedInput<S>, req: Request, res: Response) => unknown,
): RequestHandler {
  return async (req, res) => {
    const input = parseRequest(schemas, req);
    await handler(input, req, res);
  };
}

function parseRequest<S extends Schemas>(schemas: S, req: Request): ValidatedInput<S> {
  const output: Partial<Record<Location, unknown>> = {};
  const issues: ValidationIssue[] = [];

  for (const location of ['params', 'query', 'body'] as const) {
    const schema = schemas[location];
    if (!schema) continue;

    const result = schema.safeParse(req[location]);
    if (result.success) {
      output[location] = result.data;
    } else {
      issues.push(
        ...result.error.issues.map((issue) => ({
          location,
          path: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }
  }

  if (issues.length > 0) {
    throw AppError.badRequest('VALIDATION_ERROR', 'Datos de entrada inválidos', issues);
  }
  return output as ValidatedInput<S>;
}
