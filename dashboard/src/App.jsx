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

  // Estilos neumórficos
  const neumorphicRaised = {
    background: '#E0E5EC',
    borderRadius: '20px',
    boxShadow: '8px 8px 16px #A3B1C6, -8px -8px 16px #FFFFFF',
    padding: '25px',
    transition: 'all 0.3s ease'
  }

  const neumorphicPressed = {
    background: '#E0E5EC',
    borderRadius: '20px',
    boxShadow: 'inset 8px 8px 16px #A3B1C6, inset -8px -8px 16px #FFFFFF',
    padding: '25px'
  }

  const neumorphicCard = {
    background: '#E0E5EC',
    borderRadius: '20px',
    boxShadow: '6px 6px 12px #A3B1C6, -6px -6px 12px #FFFFFF',
    padding: '20px',
    transition: 'all 0.3s ease'
  }

  const neumorphicButton = {
    background: '#E0E5EC',
    borderRadius: '15px',
    boxShadow: '4px 4px 8px #A3B1C6, -4px -4px 8px #FFFFFF',
    border: 'none',
    padding: '12px 20px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: 'inherit',
    fontSize: '14px',
    color: '#4A5568'
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #E0E5EC 0%, #D1D9E6 100%)',
      padding: '30px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          ...neumorphicRaised,
          marginBottom: '30px'
        }}>
          <h1 style={{ 
            margin: '0 0 20px 0', 
            color: '#2D3748',
            fontSize: '2.5em',
            fontWeight: '700',
            letterSpacing: '-0.5px',
            textShadow: '2px 2px 4px rgba(163, 177, 198, 0.3)'
          }}>
            IoT Monitoring Dashboard
          </h1>
          
          <div style={{ 
            display: 'flex', 
            gap: '20px', 
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{
              ...neumorphicCard,
              padding: '12px 20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: status === 'Conectado' 
                  ? 'linear-gradient(135deg, #48BB78 0%, #38A169 100%)'
                  : status === 'Error de conexión'
                  ? 'linear-gradient(135deg, #F56565 0%, #E53E3E 100%)'
                  : 'linear-gradient(135deg, #ED8936 0%, #DD6B20 100%)',
                boxShadow: status === 'Conectado'
                  ? '0 0 10px rgba(72, 187, 120, 0.5)'
                  : status === 'Error de conexión'
                  ? '0 0 10px rgba(245, 101, 101, 0.5)'
                  : '0 0 10px rgba(237, 137, 54, 0.5)'
              }}></div>
              <strong style={{ color: '#4A5568' }}>Estado:</strong> 
              <span style={{ 
                color: status === 'Conectado' ? '#38A169' : status === 'Error de conexión' ? '#E53E3E' : '#DD6B20',
                fontWeight: '600'
              }}>{status}</span>
            </div>
            
            {stats && (
              <>
                <div style={{ color: '#718096', fontWeight: '500' }}>
                  <strong style={{ color: '#4A5568' }}>Total datos:</strong> {stats.total}
                </div>
                <div style={{ color: '#718096', fontWeight: '500' }}>
                  <strong style={{ color: '#4A5568' }}>Sensores:</strong> {stats.sensors}
                </div>
                <div style={{ color: '#718096', fontWeight: '500' }}>
                  <strong style={{ color: '#4A5568' }}>Última lectura:</strong> {stats.latest}°C
                </div>
              </>
            )}
          </div>
          
          {error && (
            <div style={{ 
              marginTop: '15px', 
              color: '#E53E3E', 
              padding: '15px', 
              ...neumorphicPressed,
              borderLeft: '4px solid #E53E3E'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>

        {/* Estadísticas */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '25px',
            marginBottom: '30px'
          }}>
            <div style={{
              ...neumorphicCard,
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ 
                fontSize: '2.8em', 
                fontWeight: '700', 
                color: '#4299E1',
                textShadow: '2px 2px 4px rgba(163, 177, 198, 0.2)',
                marginBottom: '8px'
              }}>
                {stats.avg}°C
              </div>
              <div style={{ 
                color: '#718096', 
                fontSize: '0.95em',
                fontWeight: '500',
                letterSpacing: '0.5px'
              }}>
                Temperatura Promedio
              </div>
            </div>
            
            <div style={{
              ...neumorphicCard,
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ 
                fontSize: '2.8em', 
                fontWeight: '700', 
                color: '#F56565',
                textShadow: '2px 2px 4px rgba(163, 177, 198, 0.2)',
                marginBottom: '8px'
              }}>
                {stats.max}°C
              </div>
              <div style={{ 
                color: '#718096', 
                fontSize: '0.95em',
                fontWeight: '500',
                letterSpacing: '0.5px'
              }}>
                Temperatura Máxima
              </div>
            </div>
            
            <div style={{
              ...neumorphicCard,
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ 
                fontSize: '2.8em', 
                fontWeight: '700', 
                color: '#4299E1',
                textShadow: '2px 2px 4px rgba(163, 177, 198, 0.2)',
                marginBottom: '8px'
              }}>
                {stats.min}°C
              </div>
              <div style={{ 
                color: '#718096', 
                fontSize: '0.95em',
                fontWeight: '500',
                letterSpacing: '0.5px'
              }}>
                Temperatura Mínima
              </div>
            </div>
            
            <div style={{
              ...neumorphicCard,
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ 
                fontSize: '2.8em', 
                fontWeight: '700', 
                color: '#48BB78',
                textShadow: '2px 2px 4px rgba(163, 177, 198, 0.2)',
                marginBottom: '8px'
              }}>
                {stats.sensors}
              </div>
              <div style={{ 
                color: '#718096', 
                fontSize: '0.95em',
                fontWeight: '500',
                letterSpacing: '0.5px'
              }}>
                Sensores Activos
              </div>
            </div>
          </div>
        )}

        {/* Selector de sensor */}
        {uniqueSensors.length > 0 && (
          <div style={{
            ...neumorphicCard,
            marginBottom: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            flexWrap: 'wrap'
          }}>
            <label style={{ 
              fontWeight: '600', 
              color: '#4A5568',
              fontSize: '15px'
            }}>
              Filtrar por sensor:
            </label>
            <select 
              value={selectedSensor} 
              onChange={(e) => setSelectedSensor(e.target.value)}
              style={{
                ...neumorphicButton,
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500',
                outline: 'none',
                minWidth: '200px'
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = 'inset 4px 4px 8px #A3B1C6, inset -4px -4px 8px #FFFFFF'
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = '4px 4px 8px #A3B1C6, -4px -4px 8px #FFFFFF'
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
            ...neumorphicRaised,
            marginBottom: '30px'
          }}>
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: '25px',
              color: '#2D3748',
              fontSize: '1.8em',
              fontWeight: '600',
              letterSpacing: '-0.3px'
            }}>
              Temperatura en Tiempo Real
            </h2>
            <div style={{
              ...neumorphicPressed,
              padding: '20px',
              borderRadius: '15px'
            }}>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4299E1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4299E1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E0" opacity={0.5} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#718096"
                    style={{ fontSize: '12px' }}
                    tick={{ fill: '#718096' }}
                  />
                  <YAxis 
                    label={{ value: 'Temperatura (°C)', angle: -90, position: 'insideLeft', style: { fill: '#718096' } }}
                    stroke="#718096"
                    tick={{ fill: '#718096' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#E0E5EC',
                      border: 'none',
                      borderRadius: '15px',
                      boxShadow: '4px 4px 8px #A3B1C6, -4px -4px 8px #FFFFFF',
                      padding: '10px 15px'
                    }}
                    formatter={(value, name) => [`${value}°C`, 'Temperatura']}
                    labelFormatter={(label) => `Hora: ${label}`}
                    labelStyle={{ color: '#4A5568', fontWeight: '600' }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#4A5568' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#4299E1" 
                    fillOpacity={1} 
                    fill="url(#colorTemp)"
                    name="Temperatura"
                    strokeWidth={3}
                    dot={{ fill: '#4299E1', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Gráfica de barras - Estadísticas por sensor */}
        {sensorStats.length > 0 && (
          <div style={{
            ...neumorphicRaised,
            marginBottom: '30px'
          }}>
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: '25px',
              color: '#2D3748',
              fontSize: '1.8em',
              fontWeight: '600',
              letterSpacing: '-0.3px'
            }}>
              Estadísticas por Sensor
            </h2>
            <div style={{
              ...neumorphicPressed,
              padding: '20px',
              borderRadius: '15px'
            }}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sensorStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E0" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#718096" tick={{ fill: '#718096' }} />
                  <YAxis stroke="#718096" tick={{ fill: '#718096' }} />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#E0E5EC',
                      border: 'none',
                      borderRadius: '15px',
                      boxShadow: '4px 4px 8px #A3B1C6, -4px -4px 8px #FFFFFF',
                      padding: '10px 15px'
                    }}
                    labelStyle={{ color: '#4A5568', fontWeight: '600' }}
                  />
                  <Legend 
                    wrapperStyle={{ color: '#4A5568' }}
                  />
                  <Bar 
                    dataKey="promedio" 
                    fill="#4299E1" 
                    name="Temperatura Promedio (°C)"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar 
                    dataKey="mensajes" 
                    fill="#48BB78" 
                    name="Mensajes Enviados"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Tabla de últimos datos */}
        <div style={{
          ...neumorphicRaised
        }}>
          <h2 style={{ 
            marginTop: 0, 
            marginBottom: '25px',
            color: '#2D3748',
            fontSize: '1.8em',
            fontWeight: '600',
            letterSpacing: '-0.3px'
          }}>
            Últimos Datos Recibidos
          </h2>
          {sensorData.length === 0 ? (
            <div style={{ 
              padding: '50px', 
              textAlign: 'center', 
              color: '#718096',
              ...neumorphicPressed,
              borderRadius: '15px'
            }}>
              <p style={{ fontSize: '1.3em', fontWeight: '500', marginBottom: '10px' }}>
                Esperando datos de sensores...
              </p>
              <p style={{ marginTop: '10px', fontSize: '0.95em' }}>
                {status !== 'Conectado' && 'Asegúrate de que el aggregator-service esté corriendo en el puerto 3000'}
              </p>
            </div>
          ) : (
            <div style={{ 
              overflowX: 'auto',
              ...neumorphicPressed,
              borderRadius: '15px',
              padding: '15px'
            }}>
              {/* Header de tabla */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr 1.5fr 2fr',
                gap: '15px',
                marginBottom: '15px',
                padding: '0 10px'
              }}>
                <div style={{ fontWeight: '600', color: '#4A5568', fontSize: '15px', letterSpacing: '0.3px' }}>
                  Sensor ID
                </div>
                <div style={{ fontWeight: '600', color: '#4A5568', fontSize: '15px', letterSpacing: '0.3px' }}>
                  Tipo
                </div>
                <div style={{ fontWeight: '600', color: '#4A5568', fontSize: '15px', letterSpacing: '0.3px' }}>
                  Temperatura
                </div>
                <div style={{ fontWeight: '600', color: '#4A5568', fontSize: '15px', letterSpacing: '0.3px' }}>
                  Fecha/Hora
                </div>
              </div>
              
              {/* Filas de datos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sensorData.slice(0, 20).map((data, index) => (
                  <div
                    key={index}
                    style={{
                      ...neumorphicCard,
                      padding: '18px',
                      display: 'grid',
                      gridTemplateColumns: '2fr 1.5fr 1.5fr 2fr',
                      gap: '15px',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ 
                      fontWeight: '500',
                      color: '#2D3748'
                    }}>
                      {data.sensor_id}
                    </div>
                    <div style={{ 
                      color: '#718096'
                    }}>
                      {data.type}
                    </div>
                    <div>
                      <span style={{ 
                        fontSize: '1.15em', 
                        fontWeight: '700', 
                        color: data.value > 27 ? '#F56565' : data.value < 23 ? '#4299E1' : '#48BB78',
                        textShadow: '1px 1px 2px rgba(163, 177, 198, 0.2)'
                      }}>
                        {data.value}°C
                      </span>
                    </div>
                    <div style={{ 
                      color: '#718096',
                      fontSize: '13px'
                    }}>
                      {new Date(data.timestamp * 1000).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
