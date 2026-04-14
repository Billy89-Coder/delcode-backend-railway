export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: 'Invalid input',
        errors: result.error.issues.map((i) => i.message)
      });
    }
    req.body = result.data;
    next();
  };
}
