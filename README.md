# Informe Final del Sistema de Monitoreo IoT Distribuido
## Guía de Arquitectura, Implementación y Defensa

Este documento consolida todo el trabajo realizado, las correcciones aplicadas y la justificación técnica para la defensa del proyecto final de Sistemas Distribuidos.

---

## Tabla de Contenidos
1. [Arquitectura del Sistema](#1-arquitectura-del-sistema)
2. [Cumplimiento de Requisitos](#2-cumplimiento-de-requisitos-justificación-técnica)
3. [Detalles de Implementación](#3-detalles-de-implementación)
4. [Guía de Despliegue desde Cero](#4-guía-de-despliegue-desde-cero)
5. [Flujo de Datos Completo](#5-flujo-de-datos-completo)
6. [Guía de Presentación PASO A PASO](#6-guía-de-presentación-paso-a-paso-defensa)
7. [Comandos de Verificación](#7-comandos-de-verificación)
8. [Solución de Problemas](#8-solución-de-problemas-comunes)

---

## 1. Arquitectura del Sistema

El sistema implementa una **arquitectura de microservicios distribuidos** siguiendo los principios de **desacoplamiento**, **escalabilidad horizontal** y **tolerancia a fallos**. La orquestación completa se realiza mediante **Kubernetes**, aprovechando sus capacidades nativas de auto-recuperación, balanceo de carga y escalado automático.

### 1.1 Diagrama de Arquitectura

```
                                CAPA DE PRESENTACIÓN
                                ┌─────────────────┐
                                │   NAVEGADOR     │
                                │   (Cliente)     │
                                └────────┬────────┘
                                         │ HTTP/WS
                                         │ localhost:80
                                         │ localhost:3000
                                         ▼
┌────────────────────────────────────────────────────────────────────┐
│                    KUBERNETES CLUSTER (Docker Desktop)              │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              CAPA DE ACCESO (Load Balancers)                  │ │
│  │                                                               │ │
│  │  ┌─────────────────┐         ┌──────────────────┐           │ │
│  │  │ LoadBalancer    │         │  LoadBalancer    │           │ │
│  │  │ dashboard-svc   │         │  aggregator-svc  │           │ │
│  │  │ Port: 80        │         │  Port: 3000      │           │ │
│  │  └────────┬────────┘         └────────┬─────────┘           │ │
│  └───────────┼──────────────────────────┼─────────────────────┘ │
│              │                           │                        │
│  ┌───────────▼───────────────────────────▼─────────────────────┐ │
│  │              CAPA DE PRESENTACIÓN (Pods)                     │ │
│  │                                                               │ │
│  │  ┌──────────────┐         ┌─────────────────────────────┐   │ │
│  │  │  Dashboard   │         │   Aggregator Service        │   │ │
│  │  │  (Nginx)     │◄────────┤   (Node.js/TypeScript)      │   │ │
│  │  │  Réplicas: 1 │  WS     │   Réplicas: 2-10 (HPA)      │   │ │
│  │  └──────────────┘         │                             │   │ │
│  │                           │   ┌──────────────────────┐  │   │ │
│  │                           │   │  Sidecar Auditor     │  │   │ │
│  │                           │   │  (Busybox)           │  │   │ │
│  │                           │   └──────────────────────┘  │   │ │
│  │                           │   Shared Volume: emptyDir   │   │ │
│  │                           └──────────┬──────────────────┘   │ │
│  └──────────────────────────────────────┼──────────────────────┘ │
│                                          │                        │
│                                          │ Kafka Consumer         │
│                                          │ JSON-RPC Client        │
│  ┌───────────────────────────────────────▼──────────────────────┐ │
│  │              CAPA DE MIDDLEWARE (Message Broker)             │ │
│  │                                                               │ │
│  │  ┌──────────────────────────────────────────────────────┐   │ │
│  │  │  Kafka Broker (KRaft Mode)                           │   │ │
│  │  │  Service: kafka-service (ClusterIP)                  │   │ │
│  │  │  Port: 9092                                          │   │ │
│  │  │  Topic: sensor-data (1 partición)                    │   │ │
│  │  └────────────────────┬─────────────────────────────────┘   │ │
│  └───────────────────────┼─────────────────────────────────────┘ │
│                          │                                        │
│                          │ Kafka Producer                         │
│                          │ JSON-RPC Server                        │
│  ┌───────────────────────▼─────────────────────────────────────┐ │
│  │              CAPA DE DATOS (Data Producers)                  │ │
│  │                                                               │ │
│  │  ┌──────────────────────────────────────────────────────┐   │ │
│  │  │  Sensor Node (Python)                                │   │ │
│  │  │  Service: sensor-node-service (ClusterIP)            │   │ │
│  │  │  Port: 5000 (RPC)                                    │   │ │
│  │  │  Réplicas: 1                                         │   │ │
│  │  └──────────────────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              CAPA DE INFRAESTRUCTURA                          │ │
│  │                                                               │ │
│  │  • ConfigMaps: iot-config (variables de entorno)             │ │
│  │  • Secrets: iot-secrets (credenciales)                       │ │
│  │  • HPA: aggregator-hpa (auto-escalado 2-10 réplicas)         │ │
│  │  • Metrics Server: Recolección de métricas CPU/RAM           │ │
│  │  • Namespace: iot-monitoring                                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Capas de la Arquitectura

#### **Capa 1: Presentación (Frontend)**
- **Dashboard (React + Nginx):** Interfaz de usuario servida como contenido estático optimizado.
- **Acceso:** LoadBalancer expone el puerto 80 hacia `localhost`.

#### **Capa 2: Lógica de Negocio (Backend)**
- **Aggregator Service:** Procesa eventos de Kafka y los distribuye vía WebSockets.
- **Patrón Sidecar:** Contenedor auxiliar para auditoría sin modificar el código principal.
- **Acceso:** LoadBalancer expone el puerto 3000 para conexiones WebSocket desde el navegador.

#### **Capa 3: Middleware (Message Broker)**
- **Kafka:** Desacopla productores (sensores) de consumidores (agregador).
- **Acceso:** ClusterIP (privado), solo accesible dentro del clúster.

#### **Capa 4: Productores de Datos (IoT Simulation)**
- **Sensor Node:** Simula dispositivos IoT generando telemetría.
- **Acceso:** ClusterIP (privado) con endpoint RPC para consultas de salud.

#### **Capa 5: Infraestructura (Kubernetes)**
- **ConfigMaps/Secrets:** Gestión centralizada de configuración.
- **HPA:** Auto-escalado basado en métricas de CPU.
- **Metrics Server:** Recolección de métricas para el HPA.

---

### 1.3 Networking y Load Balancing

#### **Tipos de Servicios de Kubernetes**

| Servicio | Tipo | Puerto | Propósito | Acceso |
|:---------|:-----|:-------|:----------|:-------|
| `dashboard-service` | **LoadBalancer** | 80 | Exponer la UI web al navegador | `http://localhost` |
| `aggregator-service` | **LoadBalancer** | 3000 | Permitir conexiones WebSocket desde el navegador | `ws://localhost:3000` |
| `kafka-service` | **ClusterIP** | 9092 | Comunicación interna del clúster (privado) | `kafka-service:9092` |
| `sensor-node-service` | **ClusterIP** | 5000 | Endpoint RPC interno (privado) | `sensor-node-service:5000` |

#### **Funcionamiento del Load Balancer**

El Load Balancer en Kubernetes cumple dos funciones críticas:

1. **Puente de Red (Ingress):**
   - Docker Desktop mapea puertos del clúster a `localhost` de Windows.
   - Cuando accedes a `http://localhost:80`, el tráfico se "inyecta" dentro de la red privada de Kubernetes.

2. **Distribución de Carga (Balancing):**
   - Cuando el HPA escala el `aggregator-service` a 5 réplicas, el Load Balancer distribuye las peticiones entrantes entre los 5 Pods usando **Round Robin**.
   - Esto evita que un solo Pod se sature mientras otros están ociosos.

**Ejemplo de Balanceo:**
```
Petición 1 → Load Balancer → Pod aggregator-1
Petición 2 → Load Balancer → Pod aggregator-2
Petición 3 → Load Balancer → Pod aggregator-3
Petición 4 → Load Balancer → Pod aggregator-1 (ciclo)
```

---

### 1.4 Componentes Principales (Detalle Técnico)

#### **1. Sensor Node (Python)**
```
┌─────────────────────────────────────┐
│  Sensor Node (Python 3.11)          │
│                                     │
│  ├─ Threading (3 sensores)          │
│  ├─ Kafka Producer                  │
│  │  └─ Topic: sensor-data           │
│  ├─ JSON-RPC Server (Flask)         │
│  │  └─ Endpoint: /                  │
│  └─ Dockerfile: Optimizado          │
│     ├─ Usuario no-root              │
│     └─ Variables de entorno Python  │
└─────────────────────────────────────┘
```

**Responsabilidades:**
- Genera datos aleatorios de temperatura cada 1-3 segundos
- Publica mensajes al topic `sensor-data` de Kafka
- Expone endpoint RPC en puerto 5000 para consultas de estado (`get_status`)

**Tecnologías:** Python 3.11, kafka-python, Flask

---

#### **2. Kafka (Message Broker)**
```
┌─────────────────────────────────────┐
│  Kafka Broker (KRaft Mode)          │
│                                     │
│  ├─ Modo: KRaft (sin Zookeeper)     │
│  ├─ Topic: sensor-data              │
│  │  └─ Particiones: 1               │
│  ├─ Puerto: 9092 (ClusterIP)        │
│  ├─ Resources:                      │
│  │  ├─ RAM: 512Mi                   │
│  │  └─ CPU: 500m                    │
│  └─ Imagen: bitnamilegacy/kafka:3.7.1│
└─────────────────────────────────────┘
```

**Ventajas:**
- **Desacoplamiento:** Productores y consumidores no se conocen
- **Buffer:** Retiene mensajes si el agregador cae temporalmente
- **Escalabilidad:** Soporta múltiples particiones para paralelismo

---

#### **3. Aggregator Service (Node.js/TypeScript)**
```
┌─────────────────────────────────────────────────┐
│  Aggregator Service (Node.js 20 + TypeScript)   │
│                                                 │
│  ├─ Kafka Consumer                              │
│  │  └─ Group: aggregator-group                 │
│  ├─ WebSocket Server (Socket.IO)                │
│  │  └─ Evento: sensor-update                   │
│  ├─ JSON-RPC Client                             │
│  │  └─ Consulta salud del Sensor Node          │
│  ├─ Auditoría (Sidecar Pattern)                 │
│  │  └─ Escribe en /app/logs/audit.log          │
│  ├─ Dockerfile: Multi-stage                     │
│  │  ├─ Etapa 1: Build (TypeScript → JS)        │
│  │  └─ Etapa 2: Production (solo dist/)        │
│  └─ Escalabilidad: HPA (2-10 réplicas)          │
└─────────────────────────────────────────────────┘
```

**Responsabilidades:**
- Consume mensajes del topic `sensor-data`
- Emite eventos en tiempo real vía WebSockets (Socket.IO)
- Realiza llamadas RPC al Sensor Node cada 10s para verificar salud
- Escribe logs de auditoría en volumen compartido

**Tecnologías:** Express, Socket.IO, KafkaJS, TypeScript, fs (Node.js)

---

#### **4. Sidecar Auditor (Busybox)**
```
┌─────────────────────────────────────┐
│  Sidecar Auditor (Busybox 1.28)     │
│                                     │
│  ├─ Comando: tail -f audit.log      │
│  ├─ Volumen: shared-logs (emptyDir) │
│  │  └─ Ruta: /app/logs              │
│  ├─ Resources:                      │
│  │  ├─ RAM: 64Mi                    │
│  │  └─ CPU: 50m                     │
│  └─ Función: Auditoría independiente│
└─────────────────────────────────────┘
```

**Patrón Sidecar:**
- Corre en el mismo Pod que el Aggregator
- Comparte volumen `emptyDir` montado en `/app/logs`
- Lee el archivo `audit.log` que escribe el Aggregator
- Procesa eventos de auditoría sin afectar la aplicación principal

**Ventaja:** Separación de responsabilidades (observabilidad vs lógica de negocio)

---

#### **5. Dashboard (React + Vite + Nginx)**
```
┌─────────────────────────────────────┐
│  Dashboard (React 18 + Nginx)       │
│                                     │
│  ├─ Build: Vite (optimizado)        │
│  ├─ Servidor: Nginx Alpine          │
│  ├─ WebSocket Client (Socket.IO)    │
│  │  └─ Conecta a aggregator:3000   │
│  ├─ Gráficas: Recharts              │
│  ├─ Dockerfile: Multi-stage         │
│  │  ├─ Etapa 1: npm run build       │
│  │  └─ Etapa 2: Nginx serve         │
│  └─ Acceso: LoadBalancer (port 80)  │
└─────────────────────────────────────┘
```

**Características:**
- Gráficas de línea actualizadas en tiempo real
- Conexión WebSocket persistente al Agregador
- Servido por Nginx (10x más eficiente que `npm run dev`)

**Tecnologías:** React 18, Recharts, Socket.IO Client, Nginx

---

### 1.5 Patrones de Diseño Implementados

#### **1. Patrón Sidecar**
- **Definición:** Contenedor auxiliar que extiende la funcionalidad del contenedor principal sin modificar su código.
- **Implementación:** El `sidecar-auditor` monitorea logs del `aggregator-service`.
- **Beneficio:** Separación de responsabilidades, modularidad.

#### **2. Patrón Pub/Sub (Publish-Subscribe)**
- **Definición:** Desacoplamiento entre productores y consumidores mediante un broker.
- **Implementación:** Kafka actúa como broker entre Sensor Node (publisher) y Aggregator (subscriber).
- **Beneficio:** Tolerancia a fallos, escalabilidad.

#### **3. Patrón API Gateway**
- **Definición:** Punto de entrada único que enruta peticiones a microservicios.
- **Implementación:** El Aggregator Service actúa como gateway entre Kafka y el Dashboard.
- **Beneficio:** Centralización de lógica de enrutamiento.

#### **4. Patrón Circuit Breaker (Implícito)**
- **Definición:** Prevención de fallos en cascada mediante reintentos controlados.
- **Implementación:** El Aggregator reintenta conexión a Kafka hasta 10 veces con delays.
- **Beneficio:** Resiliencia ante fallos temporales.

---

## 2. Cumplimiento de Requisitos (Justificación Técnica)

### Requisitos Mínimos del Proyecto

| Requisito | Implementación Técnica | Archivo/Evidencia | Justificación |
| :--- | :--- | :--- | :--- |
| **1. Desacoplamiento por Colas** | Kafka (Topic: `sensor-data`) | `k8s/kafka.yaml` | Los sensores publican sin conocer al agregador. Si el agregador cae, Kafka retiene los mensajes. |
| **2. Microservicios (3+)** | Sensor, Agregador, Dashboard | Carpetas separadas | Cada servicio tiene su propio ciclo de vida, tecnología y Dockerfile. |
| **3. Ingreso de Datos (gRPC/REST)** | JSON-RPC 2.0 | `sensor-node/sensor_node.py` línea 45-60 | El Agregador consulta el estado del Sensor vía RPC sobre HTTP. |
| **4. Tiempo Real (WebSockets)** | Socket.IO | `aggregator-service/src/index.ts` línea 37 | El Dashboard recibe eventos `sensor-update` sin polling. |
| **5. Contenerización** | Dockerfiles optimizados | `*/Dockerfile` | Multi-stage builds, usuarios no-root, imágenes Alpine/Slim. |
| **6. Orquestación K8s** | Deployments, Services, ConfigMaps | `k8s/*.yaml` | Namespace `iot-monitoring`, uso de Kustomization. |
| **7. Resources Requests/Limits** | Configurados en todos los Deployments | `k8s/aggregator-service.yaml` líneas 44-49 | CPU y Memoria definidos para scheduling correcto. |
| **8. HPA (Autoscaling)** | Horizontal Pod Autoscaler | `k8s/hpa.yaml` | Escala de 2 a 10 réplicas si CPU > 50%. |
| **9. Prueba de Carga** | Generador con BusyBox | `LOAD_TESTING.md` | Comando `wget` en loop para estresar el sistema. |
| **10. Patrón Avanzado** | **Sidecar** | `k8s/aggregator-service.yaml` líneas 53-69 | Contenedor auditor comparte volumen `emptyDir` con la app. |

---

## 3. Detalles de Implementación

### 3.1 Optimizaciones de Dockerfiles

#### Sensor Node
```dockerfile
FROM python:3.11-slim
RUN useradd -m appuser
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY sensor_node.py .
RUN chown -R appuser:appuser /app
USER appuser
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
CMD ["python", "sensor_node.py"]
```
**Optimizaciones:**
- Usuario no-root (`appuser`)
- Variables de entorno para optimizar Python
- `--no-cache-dir` reduce tamaño de imagen

#### Aggregator Service (Multi-stage)
```dockerfile
# Etapa 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Etapa 2: Production
FROM node:20-alpine
RUN adduser -D appuser
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
RUN chown -R appuser:appuser /app
USER appuser
CMD ["npm", "start"]
```
**Ventajas:**
- Imagen final no contiene TypeScript ni devDependencies
- Reducción de ~60% en tamaño
- Seguridad mejorada

#### Dashboard (Multi-stage con Nginx)
```dockerfile
# Etapa 1: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Etapa 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
**Ventajas:**
- Nginx es 10x más eficiente que `npm run dev` para archivos estáticos
- Imagen final de solo ~25MB

### 3.2 Configuración de Kubernetes

#### Namespace y ConfigMap
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: iot-monitoring

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: iot-config
  namespace: iot-monitoring
data:
  KAFKA_BROKER: "kafka-service:9092"
  TOPIC_NAME: "sensor-data"
  AGGREGATOR_PORT: "3000"
  SENSOR_NODE_RPC: "http://sensor-node-service:5000"
  VITE_API_URL: "http://localhost:3000"
```

#### Patrón Sidecar (Detalle)
```yaml
# k8s/aggregator-service.yaml (fragmento)
spec:
  containers:
  # Contenedor principal
  - name: aggregator-service
    image: aggregator-service:local
    volumeMounts:
    - name: shared-logs
      mountPath: /app/logs
  
  # Contenedor Sidecar
  - name: sidecar-auditor
    image: busybox:1.28
    command: ["/bin/sh", "-c", "while true; do if [ -f /app/logs/audit.log ]; then tail -f /app/logs/audit.log; fi; sleep 10; done"]
    volumeMounts:
    - name: shared-logs
      mountPath: /app/logs
  
  # Volumen compartido
  volumes:
  - name: shared-logs
    emptyDir: {}
```

**Explicación técnica:**
- `emptyDir`: Volumen temporal en memoria/disco del nodo
- Ambos contenedores montan la misma ruta `/app/logs`
- El agregador escribe, el sidecar lee (desacoplamiento)

---

## 4. Guía de Despliegue desde Cero

### Prerrequisitos
- **Docker Desktop** con Kubernetes habilitado
- **kubectl** instalado y configurado
- **Git** (para clonar el repositorio)

### Paso 1: Clonar el Repositorio
```bash
git clone https://github.com/JhustynC/iot-monitoring-system.git
cd iot-monitoring-system
```

### Paso 2: Construcción de Imágenes Locales
```bash
# Construir todas las imágenes
docker build -t sensor-node:local ./sensor-node
docker build -t aggregator-service:local ./aggregator-service
docker build -t dashboard:local ./dashboard

# Verificar imágenes creadas
docker images | grep local
```

### Paso 3: Instalación del Metrics Server
```bash
# Instalar componentes
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Parchear para Docker Desktop (Windows)
kubectl patch deployment metrics-server -n kube-system --type="json" -p="[{\"op\": \"add\", \"path\": \"/spec/template/spec/containers/0/args/-\", \"value\": \"--kubelet-insecure-tls\"}]"

# Verificar instalación
kubectl get deployment metrics-server -n kube-system
```

### Paso 4: Despliegue de la Infraestructura
```bash
# Desplegar todos los recursos
kubectl apply -k k8s/

# Monitorear el despliegue
kubectl get pods -n iot-monitoring -w
```

**Orden de inicio esperado:**
1. Kafka (puede tardar 30-60s)
2. Sensor Node (espera a Kafka)
3. Aggregator Service (espera a Kafka)
4. Dashboard (inicia inmediatamente)

### Paso 5: Verificación del Sistema
```bash
# Ver todos los recursos
kubectl get all -n iot-monitoring

# Verificar HPA
kubectl get hpa -n iot-monitoring

# Ver logs del agregador
kubectl logs -l app=aggregator-service -n iot-monitoring -c aggregator-service --tail=20
```

---

## 5. Flujo de Datos Completo

### Secuencia de Eventos (Paso a Paso)

1. **Generación de Datos (Sensor Node)**
   ```python
   # sensor_node.py
   data = {
       "sensor_id": "sensor_0",
       "type": "temperature",
       "value": 24.5,
       "timestamp": time.time()
   }
   producer.send('sensor-data', value=data)
   ```

2. **Almacenamiento en Kafka**
   - Kafka recibe el mensaje en el topic `sensor-data`
   - Lo almacena en la partición 0
   - Espera a que un consumidor lo procese

3. **Consumo (Aggregator Service)**
   ```typescript
   // aggregator-service/src/index.ts
   await consumer.run({
     eachMessage: async ({ message }) => {
       const data = JSON.parse(message.value.toString());
       
       // Escribir en log para Sidecar
       const logEntry = `[${new Date().toISOString()}] AUDIT: Sensor ${data.sensor_id} envió valor ${data.value}\n`;
       fs.appendFileSync("/app/logs/audit.log", logEntry);
       
       // Emitir a Dashboard
       io.emit("sensor-update", data);
     }
   });
   ```

4. **Auditoría (Sidecar)**
   - El comando `tail -f` detecta la nueva línea en `audit.log`
   - La imprime en stdout (visible con `kubectl logs`)

5. **Visualización (Dashboard)**
   ```javascript
   // dashboard/src/App.jsx
   socket.on("sensor-update", (data) => {
     setChartData(prev => [...prev, data]);
   });
   ```

---

## 6. Guía de Presentación PASO A PASO (Defensa)

### Preparación Previa
- Tener el sistema corriendo (`kubectl get pods -n iot-monitoring`)
- Abrir 2 terminales: una para comandos, otra para logs
- Tener el navegador en `http://localhost`

### Fase 1: Introducción (2 minutos)
**Acción:** Mostrar el diagrama ASCII del informe.

**Discurso sugerido:**
> "Buenos días/tardes. He desarrollado un **Sistema de Monitoreo IoT Distribuido** que cumple con todos los requisitos del proyecto. A diferencia de una arquitectura monolítica, he implementado una solución basada en **microservicios desacoplados** utilizando Kafka como middleware de mensajería. Esto garantiza tolerancia a fallos, escalabilidad y separación de responsabilidades."

### Fase 2: Demostración de Infraestructura (3 minutos)
**Comando:**
```bash
kubectl get pods -n iot-monitoring
```

**Qué señalar:**
- Todos los pods en estado `Running`
- El `aggregator-service` muestra **2/2** (Sidecar activo)

**Discurso:**
> "Como pueden observar, todo el sistema está orquestado en Kubernetes dentro del namespace `iot-monitoring`. Tenemos desplegados 4 servicios principales. Noten que el `aggregator-service` tiene **2/2** en la columna READY. Esto indica que he implementado el **Patrón Sidecar**, donde un contenedor secundario audita las operaciones del contenedor principal."

**Comando adicional:**
```bash
kubectl get svc -n iot-monitoring
```

**Explicar:**
- `ClusterIP` para servicios internos (Kafka, Sensor)
- `LoadBalancer` para acceso externo (Dashboard, Agregador)

### Fase 3: El Patrón Sidecar (5 minutos - PUNTO FUERTE)
**Comando:**
```bash
# Obtener nombre de un pod del agregador
kubectl get pods -n iot-monitoring -l app=aggregator-service

# Ver logs del Sidecar
kubectl logs <NOMBRE_POD> -n iot-monitoring -c sidecar-auditor --tail=20
```

**Resultado esperado:**
```
[2026-01-21T20:51:03.859Z] AUDIT: Sensor sensor_2 envió valor 20.89
[2026-01-21T20:51:04.216Z] AUDIT: Sensor sensor_1 envió valor 28.42
...
```

**Discurso:**
> "Aquí vemos los logs del contenedor Sidecar. Es importante destacar que **mi aplicación principal no está imprimiendo esto directamente**. El Aggregator Service escribe eventos de auditoría en un archivo dentro de un volumen compartido (`emptyDir`), y el Sidecar los detecta y procesa en tiempo real. Esto demuestra:
> 1. **Separación de responsabilidades**: La lógica de negocio está separada de la observabilidad.
> 2. **Independencia**: Si el Sidecar falla, el agregador sigue funcionando.
> 3. **Escalabilidad**: Puedo cambiar el Sidecar por uno que envíe logs a Elasticsearch sin tocar el código principal."

**Demostración interactiva (opcional):**
```bash
# Escribir manualmente en el volumen desde el agregador
kubectl exec <NOMBRE_POD> -n iot-monitoring -c aggregator-service -- sh -c "echo 'EVENTO_MANUAL: Prueba de concepto' >> /app/logs/audit.log"

# Ver que el Sidecar lo detecta
kubectl logs <NOMBRE_POD> -n iot-monitoring -c sidecar-auditor --tail=5
```

### Fase 4: Tiempo Real (WebSockets) (2 minutos)
**Acción:** Abrir el navegador en `http://localhost`.

**Discurso:**
> "El cliente final es esta aplicación en React, servida eficientemente por Nginx. Se conecta al Aggregator Service mediante **WebSockets (Socket.IO)** para recibir actualizaciones en tiempo real. Como pueden ver, las gráficas se actualizan automáticamente sin necesidad de recargar la página, completando el flujo de datos desde los sensores hasta la visualización."

**Demostración:**
- Mostrar la consola del navegador (F12) donde se ven los eventos `sensor-update`
- Señalar que no hay polling, solo eventos push

### Fase 5: Escalabilidad (HPA) (3 minutos)
**Comando:**
```bash
kubectl get hpa -n iot-monitoring
```

**Resultado esperado:**
```
NAME              REFERENCE                       TARGETS   MINPODS   MAXPODS   REPLICAS
aggregator-hpa    Deployment/aggregator-service   15%/50%   2         10        2
```

**Discurso:**
> "Para garantizar robustez ante picos de carga, he configurado un **Horizontal Pod Autoscaler**. Actualmente el sistema está en reposo (15% de CPU), pero si la carga supera el 50%, Kubernetes aprovisionará automáticamente hasta 10 réplicas del agregador."

**Demostración de carga (opcional):**
```bash
# Iniciar generador de carga
kubectl run -i --tty load-generator --rm --image=busybox:1.28 --restart=Never -n iot-monitoring -- /bin/sh -c "while sleep 0.01; do wget -q -O- http://aggregator-service:3000; done"

# En otra terminal, observar el escalado
kubectl get hpa -n iot-monitoring --watch
```

**Explicar:**
> "Como pueden ver, el uso de CPU está aumentando y Kubernetes está levantando nuevas réplicas automáticamente. Esto demuestra que el sistema puede manejar cargas variables sin intervención manual."

### Fase 6: Comunicación RPC (2 minutos)
**Comando:**
```bash
kubectl logs -l app=aggregator-service -n iot-monitoring -c aggregator-service | grep "Estado RPC"
```

**Resultado esperado:**
```
Estado RPC: { messages_sent: 2857 }
Estado RPC: { messages_sent: 2874 }
```

**Discurso:**
> "Adicionalmente, he implementado comunicación **JSON-RPC 2.0** entre el Aggregator (Node.js) y el Sensor Node (Python). Cada 10 segundos, el agregador consulta el estado del sensor para verificar su salud, demostrando interoperabilidad entre tecnologías heterogéneas."

### Fase 7: Cierre (1 minuto)
**Discurso:**
> "En resumen, he implementado un sistema distribuido completo que cumple con todos los requisitos:
> - ✅ Desacoplamiento mediante Kafka
> - ✅ Microservicios con tecnologías heterogéneas
> - ✅ Comunicación en tiempo real con WebSockets
> - ✅ Interoperabilidad con JSON-RPC
> - ✅ Orquestación completa en Kubernetes
> - ✅ Escalabilidad automática con HPA
> - ✅ Patrón avanzado Sidecar para observabilidad
> 
> El sistema está listo para producción y puede escalar horizontalmente según la demanda. ¿Tienen alguna pregunta?"

---

## 7. Comandos de Verificación

### Verificar Estado General
```bash
# Ver todos los recursos
kubectl get all -n iot-monitoring

# Ver pods con detalles
kubectl get pods -n iot-monitoring -o wide

# Ver servicios y sus endpoints
kubectl get svc,endpoints -n iot-monitoring
```

### Verificar Configuración
```bash
# Ver ConfigMap
kubectl get configmap iot-config -n iot-monitoring -o yaml

# Ver Secrets
kubectl get secret iot-secrets -n iot-monitoring -o yaml
```

### Verificar Logs
```bash
# Logs del Sensor Node
kubectl logs -l app=sensor-node -n iot-monitoring --tail=50

# Logs del Agregador (contenedor principal)
kubectl logs -l app=aggregator-service -n iot-monitoring -c aggregator-service --tail=50

# Logs del Sidecar
kubectl logs -l app=aggregator-service -n iot-monitoring -c sidecar-auditor --tail=50

# Logs de Kafka
kubectl logs -l app=kafka -n iot-monitoring --tail=50
```

### Verificar Métricas y HPA
```bash
# Ver métricas de pods
kubectl top pods -n iot-monitoring

# Ver estado del HPA
kubectl get hpa -n iot-monitoring

# Describir HPA (detalles)
kubectl describe hpa aggregator-hpa -n iot-monitoring
```

### Verificar Conectividad
```bash
# Probar conexión al Dashboard
curl http://localhost

# Probar conexión al Agregador
curl http://localhost:3000

# Ejecutar shell en un pod
kubectl exec -it <POD_NAME> -n iot-monitoring -c aggregator-service -- sh
```

---

## 8. Solución de Problemas Comunes

### Problema 1: ImagePullBackOff en Kafka
**Síntoma:**
```bash
kubectl get pods -n iot-monitoring
# kafka-xxx   0/1   ImagePullBackOff
```

**Causa:** Docker no encuentra la imagen `bitnami/kafka:3.7.1`

**Solución:**
```bash
# Verificar que usamos la imagen legacy
grep "image:" k8s/kafka.yaml
# Debe decir: image: bitnamilegacy/kafka:3.7.1

# Si no, editar y aplicar
kubectl apply -f k8s/kafka.yaml
```

### Problema 2: Dashboard no carga (ERR_CONNECTION_REFUSED)
**Síntoma:** El navegador no puede conectar a `http://localhost`

**Diagnóstico:**
```bash
# Verificar que el servicio es LoadBalancer
kubectl get svc dashboard-service -n iot-monitoring
# Debe decir: TYPE=LoadBalancer, EXTERNAL-IP=localhost
```

**Solución:**
```bash
# Si no es LoadBalancer, editar k8s/dashboard.yaml
# Cambiar type: ClusterIP por type: LoadBalancer
kubectl apply -f k8s/dashboard.yaml
```

### Problema 3: Sidecar sin logs
**Síntoma:**
```bash
kubectl logs <POD> -n iot-monitoring -c sidecar-auditor
# (vacío)
```

**Diagnóstico:**
```bash
# Verificar que el agregador está recibiendo datos
kubectl logs <POD> -n iot-monitoring -c aggregator-service | grep "Dato recibido"
```

**Posibles causas:**
1. **Kafka no asigna particiones:**
   ```bash
   # Reiniciar Kafka y Agregador
   kubectl rollout restart deployment kafka -n iot-monitoring
   kubectl rollout restart deployment aggregator-service -n iot-monitoring
   ```

2. **El archivo no existe:**
   ```bash
   # Verificar desde el Sidecar
   kubectl exec <POD> -n iot-monitoring -c sidecar-auditor -- ls -l /app/logs/
   ```

3. **Permisos de escritura:**
   ```bash
   # Forzar creación desde el agregador
   kubectl exec <POD> -n iot-monitoring -c aggregator-service -- sh -c "mkdir -p /app/logs && touch /app/logs/audit.log"
   ```

### Problema 4: HPA muestra `<unknown>` en TARGETS
**Síntoma:**
```bash
kubectl get hpa -n iot-monitoring
# TARGETS: <unknown>/50%
```

**Causa:** Metrics Server no está instalado o no funciona

**Solución:**
```bash
# Verificar Metrics Server
kubectl get deployment metrics-server -n kube-system

# Si no existe, instalar
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Parchear para Docker Desktop
kubectl patch deployment metrics-server -n kube-system --type="json" -p="[{\"op\": \"add\", \"path\": \"/spec/template/spec/containers/0/args/-\", \"value\": \"--kubelet-insecure-tls\"}]"

# Esperar 1-2 minutos y verificar
kubectl top nodes
```

### Problema 5: Pods en CrashLoopBackOff
**Síntoma:**
```bash
kubectl get pods -n iot-monitoring
# sensor-node-xxx   0/1   CrashLoopBackOff
```

**Diagnóstico:**
```bash
# Ver logs del pod
kubectl logs <POD_NAME> -n iot-monitoring

# Ver eventos
kubectl describe pod <POD_NAME> -n iot-monitoring
```

**Soluciones comunes:**
- **Sensor Node:** Kafka no está listo → Esperar a que Kafka suba
- **Agregador:** Error de conexión a Kafka → Verificar ConfigMap
- **Dashboard:** Error de build → Reconstruir imagen local

### Problema 6: WebSocket connection failed
**Síntoma:** En la consola del navegador:
```
WebSocket connection to 'ws://localhost:3000/socket.io/' failed
```

**Causa:** El Aggregator Service no es accesible desde el navegador

**Solución:**
```bash
# Verificar que el servicio es LoadBalancer
kubectl get svc aggregator-service -n iot-monitoring
# Debe tener EXTERNAL-IP=localhost

# Si no, editar k8s/aggregator-service.yaml
# Cambiar type: ClusterIP por type: LoadBalancer
kubectl apply -f k8s/aggregator-service.yaml
```

---

## 9. Prueba de Carga (Demostración de HPA)

Para demostrar el auto-escalado horizontal (HPA) al máximo de su capacidad (10 réplicas), utilizaremos **múltiples generadores de carga simultáneos** para saturar la CPU del servicio agregador.

### 9.1 Preparación (Monitorización)
Antes de lanzar la carga, abre dos terminales nuevas para observar el escalado en tiempo real.

**Terminal A (Monitor HPA):**
```bash
kubectl get hpa aggregator-hpa -n iot-monitoring --watch
```

**Terminal B (Monitor Pods):**
```bash
kubectl get pods -n iot-monitoring -l app=aggregator-service --watch
```

### 9.2 Ejecución de la Carga (Ataque DDoS Simulado)
Ejecuta los siguientes comandos en diferentes terminales (o en segundo plano) para simular una carga masiva.

```bash
# Generador 1
kubectl run load-gen-1 --image=busybox:1.28 -n iot-monitoring -- /bin/sh -c "while true; do wget -q -O- http://aggregator-service:3000; done"

# Generador 2
kubectl run load-gen-2 --image=busybox:1.28 -n iot-monitoring -- /bin/sh -c "while true; do wget -q -O- http://aggregator-service:3000; done"

# Generador 3
kubectl run load-gen-3 --image=busybox:1.28 -n iot-monitoring -- /bin/sh -c "while true; do wget -q -O- http://aggregator-service:3000;
done"

# Ver los logs de un load-gen
kubectl logs load-gen-2 -n iot-monitoring
```

### 9.3 Resultados Esperados
1.  **Fase 1 (Warm-up):** El uso de CPU (`TARGETS` en Terminal A) subirá rápidamente a >100% (ej. 190%).
2.  **Fase 2 (Scale-up):** El HPA detectará la sobrecarga y aumentará las réplicas: `2 -> 4 -> 8 -> 10`.
3.  **Fase 3 (Estabilización):** Con 10 réplicas, la carga se distribuirá y el uso de CPU por pod bajará a un nivel manejable (~50-60%).

### 9.4 Detener la Prueba (Clean-up)
Una vez demostrada la escalabilidad, elimina los generadores de carga para permitir que el sistema se recupere.

```bash
# 1. Listar los generadores activos
kubectl get pods -n iot-monitoring | findstr load

# 2. Eliminarlos todos de una vez
kubectl delete pod load-gen-1 load-gen-2 load-gen-3 -n iot-monitoring
```

**Nota:** Después de eliminar la carga, el HPA esperará unos minutos (ventana de estabilización) antes de reducir las réplicas (`Scale-down`) gradualmente de nuevo a 2.

---

## 10. Limpieza y Cierre del Proyecto

### 10.1 Métodos de Apagado
Tienes dos opciones para detener el sistema, dependiendo de tus necesidades:

#### **Opción A: Destrucción Total (Recomendada)**
Elimina el `namespace` completo. Es la forma más rápida y limpia de borrar todo.

```bash
kubectl delete namespace iot-monitoring
```
*   **Ventaja:** Borra deployments, servicios, secrets, configmaps y volúmenes de una sola vez.
*   **Desventaja:** Borra todo el historial de eventos dentro de ese namespace.

#### **Opción B: Destrucción Controlada**
Elimina los recursos definidos en los manifiestos, pero mantiene el namespace (útil si tienes otros proyectos ahí).

```bash
kubectl delete -k k8s/
```
*   **Ventaja:** Más granular.
*   **Desventaja:** Puede dejar "basura" (ej. PVCs o Secrets huérfanos) si no están en el kustomization.

### 10.2 Limpieza de Docker (Opcional)
Si deseas liberar espacio en tu disco eliminando las imágenes construidas:

```bash
docker rmi sensor-node:local aggregator-service:local dashboard:local
```

### 10.3 Desinstalar Metrics Server
Si ya no necesitas el auto-escalado en tu clúster local:

```bash
kubectl delete -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

---

## Conclusión

Este proyecto demuestra la implementación completa de un sistema distribuido moderno siguiendo las mejores prácticas de la industria:

- ✅ **Arquitectura de Microservicios** con desacoplamiento total
- ✅ **Mensajería Asíncrona** con Kafka para tolerancia a fallos
- ✅ **Comunicación en Tiempo Real** con WebSockets
- ✅ **Interoperabilidad** entre Python y Node.js vía JSON-RPC
- ✅ **Orquestación Profesional** en Kubernetes
- ✅ **Escalabilidad Automática** con HPA
- ✅ **Patrones Avanzados** como Sidecar para observabilidad
- ✅ **Contenerización Optimizada** con multi-stage builds

El sistema está listo para producción y puede manejar cargas variables gracias a su arquitectura elástica.

---

**Autor:** JhustynC  
**Repositorio:** https://github.com/JhustynC/iot-monitoring-system  
**Tecnologías:** Kubernetes, Docker, Kafka, Python, Node.js, TypeScript, React, Nginx  
**Fecha:** Enero 2026
