import { pool } from '../database/pool.js';

export async function getHealth(req, res) {
  const [[row]] = await pool.query(
    'SELECT VERSION() AS versao, NOW() AS agora, (SELECT COUNT(*) FROM ingrediente) AS ingredientes',
  );
  res.json({ status: 'ok', banco: row });
}
