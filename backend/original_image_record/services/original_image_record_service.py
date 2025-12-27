from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
from backend.original_image_record.models.original_image_record import OriginalImageRecord
from backend.original_image_record.schemas.original_image_record import OriginalImageRecordCreate, OriginalImageRecordUpdate
from backend.points.services.points_service import PointsService


class OriginalImageRecordService:
    
    @staticmethod
    def create_record(
        db: Session,
        user_id: int,
        model_id: Optional[int] = None,
        model_name: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None,
        cost_integral: Decimal = Decimal("0")
    ) -> OriginalImageRecord:
        """
        创建生图记录并扣除积分
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            model_id: 模型ID
            model_name: 模型名称
            params: 生成参数
            cost_integral: 消耗积分数量
            
        Returns:
            OriginalImageRecord: 创建的生图记录
            
        Raises:
            ValueError: 积分不足时抛出异常
        """
        if cost_integral > 0:
            try:
                account, transaction = PointsService.deduct_points(
                    db=db,
                    user_id=user_id,
                    amount=cost_integral,
                    source_type="image_generation",
                    remark="生图消耗积分"
                )
                points_transactions_id = transaction.id
            except ValueError as e:
                raise ValueError(str(e))
        else:
            points_transactions_id = None
        
        record = OriginalImageRecord(
            user_id=user_id,
            model_id=model_id,
            model_name=model_name,
            params=params,
            status="pending",
            cost_integral=cost_integral,
            points_transactions_id=points_transactions_id,
            create_time=datetime.now()
        )
        
        db.add(record)
        db.commit()
        db.refresh(record)
        
        return record
    
    @staticmethod
    def get_record_by_id(db: Session, record_id: int) -> Optional[OriginalImageRecord]:
        """
        根据ID获取生图记录
        
        Args:
            db: 数据库会话
            record_id: 记录ID
            
        Returns:
            OriginalImageRecord: 生图记录，不存在则返回None
        """
        return db.query(OriginalImageRecord).filter(OriginalImageRecord.id == record_id).first()
    
    @staticmethod
    def get_records_by_user_id(
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[OriginalImageRecord]:
        """
        根据用户ID获取生图记录列表
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            skip: 跳过记录数
            limit: 返回记录数
            
        Returns:
            List[OriginalImageRecord]: 生图记录列表
        """
        return db.query(OriginalImageRecord).filter(
            OriginalImageRecord.user_id == user_id
        ).order_by(OriginalImageRecord.create_time.desc()).offset(skip).limit(limit).all()
    
    @staticmethod
    def update_record(
        db: Session,
        record_id: int,
        update_data: OriginalImageRecordUpdate
    ) -> Optional[OriginalImageRecord]:
        """
        更新生图记录
        
        Args:
            db: 数据库会话
            record_id: 记录ID
            update_data: 更新数据
            
        Returns:
            OriginalImageRecord: 更新后的记录，不存在则返回None
        """
        record = db.query(OriginalImageRecord).filter(OriginalImageRecord.id == record_id).first()
        
        if not record:
            return None
        
        update_dict = update_data.dict(exclude_unset=True)
        
        for field, value in update_dict.items():
            setattr(record, field, value)
        
        db.commit()
        db.refresh(record)
        
        return record
    
    @staticmethod
    def delete_record(db: Session, record_id: int) -> bool:
        """
        删除生图记录
        
        Args:
            db: 数据库会话
            record_id: 记录ID
            
        Returns:
            bool: 删除成功返回True，记录不存在返回False
        """
        record = db.query(OriginalImageRecord).filter(OriginalImageRecord.id == record_id).first()
        
        if not record:
            return False
        
        db.delete(record)
        db.commit()
        
        return True
    
    @staticmethod
    def count_records_by_user_id(db: Session, user_id: int) -> int:
        """
        统计用户的生图记录数量
        
        Args:
            db: 数据库会话
            user_id: 用户ID
            
        Returns:
            int: 记录数量
        """
        return db.query(OriginalImageRecord).filter(OriginalImageRecord.user_id == user_id).count()
