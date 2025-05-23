# Generated by Django 5.1.2 on 2025-04-16 05:20

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Developer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('role', models.CharField(max_length=100)),
                ('image', models.URLField(default='https://decent-saving-hare.ngrok-free.app/static/default_user.png')),
                ('bio', models.TextField()),
                ('location', models.CharField(blank=True, max_length=100, null=True)),
                ('experience', models.CharField(blank=True, max_length=50, null=True)),
                ('github_url', models.URLField(blank=True, null=True, verbose_name='GitHub URL')),
                ('portfolio_url', models.URLField(blank=True, null=True, verbose_name='Portfolio URL')),
            ],
            options={
                'verbose_name': 'Developer',
                'verbose_name_plural': 'Developers',
            },
        ),
        migrations.CreateModel(
            name='DeveloperContact',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('email', models.EmailField(blank=True, max_length=254, null=True)),
                ('phone', models.CharField(blank=True, max_length=20, null=True)),
                ('developer', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='contact', to='api.developer')),
            ],
        ),
        migrations.CreateModel(
            name='DeveloperContribution',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('description', models.TextField()),
                ('developer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='contributions', to='api.developer')),
            ],
            options={
                'ordering': ['id'],
            },
        ),
        migrations.CreateModel(
            name='DeveloperProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('linkedin', models.URLField(blank=True, null=True)),
                ('twitter', models.URLField(blank=True, null=True)),
                ('website', models.URLField(blank=True, null=True)),
                ('developer', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='profile', to='api.developer')),
            ],
        ),
        migrations.CreateModel(
            name='DeveloperSkill',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50)),
                ('developer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='skills', to='api.developer')),
            ],
            options={
                'ordering': ['name'],
                'unique_together': {('developer', 'name')},
            },
        ),
    ]
