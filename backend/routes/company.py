from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.database import get_db

company_bp = Blueprint('company', __name__, url_prefix='/api/company')

def verify_company(identity):
    return identity.get('role') == 'company'

def get_company_profile_id(user_id):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, approval_status FROM company_profile WHERE user_id = ?", (user_id,))
    return cur.fetchone()

@company_bp.route('/drives', methods=['POST'])
@jwt_required()
def create_drive():
    identity = get_jwt_identity()
    if not verify_company(identity):
        return jsonify({"error": "Company access required"}), 403

    comp = get_company_profile_id(identity['id'])
    if not comp or comp['approval_status'] != 'approved':
        return jsonify({"error": "Company profile is not approved by admin yet"}), 403

    data = request.get_json() or {}
    job_title = data.get('job_title')
    job_description = data.get('job_description')
    eligibility = data.get('eligibility')
    deadline = data.get('application_deadline')

    if not job_title or not deadline:
        return jsonify({"error": "Job title and application deadline are required"}), 400

    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        INSERT INTO job_posting (company_id, job_title, job_description, eligibility, application_deadline, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
        """,
        (comp['id'], job_title, job_description, eligibility, deadline)
    )
    db.commit()

    return jsonify({"message": "Placement drive submitted for admin approval"}), 201

@company_bp.route('/drives', methods=['GET'])
@jwt_required()
def get_my_drives():
    identity = get_jwt_identity()
    if not verify_company(identity):
        return jsonify({"error": "Company access required"}), 403

    comp = get_company_profile_id(identity['id'])
    if not comp:
        return jsonify({"error": "Company profile not found"}), 404

    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        SELECT j.*, COUNT(a.id) as applicant_count 
        FROM job_posting j 
        LEFT JOIN application a ON j.id = a.drive_id 
        WHERE j.company_id = ? 
        GROUP BY j.id
        """,
        (comp['id'],)
    )
    rows = cur.fetchall()
    drives = [dict(row) for row in rows]
    return jsonify(drives), 200

@company_bp.route('/drives/<int:drive_id>/applications', methods=['GET'])
@jwt_required()
def get_drive_applications(drive_id):
    identity = get_jwt_identity()
    if not verify_company(identity):
        return jsonify({"error": "Company access required"}), 403

    db = get_db()
    cur = db.cursor()
    cur.execute(
        """
        SELECT a.id as application_id, a.applied_at, a.status, 
               s.roll_no, s.branch, s.cgpa, s.phone, s.resume_path, u.full_name, u.email
        FROM application a
        JOIN student_profile s ON a.student_id = s.id
        JOIN user u ON s.user_id = u.id
        WHERE a.drive_id = ?
        """,
        (drive_id,)
    )
    rows = cur.fetchall()
    apps = [dict(row) for row in rows]
    return jsonify(apps), 200

@company_bp.route('/applications/<int:app_id>/status', methods=['POST'])
@jwt_required()
def update_application_status(app_id):
    identity = get_jwt_identity()
    if not verify_company(identity):
        return jsonify({"error": "Company access required"}), 403

    data = request.get_json() or {}
    status = data.get('status')
    if status not in ['applied', 'shortlisted', 'selected', 'rejected']:
        return jsonify({"error": "Invalid status value"}), 400

    db = get_db()
    cur = db.cursor()
    cur.execute("UPDATE application SET status = ? WHERE id = ?", (status, app_id))
    db.commit()

    return jsonify({"message": f"Application status updated to {status}"}), 200
