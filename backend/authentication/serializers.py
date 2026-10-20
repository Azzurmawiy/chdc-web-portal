import json
import re

from django.db import transaction
from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CHDCUser, StudentsPIIProfile


class RegisterSerializer(serializers.Serializer):
	first_name = serializers.CharField(max_length=150)
	last_name = serializers.CharField(max_length=150)
	mobile_number = serializers.CharField(max_length=14)
	matric_number = serializers.CharField(max_length=32)
	password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)

	def validate_matric_number(self, value):
		if not re.fullmatch(r'UG\d{2}/[A-Z]{2,4}/\d{4}', value):
			raise serializers.ValidationError(
				'Matric number must match the format UG19/CS/1042.'
			)
		if CHDCUser.objects.filter(matric_number=value).exists():
			raise serializers.ValidationError(
				'A user with this matric number already exists.'
			)
		return value

	def validate_mobile_number(self, value):
		if not re.fullmatch(r'\+234[0-9]{10}', value):
			raise serializers.ValidationError(
				'Mobile number must use Nigerian E.164 format, e.g. +2348012345678.'
			)
		return value

	@transaction.atomic
	def create(self, validated_data):
		first_name = validated_data.pop('first_name')
		last_name = validated_data.pop('last_name')
		mobile_number = validated_data.pop('mobile_number')
		matric_number = validated_data.pop('matric_number')
		password = validated_data.pop('password')

		user = CHDCUser.objects.create_user(
			matric_number=matric_number,
			password=password,
		)
		StudentsPIIProfile.objects.create(
			user=user,
			pii_data=json.dumps({
				'first_name': first_name,
				'last_name': last_name,
				'mobile_number': mobile_number,
			}),
		)
		return user


class LoginSerializer(serializers.Serializer):
	matric_number = serializers.CharField(max_length=32)
	password = serializers.CharField(write_only=True, trim_whitespace=False)

	default_error_messages = {
		'invalid_credentials': 'Invalid matric number or password.',
	}

	def validate(self, attrs):
		user = authenticate(
			request=self.context.get('request'),
			matric_number=attrs['matric_number'],
			password=attrs['password'],
		)
		if user is None:
			self.fail('invalid_credentials')

		self.user = user
		refresh = RefreshToken.for_user(user)
		return {
			'refresh': str(refresh),
			'access': str(refresh.access_token),
		}