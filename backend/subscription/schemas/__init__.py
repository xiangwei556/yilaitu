"""
订阅系统Schemas
"""
from backend.subscription.schemas.contract import (
    ContractCreateRequest,
    ContractCreateResponse,
    ContractQueryResponse,
    ContractCancelRequest,
    ContractListResponse,
    DeductRecordResponse,
)
from backend.subscription.schemas.subscription import (
    SubscriptionResponse,
    SubscriptionChainResponse,
    ToggleAutoRenewalRequest,
    CancelSubscriptionRequest,
)

__all__ = [
    # Contract schemas
    'ContractCreateRequest',
    'ContractCreateResponse',
    'ContractQueryResponse',
    'ContractCancelRequest',
    'ContractListResponse',
    'DeductRecordResponse',
    # Subscription schemas
    'SubscriptionResponse',
    'SubscriptionChainResponse',
    'ToggleAutoRenewalRequest',
    'CancelSubscriptionRequest',
]
