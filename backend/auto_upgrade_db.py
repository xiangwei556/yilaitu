import sys
import os
from sqlalchemy import inspect, text

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from backend.passport.app.db.session import engine, Base
    # Import Passport models (User, Credential, etc.)
    from backend.passport.app.db import base as passport_base
    
    # Import all models to register them with Base
    from backend.membership.models import membership
    from backend.points.models import points
    from backend.order.models import order
    from backend.notification.models import notification
    from backend.config_center.models import config
    from backend.yilaitumodel.models import model as yilaitumodel_model
    from backend.original_image_record.models import original_image_record
    from backend.feedback.models import feedback
    from backend.payment.models import payment
    from backend.sys_images.models import sys_image
except ImportError as e:
    print(f"Import Error: {e}")
    # Fallback to try adding parent directory if running from backend/
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from backend.passport.app.db.session import engine, Base
    from backend.passport.app.db import base as passport_base
    from backend.membership.models import membership
    from backend.points.models import points
    from backend.order.models import order
    from backend.notification.models import notification
    from backend.config_center.models import config
    from backend.yilaitumodel.models import model as yilaitumodel_model
    from backend.original_image_record.models import original_image_record
    from backend.feedback.models import feedback
    from backend.payment.models import payment
    from backend.sys_images.models import sys_image

def upgrade_db():
    print("Starting database upgrade...")
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    print(f"Existing tables: {existing_tables}")
    
    # 1. Create missing tables
    print("Checking for new tables...")
    Base.metadata.create_all(bind=engine)
    
    # 2. Add missing columns
    print("Checking for missing columns...")
    with engine.connect() as conn:
        for table_name, table in Base.metadata.tables.items():
            if table_name in existing_tables:
                existing_columns = [col['name'] for col in inspector.get_columns(table_name)]
                for column in table.columns:
                    if column.name not in existing_columns:
                        print(f"Adding column {column.name} to table {table_name}")
                        col_type = column.type.compile(engine.dialect)
                        
                        # Handle Nullable
                        nullable = "NULL" if column.nullable else "NOT NULL"
                        
                        # Basic SQL construction
                        alter_stmt = f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type} {nullable}"
                        
                        # Handle Default (Simple cases)
                        if column.server_default:
                            # Extract default value text if possible
                            default_val = column.server_default.arg
                            if isinstance(default_val, str):
                                alter_stmt += f" DEFAULT {default_val}"
                            else:
                                print(f"Warning: Could not extract default for {column.name}, skipping default")
                        
                        try:
                            print(f"Executing: {alter_stmt}")
                            conn.execute(text(alter_stmt))
                            print(f"Successfully added column {column.name}")
                        except Exception as e:
                            print(f"Failed to add column {column.name}: {e}")
    
    print("Database upgrade completed.")

if __name__ == "__main__":
    upgrade_db()
