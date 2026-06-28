import { useState, useRef, useEffect } from 'react'
import './CallDemo.css'

const BACKEND = 'http://localhost:8000'
const MAX_NO_SPEECH = 3
const GREETING = "Hi, this is Bella Cucina! How can I help you today?"

const STATUS = {
  IDLE:       'idle',
  LISTENING:  'listening',
  PROCESSING: 'processing',
  SPEAKING:   'speaking',
  WAITING:    'waiting',
}

export default function CallDemo() {
  const [inCall,      setInCall]      = useState(false)
  const [status,      setStatus]      = useState(STATUS.IDLE)
  const [interimText, setInterimText] = useState('')
  const [transcript,  setTranscript]  = useState('')
  const [answer,      setAnswer]      = useState('')
  const [timer,       setTimer]       = useState(0)

  const transcriptRef  = useRef('')
  const historyRef     = useRef([])
  const inCallRef      = useRef(false)
  const recognitionRef = useRef(null)
  const audioRef       = useRef(null)
  const lastAiTextRef  = useRef('')   // track AI speech to detect echo
  const noSpeechCount  = useRef(0)
  const timerInterval  = useRef(null)

  useEffect(() => { inCallRef.current = inCall }, [inCall])

  useEffect(() => {
    if (inCall) {
      setTimer(0)
      timerInterval.current = setInterval(() => setTimer(t => t + 1), 1000)
    } else {
      clearInterval(timerInterval.current)
      setTimer(0)
    }
    return () => clearInterval(timerInterval.current)
  }, [inCall])

  function formatTime(s) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
  }

  // Returns true if the recognized text is likely the mic picking up the AI's own voice
  function isEcho(recognized) {
    const aiText   = lastAiTextRef.current.toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
    const userText = recognized.toLowerCase().replace(/[^a-z0-9 ]/g, ' ')
    const words    = userText.split(/\s+/).filter(w => w.length > 3)
    if (words.length === 0) return false
    const matches = words.filter(w => aiText.includes(w)).length
    return matches / words.length > 0.55
  }

  async function speak(text) {
    stopAudio()
    lastAiTextRef.current = text
    setStatus(STATUS.SPEAKING)

    try {
      const audio = new Audio(`${BACKEND}/tts?text=${encodeURIComponent(text)}`)
      audioRef.current = audio

      audio.onended = () => {
        if (!inCallRef.current) { setStatus(STATUS.IDLE); return }
        // Short pause so room echo dies before mic opens
        setTimeout(startListening, 400)
      }

      audio.onerror = () => {
        if (inCallRef.current) setTimeout(startListening, 400)
      }

      audio.play()
    } catch (err) {
      console.error('TTS error:', err)
      if (inCallRef.current) startListening()
    }
  }

  async function queryBackend(question) {
    setStatus(STATUS.PROCESSING)
    setInterimText('')

    try {
      const res = await fetch(`${BACKEND}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query:   question,
          history: historyRef.current.slice(-6)
        })
      })
      const data = await res.json()
      setAnswer(data.answer)
      historyRef.current = [
        ...historyRef.current,
        { role: 'user',      text: question },
        { role: 'assistant', text: data.answer }
      ]
      speak(data.answer)
    } catch {
      const err = 'Could not reach the server.'
      setAnswer(err)
      speak(err)
    }
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition not supported. Please use Chrome.')
      return
    }

    transcriptRef.current = ''
    setInterimText('')

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false
    recognitionRef.current = recognition

    recognition.onstart = () => setStatus(STATUS.LISTENING)

    recognition.onresult = (e) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final   += e.results[i][0].transcript
        else                       interim += e.results[i][0].transcript
      }
      if (final) {
        transcriptRef.current += final
        setTranscript(transcriptRef.current)
      }
      setInterimText(interim)
    }

    recognition.onend = () => {
      setInterimText('')
      const said = transcriptRef.current.trim()

      if (said) {
        // Discard if it's the mic picking up the AI's own voice
        if (isEcho(said)) {
          transcriptRef.current = ''
          if (inCallRef.current) startListening()
          return
        }
        noSpeechCount.current = 0
        queryBackend(said)
      } else if (inCallRef.current) {
        noSpeechCount.current++
        if (noSpeechCount.current >= MAX_NO_SPEECH) {
          noSpeechCount.current = 0
          setStatus(STATUS.WAITING)
        } else {
          startListening()
        }
      }
    }

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') return
      console.error('Speech error:', e.error)
      if (inCallRef.current) startListening()
    }

    recognition.start()
  }

  function startCall() {
    setInCall(true)
    setAnswer(GREETING)
    setTranscript('')
    setInterimText('')
    historyRef.current    = []
    noSpeechCount.current = 0
    speak(GREETING)
  }

  function endCall() {
    setInCall(false)
    setStatus(STATUS.IDLE)
    setTranscript('')
    setInterimText('')
    setAnswer('')
    historyRef.current    = []
    noSpeechCount.current = 0
    stopAudio()
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
  }

  const statusLabel = {
    [STATUS.IDLE]:       '',
    [STATUS.LISTENING]:  'Listening…',
    [STATUS.PROCESSING]: 'Thinking…',
    [STATUS.SPEAKING]:   'Speaking…',
    [STATUS.WAITING]:    'Tap to continue',
  }[status]

  return (
    <div className="call-wrap">
      <div className="call-header">Call Demo</div>

      <div className="call-body">
        <div
          className={`call-card ${inCall ? 'active' : ''} ${status === STATUS.WAITING ? 'tappable' : ''}`}
          onClick={() => { if (status === STATUS.WAITING) startListening() }}
        >
          <div className="avatar">🤖</div>
          <p className="call-title">AI Receptionist</p>

          {inCall
            ? <p className="call-timer">{formatTime(timer)}</p>
            : <p className="call-sub">Start a demo call — ask anything about the documents.</p>
          }

          <div className={`status-ring ${status}`} />
          <p className="status-label">{statusLabel}</p>

          {!inCall ? (
            <button className="call-btn start" onClick={startCall}>
              <span>📞</span> Start Call
            </button>
          ) : (
            <div className="call-actions">
              <button className="call-btn end" onClick={endCall}>
                <span>📵</span> End Call
              </button>
            </div>
          )}

          {status === STATUS.WAITING && (
            <p className="waiting-msg">No speech detected. Tap anywhere to continue or end the call.</p>
          )}
        </div>
      </div>
    </div>
  )
}
