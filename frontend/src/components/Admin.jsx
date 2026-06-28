import { useState, useEffect } from 'react'
import './Admin.css'

const BACKEND = 'http://localhost:8000'

export default function Admin() {
  const [tab, setTab]           = useState('conversations')
  const [logs, setLogs]         = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)

  async function fetchAll() {
    setLoading(true)
    try {
      const [logsRes, bookingsRes] = await Promise.all([
        fetch(`${BACKEND}/admin/logs`),
        fetch(`${BACKEND}/booking/all`)
      ])
      const logsData     = await logsRes.json()
      const bookingsData = await bookingsRes.json()
      setLogs(logsData.logs ?? [])
      setBookings(bookingsData.bookings ?? [])
    } catch {
      setLogs([])
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <div className="admin-tabs">
          <button
            className={`tab-btn ${tab === 'conversations' ? 'active' : ''}`}
            onClick={() => setTab('conversations')}
          >
            Conversations {!loading && <span className="admin-count">{logs.length}</span>}
          </button>
          <button
            className={`tab-btn ${tab === 'bookings' ? 'active' : ''}`}
            onClick={() => setTab('bookings')}
          >
            Bookings {!loading && <span className="admin-count">{bookings.length}</span>}
          </button>
        </div>
        <button className="refresh-btn" onClick={fetchAll} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      <div className="admin-body">
        {loading && <p className="admin-empty">Loading…</p>}

        {!loading && tab === 'conversations' && (
          logs.length === 0
            ? <p className="admin-empty">No conversations yet. Ask the AI something to see logs here.</p>
            : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Time</th><th>Question</th><th>Answer</th></tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log.id}>
                        <td className="col-time">{log.timestamp}</td>
                        <td className="col-question">{log.question}</td>
                        <td className="col-answer">{log.answer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        )}

        {!loading && tab === 'bookings' && (
          bookings.length === 0
            ? <p className="admin-empty">No bookings yet.</p>
            : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Ref</th><th>Name</th><th>Date</th><th>Time</th><th>Party</th><th>Created</th></tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id}>
                        <td className="col-time">#BK-{String(b.id).padStart(4, '0')}</td>
                        <td className="col-question">{b.name}</td>
                        <td className="col-time">{b.date}</td>
                        <td className="col-time">{b.time}</td>
                        <td className="col-time">{b.party_size}</td>
                        <td className="col-time">{b.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        )}
      </div>
    </div>
  )
}
