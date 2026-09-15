import { FastifyError, FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { ConflictError, NotFoundError, DatabaseCrashError } from './errors'

export function registerErrorHandler(fastify: FastifyInstance) {
    fastify.setErrorHandler((unknownError: unknown, request, response) => {

        // Safely cast to an Error structure for generic property probing
        const error = unknownError as Error & Partial<FastifyError>;

        // 1. Zod Runtime Validation Errors (HTTP 400)
        if (error instanceof ZodError) {
            return response.status(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Validation failed',
                details: error.issues.map(err => ({
                    field: err.path.join("."),
                    message: err.message
                }))
            })
        }

        // 2. Fastify native validation fallback (in case any non-zod schemas are triggered)
        if (error.validation) {
            return response.status(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: error.message,
            })
        }

        // 3. Semantic 404 Not Found
        if (error instanceof NotFoundError) {
            return response.status(404).send({
                statusCode: 404,
                error: 'Not Found',
                message: error.message,
            });
        }

        // 4. Semantic 409 Conflict
        if (error instanceof ConflictError) {
            return response.status(409).send({
                statusCode: 409,
                error: 'Conflict',
                message: error.message,
            });
        }

        if(error instanceof DatabaseCrashError){
            request.log.error({
                err: error.originalError ?? error
            })

            return response.status(500).send({
                statusCode: 500,
                error: 'Internal Server Error',
                message: error.message,
            })
        }

        // 5. Fallback for DB Crashes and Uncaught Exceptions (HTTP 500)
        request.log.error({ err: error })

        return response.status(500).send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'An unexpected error occurred. Please try again later.',
        })
    })
}