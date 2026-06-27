import { NextFunction, Request, Response } from 'express'
import { ZodError, ZodType } from 'zod'

export function validate(schema: ZodType) {
    return (req: Request, res: Response, next: NextFunction): void => {
        try {
            req.body = schema.parse(req.body)
            next()
        } catch (err) {
            if (err instanceof ZodError) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: err.issues.map((e) => ({ field: e.path.join('.'), message: e.message }))
                })
                return
            }
            next(err)
        }
    }
}
