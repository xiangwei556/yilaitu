from sqlalchemy import Column, String, DateTime, Boolean, BigInteger, Integer, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.passport.app.db.session import Base


class YiLaiTuModel(Base):
    __tablename__ = "yilaitu_models"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=True)
    gender = Column(String(10), nullable=False)  # male, female
    age_group = Column(String(20), nullable=False)  # child, youth, middle, senior
    body_type = Column(String(20), nullable=False)  # standard, chubby, thin
    style = Column(String(50), nullable=False)  # euro, korean, japanese, etc.
    status = Column(String(20), default="enabled")  # enabled, disabled
    type = Column(String(20), default="system")  # system, user
    user_id = Column(BigInteger, nullable=True)  # 关联创建者用户ID
    avatar = Column(String(255), nullable=True)  # cover/thumbnail image path
    copy_system_model = Column(Integer, default=0)  # 0=不是拷贝系统模特, 1=是拷贝的系统模特

    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    images = relationship("YiLaiTuModelImage", back_populates="model", cascade="all, delete-orphan")


class YiLaiTuModelImage(Base):
    __tablename__ = "yilaitu_model_images"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    model_id = Column(BigInteger, ForeignKey("yilaitu_models.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(255), nullable=False)
    view = Column(String(50), nullable=True)  # angle/view tag
    is_cover = Column(Boolean, default=False)

    created_at = Column(DateTime, default=func.now())

    model = relationship("YiLaiTuModel", back_populates="images")

