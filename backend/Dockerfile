# backend/Dockerfile

FROM python:3.11

WORKDIR /app

# --- ADD THIS BLOCK ---
# Install system-level build dependencies
RUN apt-get update && apt-get install -y build-essential
# --- END OF BLOCK ---

# Upgrade pip to latest version and suppress root warnings
RUN pip install --upgrade pip --no-warn-script-location --root-user-action=ignore

COPY ./requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r requirements.txt --no-warn-script-location --root-user-action=ignore

# Install testing dependencies and speedtest-cli for performance testing
RUN pip install --no-cache-dir pytest pytest-asyncio faker speedtest-cli --no-warn-script-location --root-user-action=ignore

RUN pip list

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]