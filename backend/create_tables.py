import sys
import os

# Add project root to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.passport.app.db.session import engine, Base
# Import all models to register them with Base
from backend.membership.models import membership
from backend.points.models import points
from backend.order.models import order
from backend.notification.models import notification
from backend.config_center.models import config
from backend.yilaitumodel.models import model as yilaitumodel_model
from backend.original_image_record.models import original_image_record

def init_tables():
    print("Creating tables for new modules...")
    # Create all tables with updated schema (without dropping existing tables)
    # Use drop_all() only when you want to completely reset the database
    # Base.metadata.drop_all(bind=engine)
    # print("Old tables dropped.")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully with updated schema.")

if __name__ == "__main__":
    init_tables()
