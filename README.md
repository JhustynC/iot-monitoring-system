# Sistemas Distribuidos - Trabajo Interciclo

### El proyecto **utiliza:**:

- **RPC**
- **Kafka (cola de mensajes)**
- **Hilos o concurrencia**
- **Dos lenguajes (Python + TypeScript)**

---

## Arquitectura Completa

```
              ┌───────────────────────────────┐
              │      NODOS SENSOR (Python)    │
              │ ───────────────────────────── │
              │  - Usa hilos (threading)      │
              │  - Envía datos a KAFKA        │
              │  - Expone JSON-RPC Server     │
              │    para consultar estado      │
              └─────────────┬─────────────────┘
                            │
                 (Mensajes JSON de sensores)
                            │
                     ┌──────▼──────┐
                     │   KAFKA     │
                     │   Broker    │
                     └──────┬──────┘
                            │
               ┌────────────▼────────────────┐
               │   AGGREGATOR (Node + TS)    │
               │ ─────────────────────────   │
               │ - Consume datos de Kafka    │
               │ - Hace llamadas RPC a nodos │
               │ - Analiza / almacena datos  │
               │ - Expone API y WS al        │
               │   dashboard                 │
               └─────────────┬───────────────┘
                             │
                  ┌──────────▼──────────┐
                  │   DASHBOARD (React) │
                  │   Muestra en vivo   │
                  └─────────────────────┘
```

---

## FLUJO GENERAL DE DATOS

1. **Cada nodo Python** simula varios sensores con *threads*.
2. Los datos se envían a **Kafka** (topic `sensor_data`).
3. El **servidor Node.js** consume los mensajes de Kafka.
4. Ocasionalmente, el servidor usa **JSON-RPC** para consultar directamente a los nodos (por ejemplo, “¿cuántos mensajes enviaste?” o “¿qué sensor está activo?”).
5. Los datos procesados se transmiten vía **WebSocket** a React.

---

## TECNOLOGÍAS Y JUSTIFICACIÓN

| Tecnología               | Rol                                      | Justificación                                     |
| ------------------------ | ---------------------------------------- | ------------------------------------------------- |
| **Python**               | Simuladores IoT                          | Lenguaje ideal para hilos y simulaciones.         |
| **Kafka**                | Middleware de mensajería                 | Permite desacoplar productores y consumidores.    |
| **JSON-RPC**             | Comunicación directa RPC entre servicios | Demuestra RPC real sin depender de HTTP REST.     |
| **Node.js + TypeScript** | Agregador / analizador                   | Gestiona alto tráfico y es tipado.                |
| **React**                | Dashboard                                | Visualización moderna y en tiempo real.           |
| **Threading (Python)**   | Concurrencia                             | Simula múltiples dispositivos en un solo proceso. |

## Estructura de proyecto recomendada

```
iot-monitoring-system/
│
├── docker-compose.yml
│
├── sensor-node/
│   ├── sensor_node.py
│   ├── requirements.txt
│
├── aggregator-service/
│   ├── src/
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│
├── dashboard/
│   └── src/App.jsx
│
└── kafka/
    └── docker-compose.yml
```

## Explicación académica (resumen técnico para presentación)

| Concepto                    | Dónde se aplica                                       |
| --------------------------- | ----------------------------------------------------- |
| **Distribución**            | Sensores Python y servidor Node en distintos procesos |
| **Concurrencia**            | Threads en Python simulando varios sensores           |
| **Comunicación RPC**        | JSON-RPC entre Node.js ↔ Python                       |
| **Comunicación asíncrona**  | Kafka entre productores y consumidor                  |
| **Persistencia y análisis** | Node.js podría guardar datos y analizar               |
| **Tiempo real**             | WebSocket hacia React                                 |
| **Multi-lenguaje**          | Python + TypeScript                                   |

---
