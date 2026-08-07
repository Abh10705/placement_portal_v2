import os
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from werkzeug.utils import secure_filename
from datetime import datetime
from models.database import get_db

student_bp = Blueprint('student', __name__, url_prefix='/api/student')

ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def verify_student():
    claims = get_jwt()
    return claims.get('role') == 'student'

def get_student_profile_id(user_id):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id FROM student_profile WHERE user_id = ?", (user_id,))
    row = cur.fetchone()
    return row['id'] if row else None

@student_bp.route('/drives', methods=['GET'])
@jwt_required()
def get_approved_drives():
    if not verify_student():
        return jsonify({"error": "Student access required"}), 403

    from app import cache
    
    try:
        cached_drives = cache.get("student_drives_list")
    except Exception:
        cached_drives = None
    if cached_drives is not None:
        return jsonify(cached_drives), 200

    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        SELECT j.*, c.company_name, c.website 
        FROM job_posting j
        JOIN company_profile c ON j.company_id = c.id
        WHERE j.status = 'approved'
        """
    )
    rows = cur.fetchall()
    drives = [dict(row) for row in rows]

    cache.set("student_drives_list", drives, timeout=60)

    return jsonify(drives), 200

@student_bp.route('/drives/<int:drive_id>/apply', methods=['POST'])
@jwt_required()
def apply_to_drive(drive_id):
    if not verify_student():
        return jsonify({"error": "Student access required"}), 403

    user_id = int(get_jwt_identity())
    student_id = get_student_profile_id(user_id)
    if not student_id:
        return jsonify({"error": "Student profile not found"}), 404

    db = get_db()
    cur = db.cursor()

    cur.execute("SELECT id FROM application WHERE student_id = ? AND drive_id = ?", (student_id, drive_id))
    if cur.fetchone():
        return jsonify({"error": "You have already applied for this placement drive"}), 400

    applied_at = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    cur.execute(
        "INSERT INTO application (student_id, drive_id, applied_at, status) VALUES (?, ?, ?, 'applied')",
        (student_id, drive_id, applied_at)
    )
    db.commit()

    return jsonify({"message": "Application submitted successfully"}), 201

@student_bp.route('/applications', methods=['GET'])
@jwt_required()
def get_my_applications():
    if not verify_student():
        return jsonify({"error": "Student access required"}), 403

    user_id = int(get_jwt_identity())
    student_id = get_student_profile_id(user_id)
    if not student_id:
        return jsonify({"error": "Student profile not found"}), 404

    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        SELECT a.id as application_id, a.applied_at, a.status,
               j.job_title, j.eligibility, c.company_name
        FROM application a
        JOIN job_posting j ON a.drive_id = j.id
        JOIN company_profile c ON j.company_id = c.id
        WHERE a.student_id = ?
        """,
        (student_id,)
    )
    rows = cur.fetchall()
    apps = [dict(row) for row in rows]
    return jsonify(apps), 200

@student_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    if not verify_student():
        return jsonify({"error": "Student access required"}), 403

    user_id = int(get_jwt_identity())
    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        SELECT s.*, u.full_name, u.email 
        FROM student_profile s 
        JOIN user u ON s.user_id = u.id 
        WHERE s.user_id = ?
        """,
        (user_id,)
    )
    row = cur.fetchone()
    if not row:
        return jsonify({"error": "Profile not found"}), 404
    return jsonify(dict(row)), 200

@student_bp.route('/profile', methods=['POST', 'PUT'])
@jwt_required()
def update_profile():
    if not verify_student():
        return jsonify({"error": "Student access required"}), 403

    user_id = int(get_jwt_identity())
    db = get_db()
    cur = db.cursor()

    roll_no = request.form.get('roll_no')
    branch = request.form.get('branch')
    cgpa = request.form.get('cgpa')
    phone = request.form.get('phone')

    if not request.form and request.is_json:
        data = request.get_json() or {}
        roll_no = data.get('roll_no')
        branch = data.get('branch')
        cgpa = data.get('cgpa')
        phone = data.get('phone')

    resume_path = None
    if 'resume' in request.files:
        file = request.files['resume']
        if file and allowed_file(file.filename):
            filename = secure_filename(f"student_{user_id}_{file.filename}")
            filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            file.save(filepath)
            resume_path = filename

    if resume_path:
        cur.execute(
            """
            UPDATE student_profile 
            SET roll_no = ?, branch = ?, cgpa = ?, phone = ?, resume_path = ? 
            WHERE user_id = ?
            """,
            (roll_no, branch, cgpa, phone, resume_path, user_id)
        )
    else:
        cur.execute(
            """
            UPDATE student_profile 
            SET roll_no = ?, branch = ?, cgpa = ?, phone = ? 
            WHERE user_id = ?
            """,
            (roll_no, branch, cgpa, phone, user_id)
        )
    db.commit()

    return jsonify({"message": "Profile updated successfully"}), 200

@student_bp.route('/resume/<filename>', methods=['GET'])
@jwt_required()
def download_resume(filename):
    upload_folder = current_app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)

@student_bp.route('/export-csv', methods=['POST'])
@jwt_required()
def trigger_csv_export():
    if not verify_student():
        return jsonify({"error": "Student access required"}), 403

    user_id = int(get_jwt_identity())
    student_id = get_student_profile_id(user_id)
    if not student_id:
        return jsonify({"error": "Student profile not found"}), 404

    from tasks import export_student_applications_csv
    task = export_student_applications_csv.delay(student_id)

    return jsonify({
        "message": "Application export triggered in background.",
        "task_id": task.id
    }), 202
