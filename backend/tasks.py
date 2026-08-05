import csv
import os
from celery import Celery
from app import app
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
    return "Daily reminders sent"

@celery_app.task
def generate_monthly_report():
    return "Monthly report generated"
