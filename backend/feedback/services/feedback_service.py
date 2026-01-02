from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from backend.feedback.models.feedback import Feedback
from backend.feedback.schemas.feedback import FeedbackCreate, FeedbackUpdate, FeedbackResponse, FeedbackType, FeedbackStatus
from backend.points.models.points import PointsTransaction
from backend.original_image_record.models.original_image_record import OriginalImageRecord


class FeedbackService:
    def __init__(self, db: Session):
        self.db = db

    def create_feedback(self, feedback_data: FeedbackCreate) -> Feedback:
        db_feedback = Feedback(**feedback_data.model_dump())
        self.db.add(db_feedback)
        self.db.commit()
        self.db.refresh(db_feedback)

        if feedback_data.original_image_record_id:
            from backend.original_image_record.services.original_image_record_service import OriginalImageRecordService
            from backend.original_image_record.schemas.original_image_record import OriginalImageRecordUpdate

            update_data = OriginalImageRecordUpdate(feedback_id=db_feedback.id)
            OriginalImageRecordService.update_record(self.db, feedback_data.original_image_record_id, update_data)

        return db_feedback

    def get_feedback_by_id(self, feedback_id: int) -> Optional[Feedback]:
        return self.db.query(Feedback).filter(Feedback.id == feedback_id).first()

    def get_feedback_list(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> tuple[List[Feedback], int]:
        query = self.db.query(Feedback)

        if status is not None:
            query = query.filter(Feedback.status == status)
        if user_id:
            query = query.filter(Feedback.user_id == user_id)

        total = query.count()
        feedback_list = query.order_by(Feedback.create_time.desc()).offset((page - 1) * page_size).limit(page_size).all()

        return feedback_list, total

    def update_feedback(
        self,
        feedback_id: int,
        update_data: FeedbackUpdate,
        admin_user_id: int
    ) -> Optional[Feedback]:
        feedback = self.get_feedback_by_id(feedback_id)
        if not feedback:
            return None

        old_status = feedback.status
        feedback.status = update_data.status
        feedback.reply_content = update_data.reply_content
        feedback.reply_time = datetime.now()

        if update_data.status == FeedbackStatus.PROCESSED_WITH_REFUND and update_data.refund_points:
            original_record = self.db.query(OriginalImageRecord).filter(
                OriginalImageRecord.id == feedback.original_image_record_id
            ).first()

            if original_record:
                max_refund_points = float(original_record.cost_integral) * 2
                if update_data.refund_points > max_refund_points:
                    raise ValueError(f"返还积分不能大于生图消耗积分的2倍（{max_refund_points}）")

                from backend.points.services.points_service import PointsService

                transaction = PointsService.add_points(
                    db=self.db,
                    user_id=feedback.user_id,
                    amount=Decimal(str(update_data.refund_points)),
                    source_type="feedback_refund",
                    source_id=str(feedback_id),
                    remark=f"反馈返还积分 - {FeedbackType.get_name(feedback.feedback_type)}"
                )

                feedback.points_transactions_id = transaction.id

                if original_record:
                    original_record.feedback_id = feedback.id

        elif update_data.status == FeedbackStatus.PROCESSED_NO_REFUND or update_data.status == FeedbackStatus.PENDING:
            feedback.points_transactions_id = None

            if feedback.original_image_record_id:
                original_record = self.db.query(OriginalImageRecord).filter(
                    OriginalImageRecord.id == feedback.original_image_record_id
                ).first()
                if original_record:
                    original_record.feedback_id = feedback.id

        self.db.commit()
        self.db.refresh(feedback)
        feedback.old_status = old_status
        return feedback

    def get_feedback_detail(self, feedback_id: int) -> Optional[dict]:
        feedback = self.get_feedback_by_id(feedback_id)
        if not feedback:
            return None

        feedback_dict = {
            "id": feedback.id,
            "user_id": feedback.user_id,
            "feedback_type": feedback.feedback_type,
            "feedback_type_name": FeedbackType.get_name(feedback.feedback_type),
            "content": feedback.content,
            "create_time": feedback.create_time,
            "reply_content": feedback.reply_content,
            "reply_time": feedback.reply_time,
            "original_image_record_id": feedback.original_image_record_id,
            "model_id": feedback.model_id,
            "status": feedback.status,
            "points_transactions_id": feedback.points_transactions_id,
            "created_at": feedback.created_at,
            "updated_at": feedback.updated_at
        }

        original_record = None
        original_record_dict = None
        if feedback.original_image_record_id:
            original_record = self.db.query(OriginalImageRecord).filter(
                OriginalImageRecord.id == feedback.original_image_record_id
            ).first()

            if original_record:
                original_record_dict = {
                    "id": original_record.id,
                    "user_id": original_record.user_id,
                    "model_id": original_record.model_id,
                    "model_name": original_record.model_name,
                    "params": original_record.params,
                    "images": original_record.images,
                    "status": original_record.status,
                    "cost_integral": float(original_record.cost_integral),
                    "create_time": original_record.create_time,
                    "points_transactions_id": original_record.points_transactions_id,
                    "feedback_id": original_record.feedback_id
                }

        return {
            "feedback": feedback_dict,
            "original_image_record": original_record_dict
        }
