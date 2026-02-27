"""
WSGI entry point for production deployment.
This file makes the Flask app easily deployable with WSGI servers like Gunicorn.

Usage with Gunicorn:
    gunicorn wsgi:app
"""

from server import app

if __name__ == "__main__":
    app.run()