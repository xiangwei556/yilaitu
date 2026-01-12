import asyncio
import sys
import os
from unittest.mock import MagicMock, AsyncMock

# Add project root to path
sys.path.append(os.getcwd())

# Mock dependencies BEFORE importing services that use them
sys.modules['backend.passport.app.db.redis'] = MagicMock()
sys.modules['backend.passport.app.db.redis'].get_redis = AsyncMock()

# Now import
from backend.passport.app.services.sms_service import SMSService
from backend.passport.app.services.auth_service import AuthService
from backend.passport.app.core.exceptions import ValidationError

async def test_auth_logic():
    print("=== Testing Auth Logic ===")
    
    # 1. Test Universal Code
    print("\n1. Testing Universal Code '5567'...")
    sms_service = SMSService()
    result = await sms_service.verify_code("13800000000", "5567")
    if result:
        print("✅ Universal code accepted")
    else:
        print("❌ Universal code rejected")
        
    # 2. Test Incorrect Code
    print("\n2. Testing Incorrect Code '1111'...")
    # Mock Redis to return something else or None
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None # No code stored
    
    # We need to patch the get_redis call inside verify_code
    # Since we can't easily patch inside the class method without mock library overhead,
    # and verify_code calls `await get_redis()`.
    # Let's rely on the module mock we set up.
    sys.modules['backend.passport.app.db.redis'].get_redis.return_value = mock_redis
    
    result = await sms_service.verify_code("13800000000", "1111")
    if not result:
        print("✅ Incorrect code rejected")
    else:
        print("❌ Incorrect code accepted (Unexpected)")

    # 3. Test AuthService.login_by_phone Error Handling
    print("\n3. Testing AuthService Login Error Handling...")
    mock_db = MagicMock()
    
    # We want to verify that login_by_phone raises ValidationError when code is wrong
    try:
        # We know verify_code("...", "1111") returns False from step 2
        await AuthService.login_by_phone(mock_db, "13800000000", "1111")
        print("❌ Login did not raise exception for wrong code")
    except ValidationError as e:
        print(f"✅ Login raised ValidationError as expected: {e}")
    except Exception as e:
        print(f"❌ Login raised unexpected exception: {type(e)} {e}")

if __name__ == "__main__":
    asyncio.run(test_auth_logic())
