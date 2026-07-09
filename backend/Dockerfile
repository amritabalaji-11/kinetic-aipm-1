FROM python:3.11

WORKDIR /app

# system dependencies (IMPORTANT for cv2 + mediapipe + ffmpeg)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libgl1 \
    libgles2 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]