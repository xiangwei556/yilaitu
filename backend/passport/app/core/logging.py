import sys
from loguru import logger
from backend.passport.app.core.config import settings

def setup_logging():
    logger.remove()
    logger.add(
        sys.stderr,
        level="INFO",
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    )
    # Add file handler
    logger.add(
        "logs/passport.log",
        rotation="500 MB",
        retention="10 days",
        level="INFO",
        compression="zip"
    )

setup_logging()
