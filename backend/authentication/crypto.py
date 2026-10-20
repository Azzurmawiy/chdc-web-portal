import base64
import hashlib

from cryptography.fernet import Fernet
from django.conf import settings


def _fernet() -> Fernet:
	key = hashlib.sha256(settings.SECRET_KEY.encode('utf-8')).digest()
	return Fernet(base64.urlsafe_b64encode(key))


def encrypt_pii(data: str) -> str:
	if not isinstance(data, str):
		raise TypeError('PII data must be a string.')
	return _fernet().encrypt(data.encode('utf-8')).decode('ascii')


def decrypt_pii(token: str) -> str:
	if not isinstance(token, str):
		raise TypeError('Encrypted PII token must be a string.')
	return _fernet().decrypt(token.encode('ascii')).decode('utf-8')