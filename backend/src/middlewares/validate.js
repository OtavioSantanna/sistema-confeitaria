// Valida req.body / req.query / req.params com schemas Zod.
// O resultado validado (já convertido) fica em req.valid.
export function validate({ body, query, params } = {}) {
  return (req, res, next) => {
    req.valid = {
      body: body ? body.parse(req.body ?? {}) : req.body,
      query: query ? query.parse(req.query ?? {}) : req.query,
      params: params ? params.parse(req.params ?? {}) : req.params,
    };
    next();
  };
}
