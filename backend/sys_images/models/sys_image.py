from sqlalchemy import Column, String, DateTime, BigInteger, Table, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from backend.passport.app.db.session import Base


# Association table for many-to-many relationship between model refs and categories
sys_model_ref_categories = Table(
    "sys_model_ref_categories",
    Base.metadata,
    Column("model_ref_id", BigInteger, ForeignKey("sys_model_refs.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", BigInteger, ForeignKey("sys_categories.id", ondelete="CASCADE"), primary_key=True),
)


class SysCategory(Base):
    """类目管理表"""
    __tablename__ = "sys_categories"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="类目名称")
    status = Column(String(20), default="enabled", comment="状态: enabled/disabled")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationship to model reference images (many-to-many)
    model_refs = relationship(
        "SysModelRef",
        secondary=sys_model_ref_categories,
        back_populates="categories"
    )


class SysModelRef(Base):
    """模特参考图表"""
    __tablename__ = "sys_model_refs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    image_url = Column(String(500), nullable=True, comment="图片路径")
    gender = Column(String(10), nullable=False, comment="性别: male/female")
    age_group = Column(String(20), nullable=False, comment="年龄分段: child/youth/middle/senior")
    status = Column(String(20), default="enabled", comment="状态: enabled/disabled")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationship to categories (many-to-many)
    categories = relationship(
        "SysCategory",
        secondary=sys_model_ref_categories,
        back_populates="model_refs"
    )


class SysScene(Base):
    """场景图表"""
    __tablename__ = "sys_scenes"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="场景名称")
    image_url = Column(String(500), nullable=False, comment="场景图片路径")
    style = Column(BigInteger, nullable=False, default=1, comment="风格: 1-日常生活风, 2-时尚杂志风, 3-运动活力风")
    status = Column(String(20), default="enabled", comment="状态: enabled/disabled")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class SysPose(Base):
    """姿势图表"""
    __tablename__ = "sys_poses"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="姿势名称")
    gender = Column(String(10), nullable=False, default="all", comment="性别: male/female/all")
    image_url = Column(String(500), nullable=True, comment="姿势图片路径")
    skeleton_url = Column(String(500), nullable=True, comment="姿势骨架图路径")
    status = Column(String(20), default="enabled", comment="状态: enabled/disabled")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())


class SysBackground(Base):
    """背景图表"""
    __tablename__ = "sys_backgrounds"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, comment="背景名称")
    image_url = Column(String(500), nullable=False, comment="背景图片路径")
    status = Column(String(20), default="enabled", comment="状态: enabled/disabled")
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
