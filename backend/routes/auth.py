from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from models.database import get_db

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register/student', methods=['POST'])
def register_student():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name')
    roll_no = data.get('roll_no')
    branch = data.get('branch')
    cgpa = data.get('cgpa')

    if not email or not password or not full_name:
        return jsonify({"error": "Missing required fields"}), 400

    db = get_db()
    cur = db.cursor()

    cur.execute("SELECT id FROM user WHERE email = ?", (email,))
    if cur.fetchone():
        return jsonify({"error": "Email already registered"}), 409

    pwd_hash = generate_password_hash(password)
    cur.execute(
        "INSERT INTO user (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
        (email, pwd_hash, full_name, 'student')
    )
    user_id = cur.lastrowid

    cur.execute(
        "INSERT INTO student_profile (user_id, roll_no, branch, cgpa) VALUES (?, ?, ?, ?)",
        (user_id, roll_no, branch, cgpa)
    )
    db.commit()

    return jsonify({"message": "Student registered successfully"}), 201


@auth_bp.route('/register/company', methods=['POST'])
def register_company():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    full_name = data.get('full_name')
    company_name = data.get('company_name')
    hr_contact = data.get('hr_contact')
    website = data.get('website')

    if not email or not password or not company_name:
        return jsonify({"error": "Missing required fields"}), 400

    db = get_db()
    cur = db.cursor()

    cur.execute("SELECT id FROM user WHERE email = ?", (email,))
    if cur.fetchone():
        return jsonify({"error": "Email already registered"}), 409

    pwd_hash = generate_password_hash(password)
    cur.execute(
        "INSERT INTO user (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
        (email, pwd_hash, full_name or company_name, 'company')
    )
    user_id = cur.lastrowid

    cur.execute(
        "INSERT INTO company_profile (user_id, company_name, hr_contact, website, approval_status) VALUES (?, ?, ?, ?, 'pending')",
        (user_id, company_name, hr_contact, website)
    )
    db.commit()

    return jsonify({"message": "Company registration submitted for Admin approval"}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, email, password_hash, role, is_active, is_blacklisted FROM user WHERE email = ?", (email,))
    user = cur.fetchone()

    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    is_valid_pwd = False
    if user['role'] == 'admin' and user['password_hash'] == password:
        is_valid_pwd = True
    else:
        is_valid_pwd = check_password_hash(user['password_hash'], password)

    if not is_valid_pwd:
        return jsonify({"error": "Invalid credentials"}), 401

    if user['is_blacklisted']:
        return jsonify({"error": "Account is blacklisted. Contact Admin."}), 403

    if not user['is_active']:
        return jsonify({"error": "Account is deactivated."}), 403

    token = create_access_token(
        identity=str(user['id']),
        additional_claims={"role": user['role'], "email": user['email']}
    )

    return jsonify({
        "message": "Login successful",
        "access_token": token,
        "user": {
            "id": user['id'],
            "email": user['email'],
            "role": user['role']
        }
    }), 200
