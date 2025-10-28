"""
Simple script to test database connection
Run with: python test_db_connection.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.db import connection
from django.core.exceptions import ImproperlyConfigured

def test_connection():
    print("\n" + "="*60)
    print("DATABASE CONNECTION TEST")
    print("="*60 + "\n")
    
    try:
        # Test connection
        with connection.cursor() as cursor:
            connection.ensure_connection()
            
        print("[SUCCESS] Database connection successful!")
        print(f"\nConnection Details:")
        print(f"  - Database: {connection.settings_dict['NAME']}")
        print(f"  - Host: {connection.settings_dict['HOST']}")
        print(f"  - Port: {connection.settings_dict['PORT']}")
        print(f"  - User: {connection.settings_dict['USER']}")
        
        # Try to get database version
        with connection.cursor() as cursor:
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            print(f"\n  PostgreSQL Version: {version.split(',')[0]}")
        
        print("\n" + "="*60)
        print("[SUCCESS] ALL TESTS PASSED - Database is ready!")
        print("="*60 + "\n")
        
        print("Next steps:")
        print("  1. Run: python manage.py migrate")
        print("  3. Run: python manage.py runserver")
        print("  4. Visit: http://localhost:8000/api/test-db/")
        
        return True
        
    except ImproperlyConfigured as e:
        print("[ERROR] Configuration Error!")
        print(f"  {str(e)}")
        print("\nPlease check your .env file and make sure all variables are set correctly.")
        return False
        
    except Exception as e:
        print("[ERROR] Connection Failed!")
        print(f"  Error: {str(e)}")
        print("\nPossible issues:")
        print("  1. PostgreSQL server is not running")
        print("  2. Database credentials in .env are incorrect")
        print("  3. Database doesn't exist (create it with: createdb cyberintel_db)")
        print("  4. PostgreSQL is not accessible from localhost")
        return False

if __name__ == "__main__":
    test_connection()

