import json

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import authentication.models


def migrate_legacy_users(apps, schema_editor):
	User = apps.get_model('authentication', 'CHDCUser')
	Profile = apps.get_model('authentication', 'StudentsPIIProfile')
	using = schema_editor.connection.alias

	for user in User.objects.using(using).all().iterator():
		user.matric_number = user.username
		user.save(using=using, update_fields=['matric_number'])
		Profile.objects.using(using).create(
			user_id=user.pk,
			pii_data=json.dumps({
				'first_name': user.first_name,
				'last_name': user.last_name,
				'email': user.email,
			}),
		)


class Migration(migrations.Migration):
	dependencies = [
		('authentication', '0001_initial'),
	]

	operations = [
		migrations.AddField(
			model_name='chdcuser',
			name='matric_number',
			field=models.CharField(max_length=150, null=True, unique=True),
		),
		migrations.CreateModel(
			name='StudentsPIIProfile',
			fields=[
				('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
				('pii_data', authentication.models.EncryptedTextField(default='{}')),
				('user', models.OneToOneField(
					on_delete=django.db.models.deletion.CASCADE,
					related_name='pii_profile',
					to=settings.AUTH_USER_MODEL,
				)),
			],
		),
		migrations.RunPython(migrate_legacy_users, migrations.RunPython.noop),
		migrations.AlterField(
			model_name='chdcuser',
			name='matric_number',
			field=models.CharField(max_length=150, unique=True),
		),
		migrations.RemoveField(model_name='chdcuser', name='username'),
		migrations.RemoveField(model_name='chdcuser', name='first_name'),
		migrations.RemoveField(model_name='chdcuser', name='last_name'),
		migrations.RemoveField(model_name='chdcuser', name='email'),
		migrations.AlterModelManagers(
			name='chdcuser',
			managers=[('objects', authentication.models.CHDCUserManager())],
		),
	]