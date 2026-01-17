from sqlalchemy import create_engine, text
import sys
sys.path.append('..')
from passport.app.core.config import settings

DATABASE_URL = settings.SQLALCHEMY_DATABASE_URI
engine = create_engine(DATABASE_URL)

with engine.connect() as conn:
    result = conn.execute(text('DESCRIBE sys_poses'))
    print('sys_poses表结构：')
    for row in result:
        print(row)
