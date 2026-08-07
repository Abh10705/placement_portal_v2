#!/bin/bash

echo "Starting Redis server..."
sudo service redis-server start || redis-server --daemonize yes

echo "Starting Celery Worker..."
cd ~/placement_portal/backend
celery -A tasks.celery_app worker --loglevel=info > celery_worker.log 2>&1 &
WORKER_PID=$!

echo "Starting Celery Beat..."
celery -A tasks.celery_app beat --loglevel=info > celery_beat.log 2>&1 &
BEAT_PID=$!

echo "Starting Flask Backend Server..."
python3 app.py &
FLASK_PID=$!

echo "Starting Frontend HTTP Server (Port 8080)..."
cd ~/placement_portal/frontend
python3 -m http.server 8080 > frontend.log 2>&1 &
FRONTEND_PID=$!

echo "=========================================="
echo " All services started successfully!"
echo " Frontend live at: http://localhost:8080"
echo " Backend live at:  http://localhost:5000"
echo " Press CTRL+C to stop all services."
echo "=========================================="

cleanup() {
    echo ""
    echo "Stopping all services..."
    kill $FRONTEND_PID $FLASK_PID $BEAT_PID $WORKER_PID 2>/dev/null
    pkill -f "celery"
    pkill -f "app.py"
    pkill -f "http.server 8080"
    echo "Stopped."
    exit 0
}

trap cleanup INT TERM

wait
