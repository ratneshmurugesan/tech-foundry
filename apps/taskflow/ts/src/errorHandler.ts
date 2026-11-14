import { FastifyError, FastifyInstance } from 'fastify'
import { ZodError } from 'zod'
import { ConflictError, NotFoundError, DatabaseCrashError, UnauthorizedError, ForbiddenError, VerificationError, ServiceUnavailableError } from './errors'

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

        // 2. Fastify native validation (AJV) — the actual type-provider path.
        //    fastify-type-provider-zod compiles Zod schemas to JSON schema, so AJV (not Zod)
        //    does the validation and the error lands HERE, not in the ZodError branch above
        //    (dead for that path). Emit the same generic message + details shape as the PY
        //    kitchen's RequestValidationError handler (ADR-001 parity wall).
        if (error.validation) {
            return response.status(400).send({
                statusCode: 400,
                error: 'Bad Request',
                message: 'Validation failed',
                details: error.validation.map((v) => ({
                    field: v.instancePath.replace(/^\//, '').replace(/\//g, '.'),
                    message: v.message
                }))
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

        if (error instanceof DatabaseCrashError) {
            request.log.error({
                err: error.originalError ?? error
            })

            return response.status(500).send({
                statusCode: 500,
                error: 'Internal Server Error',
                message: error.message,
            })
        }

        if (error instanceof UnauthorizedError) {
            request.log.error({
                err: error.message ?? error
            })

            return response.status(401).send({
                statusCode: 401,
                error: 'Unauthorized',
                message: error.message,
            })
        }

        // 4.5 Semantic 403 Forbidden (parity with the PY kitchen's forbidden_exception_handler)
        if (error instanceof ForbiddenError) {
            request.log.error({
                err: error.message ?? error
            })

            return response.status(403).send({
                statusCode: 403,
                error: 'Forbidden',
                message: error.message,
            })
        }

        if(error instanceof VerificationError) {
            request.log.error({
                err: error.message ?? error
            })

            return response.status(400).send({
                statusCode: 400,
                error: 'Verification',
                message: error.message,
            })
        }

        if(error instanceof ServiceUnavailableError) {
            request.log.error({
                err: error.message ?? error
            })

            return response.status(503).send({
                statusCode: 503,
                error: 'Service Unavailable',
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