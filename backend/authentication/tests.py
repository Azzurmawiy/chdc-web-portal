import json

from django.db import connection
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from .crypto import decrypt_pii
from .models import CHDCUser, StudentsPIIProfile
from .serializers import RegisterSerializer


class StudentsPIIProfileTests(TestCase):
	def setUp(self):
		self.user = CHDCUser.objects.create_user(
			matric_number='UG19/CS/1042',
			password='StrongPass123!',
		)
		self.pii_payload = json.dumps({
			'first_name': 'Ada',
			'last_name': 'Okafor',
			'mobile_number': '+2348012345678',
		})
		self.profile = StudentsPIIProfile.objects.create(
			user=self.user,
			pii_data=self.pii_payload,
		)

	def test_pii_is_encrypted_in_raw_database_column(self):
		profile_table = connection.ops.quote_name(StudentsPIIProfile._meta.db_table)
		pii_column = connection.ops.quote_name(
			StudentsPIIProfile._meta.get_field('pii_data').column
		)
		user_column = connection.ops.quote_name(
			StudentsPIIProfile._meta.get_field('user').column
		)
		with connection.cursor() as cursor:
			cursor.execute(
				f'SELECT {pii_column} FROM {profile_table} '
				f'WHERE {user_column} = %s',
				[self.user.pk],
			)
			raw_value = cursor.fetchone()[0]

		self.assertNotEqual(raw_value, self.pii_payload)
		self.assertEqual(decrypt_pii(raw_value), self.pii_payload)

	def test_model_field_returns_decrypted_pii_after_reload(self):
		profile = StudentsPIIProfile.objects.get(pk=self.profile.pk)

		self.assertEqual(profile.pii_data, self.pii_payload)
		self.assertEqual(json.loads(profile.pii_data)['mobile_number'], '+2348012345678')


class RegisterSerializerTests(TestCase):
	def valid_payload(self, **overrides):
		payload = {
			'first_name': 'Ada',
			'last_name': 'Okafor',
			'mobile_number': '+2348012345678',
			'matric_number': 'UG19/CS/1042',
			'password': 'StrongPass123!',
		}
		payload.update(overrides)
		return payload

	def test_accepts_valid_matric_number(self):
		serializer = RegisterSerializer(data=self.valid_payload())

		self.assertTrue(serializer.is_valid(), serializer.errors)

	def test_rejects_invalid_matric_number_formats(self):
		for matric_number in (
			'ug19/CS/1042',
			'UG19/C/1042',
			'UG19/CS/104',
			'UG1/CS/1042',
			'UG19/CS/1042-extra',
		):
			with self.subTest(matric_number=matric_number):
				serializer = RegisterSerializer(
					data=self.valid_payload(matric_number=matric_number)
				)
				self.assertFalse(serializer.is_valid())
				self.assertIn('matric_number', serializer.errors)

	def test_accepts_valid_nigerian_mobile_number(self):
		serializer = RegisterSerializer(data=self.valid_payload())

		self.assertTrue(serializer.is_valid(), serializer.errors)

	def test_rejects_invalid_mobile_number_formats(self):
		for mobile_number in (
			'08012345678',
			'+234801234567',
			'+23480123456789',
			'+234 8012345678',
			'+234abcdefghij',
		):
			with self.subTest(mobile_number=mobile_number):
				serializer = RegisterSerializer(
					data=self.valid_payload(mobile_number=mobile_number)
				)
				self.assertFalse(serializer.is_valid())
				self.assertIn('mobile_number', serializer.errors)


class AuthenticationAPITests(TestCase):
	register_url = '/api/v1/auth/register/'
	login_url = '/api/v1/auth/login/'

	def setUp(self):
		self.client = APIClient()
		self.registration_payload = {
			'first_name': 'Ada',
			'last_name': 'Okafor',
			'mobile_number': '+2348012345678',
			'matric_number': 'UG19/CS/1042',
			'password': 'StrongPass123!',
		}

	def assert_token_pair(self, response):
		tokens = response.data['data']['tokens']
		self.assertTrue(tokens['access'])
		self.assertTrue(tokens['refresh'])

	def test_registration_returns_created_response_and_jwt_tokens(self):
		response = self.client.post(
			self.register_url,
			self.registration_payload,
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertEqual(response.data['status'], 'success')
		self.assertEqual(
			response.data['message'],
			'Student registration completed successfully.',
		)
		self.assertEqual(response.data['data']['username'], 'UG19/CS/1042')
		self.assert_token_pair(response)
		self.assertTrue(
			StudentsPIIProfile.objects.filter(user__matric_number='UG19/CS/1042').exists()
		)

	def test_duplicate_registration_returns_bad_request(self):
		self.client.post(self.register_url, self.registration_payload, format='json')

		response = self.client.post(
			self.register_url,
			self.registration_payload,
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data['status'], 'error')
		self.assertIn('matric_number', response.data['errors'])

	def test_login_with_correct_credentials_returns_jwt_tokens(self):
		CHDCUser.objects.create_user(
			matric_number='UG19/CS/1042',
			password='StrongPass123!',
		)

		response = self.client.post(
			self.login_url,
			{
				'matric_number': 'UG19/CS/1042',
				'password': 'StrongPass123!',
			},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data['status'], 'success')
		self.assertEqual(response.data['data']['username'], 'UG19/CS/1042')
		self.assert_token_pair(response)
