// Express 5 já repassa erros de handlers async ao middleware de erros;
// este helper só deixa os controllers mais curtos.
export const ok = (fn) => async (req, res) => {
  const result = await fn(req, res);
  if (!res.headersSent) res.json(result);
};

export const created = (fn) => async (req, res) => {
  const result = await fn(req, res);
  res.status(201).json(result);
};

export const noContent = (fn) => async (req, res) => {
  await fn(req, res);
  res.status(204).end();
};
