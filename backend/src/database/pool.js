import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

// Pool de conexões compartilhado pelos repositories.
//
// DECIMAL vem como STRING de propósito (padrão do mysql2): converter para
// Number perderia precisão. Os cálculos de quantidade devem usar uma
// biblioteca decimal (ex.: decimal.js) — ver README.
export const pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '-03:00',
  dateStrings: true,
  charset: 'utf8mb4',
});

// Executa `fn` dentro de uma transação (commit/rollback automáticos).
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
