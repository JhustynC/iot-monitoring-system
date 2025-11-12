import { useState, useEffect, useMemo } from 'react'
import { io } from 'socket.io-client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar
} from 'recharts'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function App() {
  const [sensorData, setSensorData] = useState([])
  const [status, setStatus] = useState('Conectando...')
  const [error, setError] = useState(null)
  const [connectionInfo, setConnectionInfo] = useState('')
  const [selectedSensor, setSelectedSensor] = useState('all')

  useEffect(() => {
    console.log('Inicializando conexión Socket.IO a:', API_URL)
    setConnectionInfo(`Conectando a: ${API_URL}`)
    
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })

    socket.on('connect', () => {
      setStatus('Conectado')
      setError(null)
      setConnectionInfo(`Conectado a: ${API_URL} (ID: ${socket.id})`)
      console.log('✅ Conectado al servidor Socket.IO, ID:', socket.id)
    })

    socket.on('disconnect', (reason) => {
      setStatus('Desconectado')
      setConnectionInfo(`Desconectado: ${reason}`)
      console.log('❌ Desconectado del servidor:', reason)
    })

    socket.on('connect_error', (err) => {
      setStatus('Error de conexión')
      setError(`Error: ${err.message}`)
      setConnectionInfo(`Error conectando a: ${API_URL}`)
      console.error('❌ Error de conexión:', err)
    })

    socket.on('sensor-update', (data) => {
      console.log('📊 Dato recibido:', data)
      setSensorData(prev => {
        const newData = [{
          ...data,
          time: new Date(data.timestamp * 1000).toLocaleTimeString(),
          date: new Date(data.timestamp * 1000)
        }, ...prev.slice(0, 99)] // Mantener últimos 100
        return newData
      })
    })

    return () => {
      console.log('Desconectando socket...')
      socket.disconnect()
    }
  }, [])

  // Procesar datos para gráficas
  const chartData = useMemo(() => {
    const filtered = selectedSensor === 'all' 
      ? sensorData 
      : sensorData.filter(d => d.sensor_id === selectedSensor)
    
    return filtered.slice().reverse() // Revertir para mostrar cronológicamente
  }, [sensorData, selectedSensor])

  // Estadísticas
  const stats = useMemo(() => {
    if (sensorData.length === 0) return null
    
    const values = sensorData.map(d => d.value)
    const uniqueSensors = [...new Set(sensorData.map(d => d.sensor_id))]
    
    return {
      total: sensorData.length,
      sensors: uniqueSensors.length,
      avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
      min: Math.min(...values).toFixed(2),
      max: Math.max(...values).toFixed(2),
      latest: sensorData[0]?.value?.toFixed(2) || 'N/A'
    }
  }, [sensorData])

  // Datos por sensor para gráfica de barras
  const sensorStats = useMemo(() => {
    const sensors = {}
    sensorData.forEach(d => {
      if (!sensors[d.sensor_id]) {
        sensors[d.sensor_id] = { count: 0, total: 0, name: d.sensor_id }
      }
      sensors[d.sensor_id].count++
      sensors[d.sensor_id].total += d.value
    })
    
    return Object.values(sensors).map(s => ({
      name: s.name,
      promedio: (s.total / s.count).toFixed(2),
      mensajes: s.count
    }))
  }, [sensorData])

  const uniqueSensors = useMemo(() => {
    return [...new Set(sensorData.map(d => d.sensor_id))]
  }, [sensorData])

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f7fa',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '10px',
          marginBottom: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>IoT Monitoring Dashboard</h1>
          
          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{
              padding: '10px 15px',
              backgroundColor: status === 'Conectado' ? '#d4edda' : status === 'Error de conexión' ? '#f8d7da' : '#fff3cd',
              borderRadius: '5px',
              border: `1px solid ${status === 'Conectado' ? '#c3e6cb' : status === 'Error de conexión' ? '#f5c6cb' : '#ffeaa7'}`
            }}>
              <strong>Estado:</strong> <span style={{ 
                color: status === 'Conectado' ? 'green' : status === 'Error de conexión' ? 'red' : 'orange',
                fontWeight: 'bold'
              }}>{status}</span>
            </div>
            
            {stats && (
              <>
                <div><strong>Total datos:</strong> {stats.total}</div>
                <div><strong>Sensores:</strong> {stats.sensors}</div>
                <div><strong>Última lectura:</strong> {stats.latest}°C</div>
              </>
            )}
          </div>
          
          {error && (
            <div style={{ marginTop: '10px', color: 'red', padding: '10px', backgroundColor: '#f8d7da', borderRadius: '5px' }}>
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Estadísticas */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#3498db' }}>{stats.avg}°C</div>
              <div style={{ color: '#7f8c8d', marginTop: '5px' }}>Temperatura Promedio</div>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#e74c3c' }}>{stats.max}°C</div>
              <div style={{ color: '#7f8c8d', marginTop: '5px' }}>Temperatura Máxima</div>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#3498db' }}>{stats.min}°C</div>
              <div style={{ color: '#7f8c8d', marginTop: '5px' }}>Temperatura Mínima</div>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '10px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#27ae60' }}>{stats.sensors}</div>
              <div style={{ color: '#7f8c8d', marginTop: '5px' }}>Sensores Activos</div>
            </div>
          </div>
        )}

        {/* Selector de sensor */}
        {uniqueSensors.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            padding: '15px',
            borderRadius: '10px',
            marginBottom: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <label style={{ marginRight: '10px', fontWeight: 'bold' }}>Filtrar por sensor:</label>
            <select 
              value={selectedSensor} 
              onChange={(e) => setSelectedSensor(e.target.value)}
              style={{
                padding: '8px 15px',
                borderRadius: '5px',
                border: '1px solid #ddd',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="all">Todos los sensores</option>
              {uniqueSensors.map(sensor => (
                <option key={sensor} value={sensor}>{sensor}</option>
              ))}
            </select>
          </div>
        )}

        {/* Gráfica de línea - Temperatura en tiempo real */}
        {chartData.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '10px',
            marginBottom: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, color: '#2c3e50' }}>Temperatura en Tiempo Real</h2>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3498db" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3498db" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="time" 
                  stroke="#7f8c8d"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  label={{ value: 'Temperatura (°C)', angle: -90, position: 'insideLeft' }}
                  stroke="#7f8c8d"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                  formatter={(value, name) => [`${value}°C`, 'Temperatura']}
                  labelFormatter={(label) => `Hora: ${label}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3498db" 
                  fillOpacity={1} 
                  fill="url(#colorTemp)"
                  name="Temperatura"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gráfica de barras - Estadísticas por sensor */}
        {sensorStats.length > 0 && (
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '10px',
            marginBottom: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, color: '#2c3e50' }}>Estadísticas por Sensor</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sensorStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" stroke="#7f8c8d" />
                <YAxis stroke="#7f8c8d" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #ddd',
                    borderRadius: '5px'
                  }}
                />
                <Legend />
                <Bar dataKey="promedio" fill="#3498db" name="Temperatura Promedio (°C)" />
                <Bar dataKey="mensajes" fill="#27ae60" name="Mensajes Enviados" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tabla de últimos datos */}
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginTop: 0, color: '#2c3e50' }}>Últimos Datos Recibidos</h2>
          {sensorData.length === 0 ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#7f8c8d',
              border: '2px dashed #ddd',
              borderRadius: '5px'
            }}>
              <p style={{ fontSize: '1.2em' }}>Esperando datos de sensores...</p>
              <p style={{ marginTop: '10px' }}>
                {status !== 'Conectado' && 'Asegúrate de que el aggregator-service esté corriendo en el puerto 3000'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#495057' }}>Sensor ID</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#495057' }}>Tipo</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#495057' }}>Temperatura</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', color: '#495057' }}>Fecha/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {sensorData.slice(0, 20).map((data, index) => (
                    <tr 
                      key={index}
                      style={{ 
                        borderBottom: '1px solid #dee2e6',
                        backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa'
                      }}
                    >
                      <td style={{ padding: '12px', fontWeight: '500' }}>{data.sensor_id}</td>
                      <td style={{ padding: '12px' }}>{data.type}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          fontSize: '1.1em', 
                          fontWeight: 'bold', 
                          color: data.value > 27 ? '#e74c3c' : data.value < 23 ? '#3498db' : '#27ae60'
                        }}>
                          {data.value}°C
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: '#7f8c8d' }}>
                        {new Date(data.timestamp * 1000).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
