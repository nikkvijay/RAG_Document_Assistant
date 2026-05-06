import sys
from pathlib import Path

from loguru import logger


def setup_logging(log_dir: Path, log_level: str) -> None:
    logger.remove()  # clear default stderr handler to avoid duplication

    fmt = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    )
    file_fmt = "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{line} - {message}"

    logger.add(sys.stderr, format=fmt, level=log_level, colorize=True)

    logger.add(
        log_dir / "error.log",
        format=file_fmt,
        level="ERROR",
        rotation="5 MB",
        retention=5,
        enqueue=True,
    )

    logger.add(
        log_dir / "combined.log",
        format=file_fmt,
        level=log_level,
        rotation="5 MB",
        retention=5,
        enqueue=True,
    )
