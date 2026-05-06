from fastapi import Request, status
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, message: str, status_code: int = 500) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": {"message": exc.message}},
    )


async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    from loguru import logger
    from app.config import get_settings

    settings = get_settings()
    logger.exception("Unhandled exception")

    content: dict = {"success": False, "error": {"message": "Internal server error"}}
    if settings.is_development:
        content["error"]["detail"] = str(exc)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=content,
    )


