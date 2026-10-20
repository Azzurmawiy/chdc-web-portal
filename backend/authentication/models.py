from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models

from .crypto import decrypt_pii, encrypt_pii


class EncryptedTextField(models.TextField):
	def get_prep_value(self, value):
		value = super().get_prep_value(value)
		if value is None:
			return None
		return encrypt_pii(value)

	def from_db_value(self, value, expression, connection):
		if value is None:
			return value
		return decrypt_pii(value)


class CHDCUserManager(BaseUserManager):
	use_in_migrations = True

	def create_user(self, matric_number, password=None, **extra_fields):
		if not matric_number:
			raise ValueError('A matric number is required.')
		user = self.model(matric_number=matric_number, **extra_fields)
		user.set_password(password)
		user.save(using=self._db)
		return user

	def create_superuser(self, matric_number, password=None, **extra_fields):
		extra_fields.setdefault('is_staff', True)
		extra_fields.setdefault('is_superuser', True)
		extra_fields.setdefault('is_active', True)
		if extra_fields.get('is_staff') is not True:
			raise ValueError('A superuser must have is_staff=True.')
		if extra_fields.get('is_superuser') is not True:
			raise ValueError('A superuser must have is_superuser=True.')
		return self.create_user(matric_number, password, **extra_fields)


class CHDCUser(AbstractUser):
	username = None
	first_name = None
	last_name = None
	email = None

	matric_number = models.CharField(max_length=150, unique=True)

	USERNAME_FIELD = 'matric_number'
	REQUIRED_FIELDS = []
	objects = CHDCUserManager()


class StudentsPIIProfile(models.Model):
	user = models.OneToOneField(
		CHDCUser,
		on_delete=models.CASCADE,
		related_name='pii_profile',
	)
	pii_data = EncryptedTextField(default='{}')

	def __str__(self):
		return f'PII profile for user {self.user_id}'
