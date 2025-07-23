#!/bin/bash
# Test runner script

# Activate virtual environment
source venv/bin/activate

# Run tests with proper environment
echo "🧪 Running tests in virtual environment..."
echo "Virtual environment: $VIRTUAL_ENV"
echo "Pytest location: $(which pytest)"
echo ""

# Run the tests
pytest "$@"