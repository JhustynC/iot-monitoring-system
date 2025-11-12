import express from "express";
import http from "http";
import { Server } from "socket.io";
import { Kafka } from "kafkajs";
import axios from "axios";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const kafka = new Kafka({ brokers: ["localhost:9092"] });
const consumer = kafka.consumer({ groupId: "aggregator-group" });

// Consumir datos de Kafka y reenviar al dashboard
async function consumeKafka() {
  await consumer.connect();
  await consumer.subscribe({ topic: "sensor_data" });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const data = JSON.parse(message.value!.toString());
      console.log("Dato recibido:", data);
      io.emit("sensor-update", data);
    },
  });
}

// Consultar estado RPC de los nodos
async function checkSensorStatus() {
  try {
    const response = await axios.post("http://localhost:5000", {
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

setInterval(checkSensorStatus, 10000);
consumeKafka();

server.listen(4000, () => console.log("Agregador activo en http://localhost:4000"));
