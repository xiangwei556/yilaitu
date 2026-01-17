import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, Integer
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
from backend.membership.models.subscription import Subscription, SubscriptionStatus
from backend.membership.models.membership import UserMembership, MembershipPackage
from backend.points.models.points import PointsAccount, PointsTransaction
from backend.membership.services.subscription_service import SubscriptionService
from backend.payment.services.business_service import BusinessService
from backend.order.models.order import Order
from backend.passport.app.db.session import Base
import backend.membership.services.chain_manager

# Mock Redlock
class MockRedlock:
    def __init__(self, *args, **kwargs): pass
    def __enter__(self): return self
    def __exit__(self, *args): pass

backend.membership.services.chain_manager.Redlock = MockRedlock

# Patch models for SQLite
Subscription.__table__.c.id.type = Integer()
UserMembership.__table__.c.id.type = Integer()
MembershipPackage.__table__.c.id.type = Integer()
PointsAccount.__table__.c.id.type = Integer()
PointsTransaction.__table__.c.id.type = Integer()
Order.__table__.c.id.type = Integer()

# Setup DB
engine = create_engine('sqlite:///:memory:')
# Create only relevant tables
tables = [
    Subscription.__table__,
    UserMembership.__table__,
    MembershipPackage.__table__,
    PointsAccount.__table__,
    PointsTransaction.__table__,
    Order.__table__
]
Base.metadata.create_all(engine, tables=tables)
Session = sessionmaker(bind=engine)
db = Session()

def test_grant_benefits():
    print("Testing grant_benefits...")
    # 1. Setup Data
    user_id = 1001
    
    # Package
    package = MembershipPackage(
        id=1,
        name="Pro Monthly",
        price=10.0,
        type="professional",
        points=100,
        duration_days=30,
        status="enabled"
    )
    db.add(package)
    
    # Subscription
    subscription = Subscription(
        subscription_sn="TEST_SUB_001",
        user_id=user_id,
        order_id=1,
        type=2, # COMBO
        level_code="professional",
        level_weight=30,
        points_amount=100,
        cycle_days=30,
        status=SubscriptionStatus.ACTIVE,
        expiration_time=datetime.now() + timedelta(days=30)
    )
    db.add(subscription)
    
    # Pre-create PointsAccount to avoid SQLite BigInteger autoincrement issues in test
    points_account_init = PointsAccount(id=1, user_id=user_id, balance_permanent=0, balance_limited=0)
    db.add(points_account_init)
    
    db.commit()
    
    # 2. Call grant_benefits
    service = SubscriptionService(db)
    service.grant_benefits(subscription)
    
    # 3. Verify Points
    points_account = db.query(PointsAccount).filter_by(user_id=user_id).first()
    if points_account and points_account.balance_permanent == 100:
        print("PASS: Points granted correctly.")
    else:
        print(f"FAIL: Points balance is {points_account.balance_permanent if points_account else 'None'}, expected 100")
        
    # 4. Verify UserMembership
    membership = db.query(UserMembership).filter_by(user_id=user_id).first()
    if membership and membership.package_id == 1 and membership.status == 1:
        print("PASS: UserMembership updated correctly.")
    else:
        print(f"FAIL: UserMembership not correct. PackageID={membership.package_id if membership else 'None'}")

def test_business_service_flow():
    print("\nTesting BusinessService flow (Immediate Activation)...")
    user_id = 1002
    
    # Order
    order = Order(
        id=2,
        order_no="ORDER_002",
        user_id=user_id,
        product_id=1, # Uses the package created above
        type="membership",
        status="paid",
        amount=10.0
    )
    db.add(order)
    
    # Pre-create PointsAccount
    points_account_init = PointsAccount(id=2, user_id=user_id, balance_permanent=0, balance_limited=0)
    db.add(points_account_init)
    
    db.commit()
    
    # Call BusinessService
    result = BusinessService.process_membership_order_with_subscription(db, order)
    
    if result:
        print("PASS: BusinessService processed order.")
    else:
        print("FAIL: BusinessService returned False")
        
    # Verify Points (Should be 100)
    points_account = db.query(PointsAccount).filter_by(user_id=user_id).first()
    if points_account and points_account.balance_permanent == 100:
        print("PASS: Points granted via BusinessService.")
    else:
        print(f"FAIL: Points balance is {points_account.balance_permanent if points_account else 'None'}, expected 100")

    # Verify Subscription Status
    sub = db.query(Subscription).filter_by(user_id=user_id).first()
    if sub and sub.status == SubscriptionStatus.ACTIVE:
        print("PASS: Subscription is ACTIVE.")
    else:
        print(f"FAIL: Subscription status is {sub.status if sub else 'None'}")

if __name__ == "__main__":
    try:
        test_grant_benefits()
        test_business_service_flow()
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
