import { useState, useEffect } from 'react'
import './Admin.css'

const BACKEND = 'http://localhost:8000'

export default function Admin() {
  const [logs, setLogs]       = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)

  async function fetchLogs() {
    setLoading(true)
    try {
      const res  = await fetch(`${BACKEND}/admin/logs`)
      const data = await res.json()
      setLogs(data.logs)
      setTotal(data.total)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [])

  return (
    <div className="admin-wrap">
      <div className="admin-header">
        <div>
          <span className="admin-title">Admin</span>
          {!loading && <span className="admin-count">{total} conversation{total !== 1 ? 's' : ''}</span>}
        </div>
        <button className="refresh-btn" onClick={fetchLogs} disabled={loading}>
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      <div className="admin-body">
        {loading && <p className="admin-empty">Loading…</p>}

        {!loading && logs.length === 0 && (
          <p className="admin-empty">No conversations yet. Ask the AI something to see logs here.</p>
        )}

        {!loading && logs.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Question</th>
                  <th>Answer</th>
                </tr>
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
        )}
      </div>
    </div>
  )
}
