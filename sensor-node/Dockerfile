FROM python:3.11-slim

# Evitar que Python genere archivos .pyc y permitir que los logs lleguen al stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Crear un usuario no root por seguridad
RUN adduser --disabled-password --gecos "" appuser && chown -R appuser /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código y cambiar el dueño
COPY sensor_node.py .
RUN chown appuser:appuser sensor_node.py

USER appuser

EXPOSE 5000

CMD ["python", "sensor_node.py"]

