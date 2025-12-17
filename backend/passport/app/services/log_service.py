from sqlalchemy.orm import Session
from backend.passport.app.models.operation_log import OperationLog

class LogService:
    @staticmethod
    def create_log(
        db: Session,
        user_id: int,
        event_type: str,
        status: str,
        ip: str = None,
        device_fingerprint: str = None,
        detail: str = None
    ):
        log = OperationLog(
            user_id=user_id,
            event_type=event_type,
            status=status,
            ip=ip,
            device_fingerprint=device_fingerprint,
            detail=detail
        )
        db.add(log)
        db.commit()

log_service = LogService()
