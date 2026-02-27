
import os

def main():
    """Main function to run the Flask development server"""
    # Import here to avoid circular imports and ensure proper initialization
    from server import app #type: ignore
    
    # Get configuration from environment variables with sensible defaults
    host = os.getenv('FLASK_HOST', '127.0.0.1')
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"Starting Flask server on {host}:{port}")
    print(f"Debug mode: {debug}")
    
    app.run(
        host=host,
        port=port,
        debug=debug,
        use_reloader=debug
    )


if __name__ == "__main__":
    main()
