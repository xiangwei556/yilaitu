import redis
import sys

def fix_redis():
    try:
        # Connect to Redis
        r = redis.Redis(host='localhost', port=6379, db=0)
        
        # Check connection
        r.ping()
        print("Successfully connected to Redis.")
        
        # Fix the configuration
        # This command tells Redis to continue accepting writes even if BGSAVE fails
        r.config_set('stop-writes-on-bgsave-error', 'no')
        print("Successfully set 'stop-writes-on-bgsave-error' to 'no'.")
        
        # Verify
        config = r.config_get('stop-writes-on-bgsave-error')
        print(f"Current config: {config}")
        
    except Exception as e:
        print(f"Error fixing Redis: {e}")
        sys.exit(1)

if __name__ == "__main__":
    fix_redis()
