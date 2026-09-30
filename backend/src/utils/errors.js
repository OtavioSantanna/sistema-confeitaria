// Erro de negócio com status HTTP. Lançado pelos services e
// convertido em resposta JSON pelo middleware de erros.
export class AppError extends Error {
  constructor(status, message, detalhes) {
    super(message);
    this.status = status;
    this.detalhes = detalhes;
  }
}

export const badRequest = (msg, detalhes) => new AppError(400, msg, detalhes);
export const notFound = (msg = 'Registro não encontrado') => new AppError(404, msg);
export const conflict = (msg, detalhes) => new AppError(409, msg, detalhes);
