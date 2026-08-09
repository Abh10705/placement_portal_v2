import os
import sqlite3
from flask import g

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "portal.db")

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'student', 'company')),
    is_active INTEGER NOT NULL DEFAULT 1,
    is_blacklisted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS student_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    roll_no TEXT,
    branch TEXT,
    cgpa REAL,
    phone TEXT,
    resume_path TEXT,
    FOREIGN KEY (user_id) REFERENCES user (id)
);

CREATE TABLE IF NOT EXISTS company_profile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    company_name TEXT NOT NULL,
    hr_contact TEXT,
    website TEXT,
    approval_status TEXT NOT NULL DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES user (id)
);

CREATE TABLE IF NOT EXISTS job_posting (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    job_title TEXT NOT NULL,
    job_description TEXT,
    eligibility TEXT,
    application_deadline TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    FOREIGN KEY (company_id) REFERENCES company_profile (id)
);

CREATE TABLE IF NOT EXISTS application (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    drive_id INTEGER NOT NULL,
    applied_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'applied',
    UNIQUE (student_id, drive_id),
    FOREIGN KEY (student_id) REFERENCES student_profile (id),
    FOREIGN KEY (drive_id) REFERENCES job_posting (id)
);
"""

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()

def init_db():
    db = sqlite3.connect(DB_PATH)
    db.executescript(SCHEMA_SQL)

    # Safely add the missing column if it doesn't exist yet
    try:
        db.execute("ALTER TABLE user ADD COLUMN is_approved BOOLEAN DEFAULT 1;")
        db.commit()
    except Exception:
        pass

    cur = db.cursor()
    cur.execute("SELECT id FROM user WHERE role = 'admin' LIMIT 1;")
    row = cur.fetchone()
    if row is None:
        cur.execute(
            """
            INSERT INTO user (email, password_hash, full_name, role)
            VALUES (?, ?, ?, ?)
            """,
            ("admin@portal.test", "adminpass", "Default Admin", "admin"),
        )
        db.commit()

    db.close()
    