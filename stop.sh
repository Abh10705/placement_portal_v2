#!/bin/bash

echo "Stopping all Placement Portal background services..."
pkill -f "celery"
pkill -f "app.py"
sudo service redis-server stop 2>/dev/null

echo "All services stopped cleanly."
