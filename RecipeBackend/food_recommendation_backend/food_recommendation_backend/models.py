from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError
from PIL import Image
import io
from django.core.files.base import ContentFile
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.utils.translation import gettext_lazy as _

class CustomUser(AbstractUser):
    username_validator = UnicodeUsernameValidator()

    username = models.CharField(
        _("username"),
        max_length=20,
        unique=True,
        help_text=_(
            "Required. 20 characters or fewer. Letters, digits and @/./+/-/_ only."
        ),
        validators=[username_validator],
        error_messages={
            "unique": _("A user with that username already exists."),
        },
    )
    first_name = models.CharField(_("first name"), max_length=40, blank=True)
    last_name = models.CharField(_("last name"), max_length=40, blank=True)

    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        null=True,
        blank=True
    )

    # Add the push_token field
    push_token = models.CharField(max_length=255, blank=True, null=True)

    def clean(self):
        """
        Custom validation for the profile_picture field.
        """
        super().clean()  # Call the parent's clean method
        if self.profile_picture:
            try:
                # Open the image to check its format and size
                img = Image.open(self.profile_picture)
                if img.format not in ['JPEG', 'PNG']:
                    raise ValidationError("Profile picture must be a JPEG or PNG image.")

                # Example: Ensure the file is not larger than 2MB
                max_size = 2 * 1024 * 1024  # 2 MB
                if self.profile_picture.size > max_size:
                    raise ValidationError("Profile picture file size must not exceed 2MB.")

            except Exception as e:
                raise ValidationError(f"Invalid image: {e}")

    def save(self, *args, **kwargs):

        """
        Process the image before saving.
        """
        if self.username:
            self.username = self.username.lower()
                        
        if self.pk:
            try:
                # Retrieve the old profile_picture from the database
                old_profile_picture = CustomUser.objects.get(pk=self.pk).profile_picture
            except CustomUser.DoesNotExist:
                old_profile_picture = None
            
            # Compare old and new profile_picture
            if old_profile_picture and self.profile_picture == old_profile_picture:
                # If the image hasn't changed, skip reprocessing
                super().save(*args, **kwargs)
                return


        if self.profile_picture:
            # Open the image
            img = Image.open(self.profile_picture)

            # Resize to square (e.g., 300x300) while maintaining aspect ratio
            img.thumbnail((300, 300))

            # Crop to a square if necessary
            width, height = img.size
            if width != height:
                new_size = min(width, height)
                left = (width - new_size) // 2
                top = (height - new_size) // 2
                right = (width + new_size) // 2
                bottom = (height + new_size) // 2
                img = img.crop((left, top, right, bottom))

            # Save the processed image to a BytesIO stream
            img_io = io.BytesIO()
            img_format = 'JPEG' if img.format == 'JPEG' else 'PNG'
            img.save(img_io, format=img_format)
            img_io.seek(0)

            # Replace the profile_picture file with the processed image
            self.profile_picture.save(
                self.profile_picture.name,
                ContentFile(img_io.read()),
                save=False  # Avoid recursive calls to save()
            )

        super().save(*args, **kwargs)
