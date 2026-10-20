from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, RegisterSerializer


class RegisterView(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		serializer = RegisterSerializer(data=request.data)
		if not serializer.is_valid():
			return Response(
				{
					'status': 'error',
					'message': 'Registration validation failed.',
					'errors': serializer.errors,
				},
				status=status.HTTP_400_BAD_REQUEST,
			)

		user = serializer.save()
		refresh = RefreshToken.for_user(user)
		return Response(
			{
				'status': 'success',
				'message': 'Student registration completed successfully.',
				'data': {
					'user_id': str(user.pk),
					'username': user.matric_number,
					'tokens': {
						'access': str(refresh.access_token),
						'refresh': str(refresh),
					},
				},
			},
			status=status.HTTP_201_CREATED,
		)


class LoginView(APIView):
	permission_classes = [AllowAny]

	def post(self, request):
		serializer = LoginSerializer(data=request.data)
		if not serializer.is_valid():
			return Response(
				{
					'status': 'error',
					'message': 'Login failed.',
					'errors': serializer.errors,
				},
				status=status.HTTP_401_UNAUTHORIZED,
			)

		user = serializer.user
		return Response(
			{
				'status': 'success',
				'message': 'Login successful.',
				'data': {
					'user_id': str(user.pk),
					'username': user.matric_number,
					'tokens': serializer.validated_data,
				},
			},
			status=status.HTTP_200_OK,
		)
