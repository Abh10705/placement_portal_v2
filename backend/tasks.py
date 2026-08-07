import csv
import os
from celery import Celery
from celery.schedules import crontab
from app import app, mail
from flask_mail import Message
from models.database import get_db

celery_app = Celery(
    'placement_tasks',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    beat_schedule={
        'send-daily-reminders-every-evening': {
            'task': 'tasks.send_daily_reminders',
            'schedule': crontab(hour=18, minute=0),
        },
        'generate-monthly-report-first-of-month': {
            'task': 'tasks.generate_monthly_report',
            'schedule': crontab(day_of_month=1, hour=0, minute=0),
        },
    }
)

@celery_app.task
def export_student_applications_csv(student_id):
    exports_dir = os.path.join(os.path.dirname(__file__), 'exports')
    os.makedirs(exports_dir, exist_ok=True)
    file_path = os.path.join(exports_dir, f'applications_student_{student_id}.csv')

    with app.app_context():
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

        with open(file_path, mode='w', newline='', encoding='utf-8') as csv_file:
            writer = csv.writer(csv_file)
            writer.writerow(['Application ID', 'Job Title', 'Company', 'Applied At', 'Status'])
            for row in rows:
                writer.writerow([
                    row['application_id'],
                    row['job_title'],
                    row['company_name'],
                    row['applied_at'],
                    row['status']
                ])

    return f"Export completed: {file_path}"

@celery_app.task
def send_daily_reminders():
    with app.app_context():
        db = get_db()
        cur = db.cursor()
        
        # Get active placement drives
        cur.execute("""
            SELECT j.id, j.job_title, c.company_name, j.application_deadline 
            FROM job_posting j
            JOIN company_profile c ON j.company_id = c.id
            WHERE j.status = 'Approved'
        """)
        drives = cur.fetchall()

        if not drives:
            return "No active drives for reminders"

        # Get all registered students
        cur.execute("SELECT email, full_name FROM user WHERE role = 'student'")
        students = cur.fetchall()

        emails_sent = 0
        for student in students:
            msg = Message(
                subject="Daily Reminder: Upcoming Placement Drives",
                recipients=[student['email']],
                body=f"Hello {student['full_name']},\n\nCheck out the active placement drives on the Placement Portal before their deadlines!\n\nBest regards,\nPlacement Cell"
            )
            try:
                mail.send(msg)
                emails_sent += 1
            except Exception as e:
                print(f"Failed to send email to {student['email']}: {e}")

        return f"Daily reminders sent to {emails_sent} students"

@celery_app.task
def generate_monthly_report():
    with app.app_context():
        db = get_db()
        cur = db.cursor()

        # Gather portal stats
        cur.execute("SELECT COUNT(*) FROM user WHERE role = 'student'")
        total_students = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM job_posting WHERE status = 'Approved'")
        total_drives = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM application")
        total_applications = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM application WHERE status = 'Selected'")
        total_selections = cur.fetchone()[0]

        # Get Admin email(s)
        cur.execute("SELECT email FROM user WHERE role = 'admin'")
        admins = cur.fetchall()

        admin_emails = [admin['email'] for admin in admins] if admins else ['admin@placementportal.edu']

        report_body = f"""
Monthly Placement Activity Report
---------------------------------
Total Registered Students: {total_students}
Active Approved Drives: {total_drives}
Total Applications Submitted: {total_applications}
Students Selected/Placed: {total_selections}

Report generated automatically by Placement Portal Celery Service.
"""

        msg = Message(
            subject="Monthly Placement Activity Report",
            recipients=admin_emails,
            body=report_body
        )

        try:
            mail.send(msg)
            return f"Monthly report sent to {', '.join(admin_emails)}"
        except Exception as e:
            return f"Failed to send monthly report: {e}"
