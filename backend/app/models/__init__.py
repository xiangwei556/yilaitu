# Import all models to ensure they're registered with SQLAlchemy
from app.models.user import User
from app.models.image_task import ImageTask
from app.models.payment import Payment
from app.models.point_record import PointRecord