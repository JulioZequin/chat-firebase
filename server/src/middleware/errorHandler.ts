import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'not-found', message: 'Rota não encontrada.' } });
}

/** Responde erros sem expor detalhes internos ou credenciais. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: { code: 'invalid-json', message: 'JSON inválido.' } });
    return;
  }
  console.error('[api] erro inesperado:', err instanceof Error ? err.message : err);
  res.status(500).json({ error: { code: 'internal', message: 'Erro interno do servidor.' } });
}
