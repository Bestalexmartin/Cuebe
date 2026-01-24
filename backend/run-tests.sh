#!/bin/bash
# backend/run-tests.sh

# Activate virtual environment
source venv/bin/activate

# Run tests with proper environment
echo "Running tests in virtual environment..."
echo "Virtual environment: $VIRTUAL_ENV"
echo "Pytest location: $(which pytest)"
echo ""

# Run the tests
# Usage:
#   ./run-tests.sh                     # Run all tests
#   ./run-tests.sh --watch             # Watch mode (requires pytest-watch)
#   ./run-tests.sh --cov=. --cov-report=html  # With coverage report
pytest "$@"
