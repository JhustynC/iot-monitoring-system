# Instrucciones para ejecutar el sistema con Docker Compose

## Requisitos previos

- Docker instalado
- Docker Compose instalado

## Pasos para ejecutar

### 1. Construir y levantar todos los servicios

Desde la raíz del proyecto, ejecuta:

```bash
docker-compose up --build
```

Este comando:
- Construirá las imágenes de todos los servicios (sensor-node, aggregator-service, dashboard)
- Levantará todos los contenedores
- Conectará todos los servicios en la red `kafka-network`

### 2. Ejecutar en segundo plano

Si prefieres ejecutar los servicios en segundo plano:

```bash
docker-compose up -d --build
```

### 3. Ver los logs

Para ver los logs de todos los servicios:

```bash
docker-compose logs -f
```

Para ver los logs de un servicio específico:

```bash
docker-compose logs -f sensor-node
docker-compose logs -f aggregator-service
docker-compose logs -f dashboard
```

### 4. Detener los servicios

Para detener todos los servicios:

```bash
docker-compose down
```

Para detener y eliminar los volúmenes (incluyendo datos de Kafka):

```bash
docker-compose down -v
```

## Servicios disponibles

Una vez que todo esté ejecutándose, tendrás acceso a:

- **Dashboard**: http://localhost:5173
- **Kafka UI**: http://localhost:8080
- **Aggregator Service API**: http://localhost:3000
- **Sensor Node RPC**: http://localhost:5000

## Estructura de servicios

1. **Kafka**: Broker de mensajería (puertos 9092, 9094)
2. **Kafka UI**: Interfaz web para monitorear Kafka (puerto 8080)
3. **Sensor Node**: Simula sensores IoT y envía datos a Kafka (puerto 5000 para RPC)
4. **Aggregator Service**: Consume datos de Kafka y expone API/WebSocket (puerto 3000)
5. **Dashboard**: Interfaz React que muestra los datos en tiempo real (puerto 5173)

## Solución de problemas

### Si un servicio no inicia

1. Verifica los logs: `docker-compose logs [nombre-servicio]`
2. Asegúrate de que los puertos no estén en uso
3. Verifica que Docker tenga suficientes recursos asignados

### Si Kafka no inicia correctamente

Kafka puede tardar unos segundos en estar listo. El aggregator-service y sensor-node esperan automáticamente, pero si hay problemas:

```bash
docker-compose restart kafka
```

### Reconstruir un servicio específico

```bash
docker-compose build [nombre-servicio]
docker-compose up -d [nombre-servicio]
```

## Comandos útiles

- Ver estado de los contenedores: `docker-compose ps`
- Entrar a un contenedor: `docker-compose exec [nombre-servicio] sh`
- Ver uso de recursos: `docker stats`

