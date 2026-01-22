import express from "express";
import http from "http";
import { Server } from "socket.io";
import { Kafka } from "kafkajs";
import axios from "axios";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const KAFKA_BROKER = process.env.KAFKA_BROKER || "localhost:9092";
const TOPIC_NAME = process.env.TOPIC_NAME || "sensor-data";
const PORT = parseInt(process.env.PORT || "3000");
const SENSOR_NODE_RPC = process.env.SENSOR_NODE_RPC || "http://sensor-node:5000";

const kafka = new Kafka({ brokers: [KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: "aggregator-group" });

// Consumir datos de Kafka y reenviar al dashboard
async function consumeKafka() {
  const maxRetries = 10;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await consumer.connect();
      console.log("Conectado a Kafka");
      await consumer.subscribe({ topic: TOPIC_NAME });
      console.log(`Suscrito al topic: ${TOPIC_NAME}`);
      await consumer.run({
        eachMessage: async ({ message }) => {
          try {
            const data = JSON.parse(message.value!.toString());
            console.log("Dato recibido:", data);

            // Lógica para el Sidecar: Escribir en el archivo compartido
            const logDir = "/app/logs";
            const logFile = path.join(logDir, "audit.log");
            const logEntry = `[${new Date().toISOString()}] AUDIT: Sensor ${data.sensor_id} envió valor ${data.value}\n`;

            try {
              if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
              fs.appendFileSync(logFile, logEntry);
            } catch (fsErr) {
              console.error("Error escribiendo en el log para el sidecar:", fsErr);
            }

            io.emit("sensor-update", data);
          } catch (err) {
            console.error("Error procesando mensaje:", err);
          }
        },
      });
      break; // Si llegamos aquí, todo está bien
    } catch (err) {
      retries++;
      console.error(`Error conectando a Kafka (intento ${retries}/${maxRetries}):`, err);
      if (retries < maxRetries) {
        console.log("Reintentando en 5 segundos...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error("Error crítico: No se pudo conectar a Kafka después de múltiples intentos");
        // No salir, seguir intentando
        await new Promise(resolve => setTimeout(resolve, 10000));
        retries = 0; // Reiniciar contador
      }
    }
  }
}

// Consultar estado RPC de los nodos
async function checkSensorStatus() {
  try {
    const response = await axios.post(SENSOR_NODE_RPC, {
      jsonrpc: "2.0",
      method: "get_status",
      id: 1
    });
    console.log("Estado RPC:", response.data.result);
  } catch (err) {
    if (err instanceof Error) {
      console.error("Error RPC:", err.message);
    } else {
      console.error("Error RPC:", err);
    }
  }
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Iniciar servidor HTTP primero
server.listen(PORT, () => {
  console.log(`Agregador activo en http://0.0.0.0:${PORT}`);
  // Luego iniciar Kafka consumer
  consumeKafka().catch(err => {
    console.error("Error fatal en consumeKafka:", err);
  });
});

// Iniciar verificación RPC después de un delay
setTimeout(() => {
  setInterval(checkSensorStatus, 10000);
}, 5000);
