from django.contrib import admin
from .models import Contact


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
	list_display = ('id', 'name', 'email', 'created_at')
	readonly_fields = ('created_at',)
	search_fields = ('name', 'email', 'message')
	list_filter = ('created_at',)
