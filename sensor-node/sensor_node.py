from kafka import KafkaProducer
import json, time, random, threading
from jsonrpcserver import method, serve

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

sensor_status = {"messages_sent": 0}

def simulate_sensor(sensor_id, sensor_type):
    global sensor_status
    while True:
        data = {
            'sensor_id': sensor_id,
            'type': sensor_type,
            'value': round(random.uniform(20, 30), 2),
            'timestamp': time.time()
        }
        producer.send('sensor_data', value=data)
        sensor_status["messages_sent"] += 1
        print(f"[{sensor_type}] Sent: {data}")
        time.sleep(random.randint(1, 3))

# RPC MÉTODOS
@method
def get_status():
    return sensor_status

# Iniciar hilos
for i in range(3):
    t = threading.Thread(target=simulate_sensor, args=(f"sensor_{i}", "temperature"))
    t.start()

# Iniciar RPC server
serve("localhost", 5000)
