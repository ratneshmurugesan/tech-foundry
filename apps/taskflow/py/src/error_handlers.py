import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .errors import NotFoundError, ConflictError, DatabaseCrashError, UnauthorizedError

logger = logging.getLogger("app")

def register_error_handlers(app: FastAPI):

    # 1. Pydantic Runtime Validation Errors - HTTP 400
    @app.exception_handler(RequestValidationError)
    async def pydantic_validation_exception_handler(request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=400,
            content={
                "statusCode": 400,
                "error": "Bad Request",
                "message": "Validation failed",
                "details": [
                    {
                        "field": ".".join(str(loc) for loc in error["loc"][1:]),
                        "message": error["msg"]
                    }
                    for error in exc.errors()
                ]
            }
        ) 

    #2. Semantic 404 Not Found
    @app.exception_handler(NotFoundError)
    async def not_found_exception_handler(request: Request, exc: NotFoundError):
        return JSONResponse(
            status_code=404,
            content={
                "statusCode": 404,
                "error": "Not Found",
                "message": exc.message
            }
        )

    # 3. Semantic 409 Conflict
    @app.exception_handler(ConflictError)
    async def conflict_exception_handler(request: Request, exc: ConflictError):
        return JSONResponse(
            status_code=409,
            content={
                "statusCode": 409,
                "error": "Conflict",
                "message": exc.message
            }
        )

    @app.exception_handler(DatabaseCrashError)
    async def database_crash_exception_handler(request: Request, exc: Exception):
        logger.error("Internal Server Error Occurred", exc_info=exc)

        return JSONResponse(
            status_code=500,
            content={
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": exc.message
            }
        )

    @app.exception_handler(UnauthorizedError)
    async def unauthorized_exception_handler(request: Request, exc: Exception):
        logger.error("Unauthorized", exc_info=exc)

        return JSONResponse(
            status_code=401,
            content={
                    "statusCode": 401,
                    "error": "Unauthorized",
                    "message": exc.message
            }
        )

    # 4. Fallback for DB Crashes and Uncaught Exceptions (HTTP 500)
    @app.exception_handler(Exception)
    async def universal_exception_handler(request: Request, exc: Exception):
        # Securely logs the raw Python traceback to standard output/file internally
        logger.error("Internal Server Error Occurred", exc_info=exc)

        # Returns an opaque, sanitized response ensuring zero data leaks
        return JSONResponse(
            status_code=500,
            content={
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "An unexpected error occurred. Please try again later."
            }
        )
