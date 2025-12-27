from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from backend.passport.app.core.config import settings
#from loguru import logger

engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URI,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10
)

#@event.listens_for(engine, "before_cursor_execute")
#def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
#    logger.info(f"\n{'='*50}\nSQL 执行:\n{statement}\n参数: {parameters}\n{'='*50}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
