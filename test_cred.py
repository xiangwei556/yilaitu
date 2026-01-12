from alibabacloud_credentials.client import Client as CredentialClient
from alibabacloud_credentials import models as cred_models

try:
    config = cred_models.Config(
        type='access_key',
        access_key_id='test_id',
        access_key_secret='test_secret'
    )
    cred = CredentialClient(config)
    print(f"Credential created. Access Key: {cred.get_access_key_id()}")
except Exception as e:
    print(f"Error: {e}")
