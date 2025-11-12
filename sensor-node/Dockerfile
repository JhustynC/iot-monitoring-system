FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY sensor_node.py .

EXPOSE 5000

CMD ["python", "sensor_node.py"]

