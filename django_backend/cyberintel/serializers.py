from rest_framework import serializers
from django.utils.html import strip_tags
import re

from .models import Contact


class ContactSerializer(serializers.ModelSerializer):
	name = serializers.CharField(max_length=200, trim_whitespace=True)
	email = serializers.EmailField()
	# Limit message size to avoid extremely large payloads
	message = serializers.CharField(max_length=5000, trim_whitespace=True)

	class Meta:
		model = Contact
		fields = ['id', 'name', 'email', 'message', 'created_at']
		read_only_fields = ['id', 'created_at']

	def validate_name(self, value):
		clean = strip_tags(value).strip()
		if not clean:
			raise serializers.ValidationError("Name is required.")
		# simple sanity check: no control characters
		if re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", clean):
			raise serializers.ValidationError("Invalid characters in name.")
		return clean

	def validate_message(self, value):
		# Remove HTML tags to avoid stored XSS or markup injection
		cleaned = strip_tags(value).strip()
		if not cleaned:
			raise serializers.ValidationError("Message is required.")

		# Reject obvious script-like injections
		lowered = value.lower()
		if '<script' in lowered or 'javascript:' in lowered or 'onerror=' in lowered or 'onload=' in lowered:
			raise serializers.ValidationError("Message contains disallowed content.")

		# Avoid overly SQL-like payloads (heuristic)
		if re.search(r"\b(drop|delete|insert|update|truncate|alter|exec|declare)\b", lowered):
			# don't be overly strict: only reject if a semicolon or SQL comment is also present
			if ';' in value or '--' in value:
				raise serializers.ValidationError("Message contains disallowed patterns.")

		# Enforce max length already handled by field; return cleaned content
		return cleaned

