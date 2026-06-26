import { useState, useRef } from 'react'
import './KnowledgeBase.css'

const BACKEND = 'http://localhost:8000'

export default function KnowledgeBase() {
  const [currentDoc, setCurrentDoc] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  async function uploadFile(file) {
    if (!file || file.type !== 'application/pdf') {
      alert('Please upload a PDF file.')
      return
    }
    if (currentDoc && !window.confirm(`Replace "${currentDoc.name}" with "${file.name}"? The previous document will be deleted.`)) {
      return
    }
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(`${BACKEND}/upload`, { method: 'POST', body: form })
      const data = await res.json()
      setCurrentDoc({ name: file.name, chunks: data.chunks_stored, id: data.doc_id })
    } catch {
      alert('Upload failed. Make sure the backend is running.')
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  function onFileChange(e) {
    if (e.target.files[0]) uploadFile(e.target.files[0])
    e.target.value = ''
  }

  return (
    <div className="kb-wrap">
      <div className="kb-header">Knowledge Base</div>

      <div className="kb-body">
        {currentDoc && (
          <div className="replace-warning">
            ⚠️ Uploading a new file will replace the current document.
          </div>
        )}

        <div
          className={`drop-zone ${dragOver ? 'over' : ''} ${uploading ? 'loading' : ''}`}
          onClick={() => !uploading && inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="drop-icon">📄</div>
          {uploading
            ? <p>Uploading & indexing…</p>
            : <>
                <p>Drop a PDF here or <span className="link">browse</span></p>
                <p className="drop-sub">PDF files only · one document at a time</p>
              </>
          }
          <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={onFileChange} />
        </div>

        {currentDoc && (
          <div className="doc-list">
            <p className="doc-list-title">Active Document</p>
            <div className="doc-item">
              <span className="doc-icon">📑</span>
              <div className="doc-info">
                <span className="doc-name">{currentDoc.name}</span>
                <span className="doc-meta">{currentDoc.chunks} chunks indexed</span>
              </div>
              <span className="doc-check">✓</span>
            </div>
          </div>
        )}

        {!currentDoc && !uploading && (
          <p className="kb-empty">No document uploaded yet. Upload a PDF to get started.</p>
        )}
      </div>
    </div>
  )
}
