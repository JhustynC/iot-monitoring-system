# IoT Monitoring System - Sistema de Monitoreo IoT Distribuido

Sistema distribuido de monitoreo IoT que simula sensores de temperatura, procesa datos mediante Kafka, y visualiza información en tiempo real a través de un dashboard web interactivo.

## Tabla de Contenidos

- [Descripción](#descripción)
- [Arquitectura](#arquitectura)
- [Tecnologías](#tecnologías)
- [Requisitos](#requisitos)
- [Instalación y Ejecución](#instalación-y-ejecución)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Servicios y Puertos](#servicios-y-puertos)
- [Características del Dashboard](#características-del-dashboard)
- [API y Endpoints](#api-y-endpoints)
- [Flujo de Datos](#flujo-de-datos)
- [Comunicación RPC](#comunicación-rpc)
- [Solución de Problemas](#solución-de-problemas)
- [Explicación Académica](#explicación-académica)

---

## Descripción

Este proyecto implementa un sistema distribuido de monitoreo IoT que demuestra conceptos clave de sistemas distribuidos:

- **Concurrencia**: Múltiples sensores simulados usando threads en Python
- **Comunicación asíncrona**: Kafka como middleware de mensajería
- **Comunicación RPC**: JSON-RPC para consultas directas entre servicios
- **Tiempo real**: WebSocket para actualización en vivo del dashboard
- **Multi-lenguaje**: Python y TypeScript trabajando juntos

El sistema simula sensores de temperatura que envían datos periódicamente a Kafka, un servicio agregador consume estos datos y los transmite a un dashboard React que muestra visualizaciones en tiempo real.

---

## Arquitectura

```
              ┌───────────────────────────────┐
              │      NODOS SENSOR (Python)    │
              │ ───────────────────────────── │
              │  - Usa hilos (threading)      │
              │  - Simula 3 sensores          │
              │  - Envía datos a KAFKA        │
              │  - Expone JSON-RPC Server     │
              │    en puerto 5000             │
              └─────────────┬─────────────────┘
                            │
                 (Mensajes JSON de sensores)
                 Topic: sensor-data
                            │
                     ┌──────▼──────┐
                     │   KAFKA     │
                     │   Broker    │
                     │  (KRaft)    │
                     └──────┬──────┘
                            │
               ┌────────────▼────────────────┐
               │   AGGREGATOR (Node + TS)    │
               │ ─────────────────────────   │
               │ - Consume datos de Kafka    │
               │ - Hace llamadas RPC a nodos │
               │ - Procesa y agrega datos    │
               │ - Expone API REST (3000)    │
               │ - WebSocket (Socket.IO)     │
               └─────────────┬───────────────┘
                             │
                  ┌──────────▼──────────┐
                  │   DASHBOARD (React) │
                  │ ─────────────────── │
                  │ - Visualización     │
                  │ - Gráficas tiempo   │
                  │   real              │
                  │ - Estadísticas      │
                  │ - Filtros por sensor│
                  └─────────────────────┘
```

---

## Tecnologías

### Backend

| Tecnología | Versión | Rol | Justificación |
|------------|---------|-----|---------------|
| **Python** | 3.11 | Simuladores IoT | Lenguaje ideal para hilos y simulaciones |
| **kafka-python** | 2.2.15 | Cliente Kafka | Biblioteca estable para Python |
| **jsonrpcserver** | 5.0.9 | Servidor RPC | Implementación JSON-RPC 2.0 |
| **Node.js** | 20 | Runtime | Alto rendimiento y ecosistema |
| **TypeScript** | 5.9.3 | Lenguaje | Tipado estático y mejor mantenibilidad |
| **Express** | 5.1.0 | Framework HTTP | API REST y servidor HTTP |
| **Socket.IO** | 4.8.1 | WebSocket | Comunicación bidireccional en tiempo real |
| **KafkaJS** | 2.2.4 | Cliente Kafka | Cliente oficial para Node.js |

### Frontend

| Tecnología | Versión | Rol | Justificación |
|------------|---------|-----|---------------|
| **React** | 18.2.0 | Framework UI | Componentes reactivos y eficientes |
| **Vite** | 5.0.0 | Build Tool | Desarrollo rápido y HMR |
| **Recharts** | 2.10.3 | Gráficas | Visualizaciones interactivas |
| **Socket.IO Client** | 4.8.1 | WebSocket Client | Conexión en tiempo real |

### Infraestructura

| Tecnología | Versión | Rol |
|------------|---------|-----|
| **Docker** | - | Contenedores |
| **Docker Compose** | - | Orquestación |
| **Kafka** | 8.0.0 (KRaft) | Message Broker |
| **Kafka UI** | Latest | Interfaz de administración |

---

## Requisitos

### Software Necesario

- **Docker** 20.10 o superior
- **Docker Compose** 2.0 o superior
- **Git** (opcional, para clonar el repositorio)

### Recursos del Sistema

- **RAM**: Mínimo 4GB (recomendado 8GB)
- **CPU**: Mínimo 2 cores
- **Disco**: Mínimo 5GB libres

---

## Instalación y Ejecución

### Opción 1: Docker Compose (Recomendado)

1. **Clonar el repositorio** (si aplica):
```bash
git clone <repository-url>
cd iot-monitoring-system
```

2. **Construir y levantar todos los servicios**:
```bash
docker-compose up --build
```

3. **Ejecutar en segundo plano**:
```bash
docker-compose up -d --build
```

4. **Ver los logs**:
```bash
# Todos los servicios
docker-compose logs -f

# Servicio específico
docker-compose logs -f sensor-node
docker-compose logs -f aggregator-service
docker-compose logs -f dashboard
```

5. **Detener los servicios**:
```bash
# Detener sin eliminar volúmenes
docker-compose down

# Detener y eliminar volúmenes (incluye datos de Kafka)
docker-compose down -v
```

### Opción 2: Desarrollo Local (Sin Docker)

#### Sensor Node (Python)

```bash
cd sensor-node
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python sensor_node.py
```

#### Aggregator Service (Node.js)

```bash
cd aggregator-service
npm install
npm run dev  # Requiere ts-node o tsx configurado
```

#### Dashboard (React)

```bash
cd dashboard
npm install
npm run dev
```

**Nota**: Para desarrollo local, asegúrate de tener Kafka corriendo y actualiza las URLs de conexión en los archivos de configuración.

---

## Estructura del Proyecto

```
iot-monitoring-system/
│
├── docker-compose.yml          # Configuración de todos los servicios
├── README.md                    # Este archivo
├── INSTRUCCIONES_DOCKER.md     # Guía detallada de Docker
├── .gitignore                   # Archivos ignorados por Git
│
├── sensor-node/                 # Servicio Python - Simulador de sensores
│   ├── Dockerfile              # Imagen Docker para sensor-node
│   ├── .dockerignore           # Archivos excluidos del build
│   ├── sensor_node.py          # Código principal del sensor
│   ├── requirements.txt        # Dependencias Python
│   └── README.md               # Documentación del sensor
│
├── aggregator-service/          # Servicio Node.js/TypeScript - Agregador
│   ├── Dockerfile              # Imagen Docker para aggregator
│   ├── .dockerignore           # Archivos excluidos del build
│   ├── package.json            # Dependencias Node.js
│   ├── tsconfig.json           # Configuración TypeScript
│   └── src/
│       └── index.ts             # Código principal del agregador
│
└── dashboard/                   # Frontend React - Dashboard
    ├── Dockerfile              # Imagen Docker para dashboard
    ├── package.json            # Dependencias React
    ├── vite.config.js          # Configuración Vite
    ├── index.html              # HTML principal
    └── src/
        ├── main.jsx            # Punto de entrada React
        └── App.jsx             # Componente principal del dashboard
```

---

## Servicios y Puertos

Una vez que todos los servicios estén corriendo, tendrás acceso a:

| Servicio | URL | Puerto | Descripción |
|----------|-----|--------|-------------|
| **Dashboard** | http://localhost:5173 | 5173 | Interfaz web principal |
| **Kafka UI** | http://localhost:8080 | 8080 | Interfaz de administración de Kafka |
| **Aggregator API** | http://localhost:3000 | 3000 | API REST y WebSocket |
| **Sensor Node RPC** | http://localhost:5000 | 5000 | Servidor JSON-RPC |
| **Kafka Broker** | localhost:9092 | 9092 | Puerto interno Kafka |
| **Kafka External** | localhost:9094 | 9094 | Puerto externo Kafka |

---

## Características del Dashboard

El dashboard incluye las siguientes funcionalidades:

### Visualizaciones

1. **Gráfica de Línea en Tiempo Real**
   - Muestra la temperatura a lo largo del tiempo
   - Actualización automática con cada nuevo dato
   - Área sombreada bajo la curva
   - Tooltips interactivos

2. **Gráfica de Barras - Estadísticas por Sensor**
   - Temperatura promedio por sensor
   - Cantidad de mensajes enviados
   - Comparación visual entre sensores

3. **Tarjetas de Estadísticas**
   - Temperatura promedio
   - Temperatura máxima
   - Temperatura mínima
   - Número de sensores activos

4. **Tabla de Datos**
   - Últimos 20 registros recibidos
   - Colores según temperatura:
     - 🔵 Azul: < 23°C
     - 🟢 Verde: 23-27°C
     - 🔴 Rojo: > 27°C
   - Información de fecha y hora

### Funcionalidades

- **Filtro por Sensor**: Selecciona un sensor específico o todos
- **Actualización en Tiempo Real**: Datos nuevos aparecen automáticamente
- **Indicador de Estado**: Muestra el estado de conexión con el servidor
- **Diseño Responsive**: Se adapta a diferentes tamaños de pantalla
- **Logs en Consola**: Información de debug en la consola del navegador

---

## API y Endpoints

### Aggregator Service (Puerto 3000)

#### WebSocket (Socket.IO)

**Conexión**:
```javascript
const socket = io('http://localhost:3000');
```

**Eventos Escuchados**:
- `sensor-update`: Recibe datos de sensores en tiempo real
  ```javascript
  socket.on('sensor-update', (data) => {
    console.log(data);
    // {
    //   sensor_id: "sensor_0",
    //   type: "temperature",
    //   value: 25.5,
    //   timestamp: 1234567890.123
    // }
  });
  ```

**Eventos de Conexión**:
- `connect`: Conexión establecida
- `disconnect`: Desconexión
- `connect_error`: Error de conexión

### Sensor Node RPC (Puerto 5000)

**Endpoint**: `http://localhost:5000`

**Método RPC**: `get_status`

**Ejemplo de Llamada**:
```bash
curl -X POST http://localhost:5000 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "get_status",
    "id": 1
  }'
```

**Respuesta**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "messages_sent": 150
  },
  "id": 1
}
```

---

## Flujo de Datos

### 1. Generación de Datos

El `sensor-node` ejecuta 3 threads, cada uno simulando un sensor:

```python
# Cada sensor genera datos cada 1-3 segundos
{
  "sensor_id": "sensor_0",
  "type": "temperature",
  "value": 25.5,  # Entre 20-30°C
  "timestamp": 1234567890.123
}
```

### 2. Publicación en Kafka

Los datos se envían al topic `sensor-data` en Kafka:

```python
producer.send('sensor-data', value=data)
```

### 3. Consumo y Procesamiento

El `aggregator-service`:
- Se suscribe al topic `sensor-data`
- Consume mensajes de Kafka
- Procesa cada mensaje
- Emite eventos WebSocket al dashboard

### 4. Visualización

El dashboard:
- Escucha eventos `sensor-update` vía WebSocket
- Actualiza gráficas y estadísticas en tiempo real
- Muestra los últimos datos en una tabla

### 5. Consultas RPC (Opcional)

Cada 10 segundos, el aggregator hace una llamada RPC al sensor-node para obtener estadísticas:

```typescript
// Consulta estado del sensor
const response = await axios.post('http://sensor-node:5000', {
  jsonrpc: "2.0",
  method: "get_status",
  id: 1
});
```

---

## Comunicación RPC

El sistema implementa JSON-RPC 2.0 para comunicación directa entre servicios.

### Métodos Disponibles

#### `get_status`

Obtiene el estado actual del nodo sensor.

**Parámetros**: Ninguno

**Respuesta**:
```json
{
  "messages_sent": 150
}
```

### Ejemplo de Implementación

**Cliente (TypeScript)**:
```typescript
const response = await axios.post('http://sensor-node:5000', {
  jsonrpc: "2.0",
  method: "get_status",
  id: 1
});
console.log(response.data.result);
```

**Servidor (Python)**:
```python
@method
def get_status():
    return Success({"messages_sent": sensor_status["messages_sent"]})
```

---

## Solución de Problemas

### Los servicios se apagan inmediatamente

**Causa**: Kafka no está listo cuando los servicios intentan conectarse.

**Solución**: 
- Los servicios tienen reintentos automáticos
- Verifica que Kafka esté saludable: `docker-compose ps`
- Revisa los logs: `docker-compose logs kafka`

### El dashboard no muestra datos

**Verificaciones**:
1. Estado de conexión en el dashboard (debe decir "Conectado")
2. Logs del aggregator-service: `docker-compose logs aggregator-service`
3. Logs del sensor-node: `docker-compose logs sensor-node`
4. Consola del navegador (F12) para errores

**Soluciones**:
```bash
# Reiniciar servicios específicos
docker-compose restart aggregator-service
docker-compose restart sensor-node

# Reconstruir un servicio
docker-compose up --build dashboard
```

### Error de versión de API de Kafka

**Causa**: Incompatibilidad de versión entre cliente y servidor.

**Solución**: Ya está resuelto - el código detecta automáticamente la versión del broker.

### Puerto ya en uso

**Solución**:
```bash
# Ver qué proceso usa el puerto (ejemplo puerto 3000)
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000

# Cambiar el puerto en docker-compose.yml si es necesario
```

### Kafka UI no muestra datos

**Verificaciones**:
1. Kafka está corriendo: `docker-compose ps kafka`
2. El topic `sensor-data` existe
3. Los mensajes están llegando (ver logs del sensor-node)

---

### Patrones de Diseño Utilizados

1. **Pub/Sub (Publicador/Suscriptor)**: Kafka implementa este patrón
2. **Producer-Consumer**: Sensores producen, agregador consume
3. **RPC (Remote Procedure Call)**: Comunicación directa entre servicios
4. **Observer**: Dashboard observa cambios vía WebSocket
5. **Singleton**: Instancias únicas de servicios en contenedores

---

## Variables de Entorno

### Sensor Node

| Variable | Valor por Defecto | Descripción |
|----------|-------------------|-------------|
| `KAFKA_BROKER` | `localhost:9092` | Dirección del broker Kafka |
| `TOPIC_NAME` | `sensor-data` | Nombre del topic |
| `RPC_PORT` | `5000` | Puerto del servidor RPC |
| `RPC_HOST` | `0.0.0.0` | Host del servidor RPC |

### Aggregator Service

| Variable | Valor por Defecto | Descripción |
|----------|-------------------|-------------|
| `KAFKA_BROKER` | `localhost:9092` | Dirección del broker Kafka |
| `TOPIC_NAME` | `sensor-data` | Nombre del topic |
| `PORT` | `3000` | Puerto del servidor HTTP |
| `SENSOR_NODE_RPC` | `http://sensor-node:5000` | URL del servidor RPC |

### Dashboard

| Variable | Valor por Defecto | Descripción |
|----------|-------------------|-------------|
| `VITE_API_URL` | `http://localhost:3000` | URL del aggregator service |

---

## Comandos Útiles

### Docker Compose

```bash
# Ver estado de contenedores
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f

# Reiniciar un servicio
docker-compose restart [servicio]

# Reconstruir un servicio
docker-compose up --build [servicio]

# Detener todo
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v

# Ver uso de recursos
docker stats

# Entrar a un contenedor
docker-compose exec [servicio] sh
```

### Desarrollo

```bash
# Instalar dependencias Python
cd sensor-node
pip install -r requirements.txt

# Instalar dependencias Node.js
cd aggregator-service
npm install

cd dashboard
npm install

# Ejecutar en modo desarrollo
npm run dev
```
