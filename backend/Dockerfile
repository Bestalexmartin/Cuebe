# backend/Dockerfile

FROM python:3.11

WORKDIR /app

# --- ADD THIS BLOCK ---
# Install system-level build dependencies
RUN apt-get update && apt-get install -y build-essential
# --- END OF BLOCK ---

COPY ./requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

RUN pip list

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]