from kafka import KafkaProducer
from kafka.errors import KafkaError
import json, time, random, threading, os
from jsonrpcserver import method, Success, Error
from http.server import HTTPServer, BaseHTTPRequestHandler

KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'localhost:9092')
TOPIC_NAME = os.getenv('TOPIC_NAME', 'sensor-data')
RPC_PORT = int(os.getenv('RPC_PORT', '5000'))
RPC_HOST = os.getenv('RPC_HOST', '0.0.0.0')

# Función para crear el producer con reintentos
def create_producer():
    max_retries = 10
    retry_delay = 5
    
    for attempt in range(max_retries):
        try:
            producer = KafkaProducer(
                bootstrap_servers=[KAFKA_BROKER],
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                retries=3,
                request_timeout_ms=30000
                # No especificar api_version para que detecte automáticamente la versión del broker
            )
            # Test connection enviando un mensaje de prueba (se descartará)
            # Si falla, lanzará excepción
            print(f"Conectado a Kafka en {KAFKA_BROKER}")
            return producer
        except Exception as e:
            print(f"Intento {attempt + 1}/{max_retries}: No se pudo conectar a Kafka: {e}")
            if attempt < max_retries - 1:
                print(f"Reintentando en {retry_delay} segundos...")
                time.sleep(retry_delay)
            else:
                print("Error: No se pudo conectar a Kafka después de múltiples intentos")
                raise

producer = create_producer()

sensor_status = {"messages_sent": 0}

def simulate_sensor(sensor_id, sensor_type):
    global sensor_status, producer
    while True:
        try:
            data = {
                'sensor_id': sensor_id,
                'type': sensor_type,
                'value': round(random.uniform(20, 30), 2),
                'timestamp': time.time()
            }
            future = producer.send(TOPIC_NAME, value=data)
            # Esperar confirmación (opcional, pero ayuda a detectar errores)
            future.get(timeout=10)
            sensor_status["messages_sent"] += 1
            print(f"[{sensor_type}] Sent: {data}")
        except Exception as e:
            print(f"Error enviando dato desde {sensor_id}: {e}")
            # Reintentar crear producer si falla
            try:
                producer = create_producer()
            except:
                print("Error crítico: No se puede reconectar a Kafka")
                time.sleep(5)
        time.sleep(random.randint(1, 3))

# RPC MÉTODOS
@method
def get_status():
    return Success(sensor_status)

# HTTP Handler para JSON-RPC
class RPCRequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            from jsonrpcserver import dispatch
            
            response = dispatch(post_data.decode())
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(response.encode())
        except Exception as e:
            print(f"Error en RPC handler: {e}")
            self.send_response(500)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass  # Suprimir logs del servidor HTTP

# Iniciar hilos
for i in range(3):
    t = threading.Thread(target=simulate_sensor, args=(f"sensor_{i}", "temperature"))
    t.daemon = True
    t.start()

# Iniciar RPC server
print(f"Iniciando servidor RPC en {RPC_HOST}:{RPC_PORT}")
server = HTTPServer((RPC_HOST, RPC_PORT), RPCRequestHandler)
server.serve_forever()
