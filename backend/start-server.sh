#!/bin/bash
# backend/start-server.sh

# Activate virtual environment
source venv/bin/activate

# Start the FastAPI server
echo "🚀 Starting Cuebe backend server..."
echo "Virtual environment: $VIRTUAL_ENV"
python main.py