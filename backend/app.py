import os
from flask import Flask, jsonify, send_from_directory
from flask_jwt_extended import JWTManager
from models.database import init_db, close_db
from routes.auth import auth_bp
from routes.admin import admin_bp

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder="../frontend")
app.config["SECRET_KEY"] = "dev-abhi-placement-key"
app.config["JWT_SECRET_KEY"] = "dev-abhi-jwt-secret-key"
app.config["UPLOAD_FOLDER"] = os.path.join(BASE_DIR, "uploads")
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024  # 5 MB limit

jwt = JWTManager(app)

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)

app.teardown_appcontext(close_db)

@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "message": "Placement Portal API is running"}), 200

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    with app.app_context():
        init_db()
    app.run(debug=True, port=5000)
