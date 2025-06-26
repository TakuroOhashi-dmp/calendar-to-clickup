import os
from cryptography.fernet import Fernet

# 環境変数から暗号鍵を読み込む
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')
if not ENCRYPTION_KEY:
    raise ValueError("No ENCRYPTION_KEY set for Flask application")

# Fernetインスタンスを作成
fernet = Fernet(ENCRYPTION_KEY.encode())

def encrypt_data(data: str) -> str:
    """文字列を暗号化する"""
    if not data:
        return data
    return fernet.encrypt(data.encode()).decode()

def decrypt_data(encrypted_data: str) -> str:
    """暗号化された文字列を復号する"""
    if not encrypted_data:
        return encrypted_data
    return fernet.decrypt(encrypted_data.encode()).decode()