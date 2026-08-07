from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from models.database import get_db

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

def verify_admin():
    claims = get_jwt()
    return claims.get('role') == 'admin'

@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    if not verify_admin():
        return jsonify({"error": "Admin access required"}), 403

    db = get_db()
    cur = db.cursor()

    cur.execute("SELECT COUNT(*) FROM student_profile")
    total_students = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM company_profile WHERE approval_status = 'approved'")
    total_companies = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM job_posting WHERE status = 'approved'")
    total_drives = cur.fetchone()[0]

    return jsonify({
        "total_students": total_students,
        "total_companies": total_companies,
        "total_drives": total_drives
    }), 200

@admin_bp.route('/companies/pending', methods=['GET'])
@jwt_required()
def get_pending_companies():
    if not verify_admin():
        return jsonify({"error": "Admin access required"}), 403

    db = get_db()
    cur = db.cursor()
    cur.execute("""
        SELECT c.id, c.company_name, c.hr_contact, c.website, u.email 
        FROM company_profile c 
        JOIN user u ON c.user_id = u.id 
        WHERE c.approval_status = 'pending'
    """)
    rows = cur.fetchall()
    companies = [dict(row) for row in rows]
    return jsonify(companies), 200

@admin_bp.route('/companies/<int:company_id>/<string:action>', methods=['POST'])
@jwt_required()
def handle_company_approval(company_id, action):
    if not verify_admin():
        return jsonify({"error": "Admin access required"}), 403

    if action not in ['approve', 'reject']:
        return jsonify({"error": "Invalid action"}), 400

    status = 'approved' if action == 'approve' else 'rejected'
    db = get_db()
    cur = db.cursor()
    cur.execute("UPDATE company_profile SET approval_status = ? WHERE id = ?", (status, company_id))
    db.commit()

    return jsonify({"message": f"Company {status} successfully"}), 200

@admin_bp.route('/drives/pending', methods=['GET'])
@jwt_required()
def get_pending_drives():
    if not verify_admin():
        return jsonify({"error": "Admin access required"}), 403

    db = get_db()
    cur = db.cursor()
    cur.execute("""
        SELECT j.id, j.job_title, j.job_description, j.eligibility, j.application_deadline, c.company_name 
        FROM job_posting j 
        JOIN company_profile c ON j.company_id = c.id 
        WHERE j.status = 'pending'
    """)
    rows = cur.fetchall()
    drives = [dict(row) for row in rows]
    return jsonify(drives), 200

@admin_bp.route('/drives/<int:drive_id>/<string:action>', methods=['POST'])
@jwt_required()
def handle_drive_approval(drive_id, action):
    from app import cache
    try:
        try:
            cache.delete("student_drives_list")
        except Exception:
            pass
    except Exception:
        pass
    try:
        cache.delete("student_drives_list")
    except Exception:
        pass
    if not verify_admin():
        return jsonify({"error": "Admin access required"}), 403

    if action not in ['approve', 'reject']:
        return jsonify({"error": "Invalid action"}), 400

    status = 'approved' if action == 'approve' else 'rejected'
    db = get_db()
    cur = db.cursor()
    cur.execute("UPDATE job_posting SET status = ? WHERE id = ?", (status, drive_id))
    db.commit()

    return jsonify({"message": f"Placement drive {status} successfully"}), 200

@admin_bp.route('/users/<int:user_id>/toggle-blacklist', methods=['POST'])
@jwt_required()
def toggle_blacklist(user_id):
    if not verify_admin():
        return jsonify({"error": "Admin access required"}), 403

    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT is_blacklisted FROM user WHERE id = ?", (user_id,))
    row = cur.fetchone()
    if not row:
        return jsonify({"error": "User not found"}), 404

    new_status = 0 if row['is_blacklisted'] else 1
    cur.execute("UPDATE user SET is_blacklisted = ? WHERE id = ?", (new_status, user_id))
    db.commit()

    return jsonify({"message": "User status updated", "is_blacklisted": new_status}), 200

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_all_users():
    if not verify_admin():
        return jsonify({"error": "Admin access required"}), 403

    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT id, email, role, is_blacklisted FROM user WHERE role != 'admin'")
    rows = cur.fetchall()
    users = [dict(row) for row in rows]
    return jsonify(users), 200

@admin_bp.route('/trigger-report', methods=['POST'])
@jwt_required()
def trigger_admin_report():
    if not verify_admin():
        return jsonify({"error": "Admin access required"}), 403

    from tasks import generate_monthly_report
    task = generate_monthly_report.delay()

    return jsonify({
        "message": "Monthly report task triggered successfully.",
        "task_id": task.id
    }), 202
