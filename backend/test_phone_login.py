import asyncio
import sys
from sqlalchemy.orm import Session
from backend.passport.app.db.session import get_db
from backend.passport.app.services.auth_service import auth_service
from backend.passport.app.services.sms_service import sms_service

# Add the project root to the path
sys.path.append('d:\\trae_projects\\image-edit')

async def test_phone_login():
    # Get database session
    db: Session = next(get_db())
    
    # Test phone number
    test_phone = "13800138000"
    
    print(f"Testing phone login for: {test_phone}")
    
    # Step 1: Send verification code
    print("\nStep 1: Sending verification code...")
    try:
        code = await sms_service.send_code(test_phone)
        print(f"Verification code sent: {code}")
    except Exception as e:
        print(f"Failed to send verification code: {e}")
        return
    
    # Step 2: Test login with universal code (should create user if not exists)
    print("\nStep 2: Testing login with universal code...")
    try:
        result = await auth_service.login_by_phone(db, test_phone, code="5567", ip="127.0.0.1", ua="test-agent")
        print(f"Login successful: {result}")
    except Exception as e:
        print(f"Login failed: {e}")
        return
    
    # Step 3: Test login with normal code (should login existing user)
    print("\nStep 3: Testing login with normal code...")
    try:
        # Resend code
        code = await sms_service.send_code(test_phone)
        print(f"New verification code sent: {code}")
        
        result = await auth_service.login_by_phone(db, test_phone, code=code, ip="127.0.0.1", ua="test-agent")
        print(f"Login successful: {result}")
    except Exception as e:
        print(f"Login failed: {e}")
        return
    
    print("\nAll tests completed successfully!")

if __name__ == "__main__":
    asyncio.run(test_phone_login())