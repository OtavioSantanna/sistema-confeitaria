import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { routes } from './routes/index.js';
import { errorHandler, notFound } from './middlewares/error-handler.js';

export const app = express();

app.use(cors({ origin: env.corsOrigins.length ? env.corsOrigins : false }));
app.use(express.json());

// Versão no caminho: permite evoluir a API sem quebrar o app de celular.
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);
