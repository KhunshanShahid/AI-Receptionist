import { useState, useRef, useEffect } from 'react'
import './CallDemo.css'

const BACKEND = 'http://localhost:8000'
const MAX_NO_SPEECH = 3

const STATUS = {
  IDLE:       'idle',
  LISTENING:  'listening',
  PROCESSING: 'processing',
  SPEAKING:   'speaking',
  WAITING:    'waiting',   // after max no-speech retries
}

export default function CallDemo() {
  const [inCall,       setInCall]       = useState(false)
  const [status,       setStatus]       = useState(STATUS.IDLE)
  const [interimText,  setInterimText]  = useState('')   // real-time words as heard
  const [transcript,   setTranscript]   = useState('')   // confirmed last question
  const [answer,       setAnswer]       = useState('')
  const [timer,        setTimer]        = useState(0)

  // refs — safe to read inside recognition/TTS callbacks
  const transcriptRef  = useRef('')
  const historyRef     = useRef([])
  const inCallRef      = useRef(false)
  const recognitionRef = useRef(null)
  const ttsKeepalive   = useRef(null)
  const noSpeechCount  = useRef(0)
  const timerInterval  = useRef(null)

  useEffect(() => { inCallRef.current = inCall }, [inCall])

  // call timer
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

  // ── FIX 1: Chrome TTS keepalive ──────────────────────────────────────────
  function speak(text) {
    window.speechSynthesis.cancel()
    clearInterval(ttsKeepalive.current)

    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 1

    utter.onstart = () => {
      setStatus(STATUS.SPEAKING)
      // Chrome stops speaking after ~15s — pause/resume every 10s to prevent it
      ttsKeepalive.current = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause()
          window.speechSynthesis.resume()
        }
      }, 10000)
    }

    utter.onend = () => {
      clearInterval(ttsKeepalive.current)
      if (inCallRef.current) startListening()
      else setStatus(STATUS.IDLE)
    }

    utter.onerror = () => {
      clearInterval(ttsKeepalive.current)
      if (inCallRef.current) startListening()
    }

    window.speechSynthesis.speak(utter)
  }

  // ── FIX 2: Interrupt ─────────────────────────────────────────────────────
  function interrupt() {
    clearInterval(ttsKeepalive.current)
    window.speechSynthesis.cancel()
    startListening()
  }

  // ── FIX 3: Conversation history sent with each request ───────────────────
  async function queryBackend(question) {
    setStatus(STATUS.PROCESSING)
    setInterimText('')

    try {
      const res = await fetch(`${BACKEND}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: question,
          history: historyRef.current.slice(-6)   // last 3 exchanges
        })
      })
      const data = await res.json()
      setAnswer(data.answer)

      // update history ref + state
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

  // ── FIX 4+5: Interim transcript + no-speech guard ────────────────────────
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

    // FIX 4: show words in real-time as interim, separate from final
    recognition.onresult = (e) => {
      let interim = ''
      let final   = ''
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
        noSpeechCount.current = 0
        queryBackend(said)
      } else if (inCallRef.current) {
        // FIX 5: no-speech guard — max 3 silent retries then pause
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
      if (e.error === 'no-speech') return  // handled in onend
      console.error('Speech error:', e.error)
      if (inCallRef.current) startListening()
    }

    recognition.start()
  }

  function startCall() {
    setInCall(true)
    setAnswer('')
    setTranscript('')
    setInterimText('')
    historyRef.current = []
    noSpeechCount.current = 0
    startListening()
  }

  function endCall() {
    setInCall(false)
    setStatus(STATUS.IDLE)
    setTranscript('')
    setInterimText('')
    setAnswer('')
    historyRef.current = []
    clearInterval(ttsKeepalive.current)
    window.speechSynthesis.cancel()
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
      recognitionRef.current = null
    }
  }

  const statusLabel = {
    [STATUS.IDLE]:       '',
    [STATUS.LISTENING]:  'Listening…',
    [STATUS.PROCESSING]: 'Thinking…',
    [STATUS.SPEAKING]:   'Tap mic to interrupt',
    [STATUS.WAITING]:    'Tap mic to continue',
  }[status]

  return (
    <div className="call-wrap">
      <div className="call-header">Call Demo</div>

      <div className="call-body">
        <div className={`call-card ${inCall ? 'active' : ''}`}>

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
              {/* mic button — doubles as interrupt during speaking / resume during waiting */}
              <button
                className={`mic-btn ${status}`}
                onClick={
                  status === STATUS.SPEAKING ? interrupt :
                  status === STATUS.WAITING  ? startListening :
                  null
                }
                disabled={status === STATUS.PROCESSING}
              >
                {status === STATUS.SPEAKING ? '✋' : '🎙️'}
              </button>

              <button className="call-btn end" onClick={endCall}>
                <span>📵</span> End Call
              </button>
            </div>
          )}

          {/* FIX 4: interim transcript (dim, italic) shown in real-time */}
          {interimText && (
            <div className="voice-box interim">
              <span className="voice-label">Hearing</span>
              <p>{interimText}</p>
            </div>
          )}

          {transcript && !interimText && (
            <div className="voice-box transcript">
              <span className="voice-label">You</span>
              <p>{transcript}</p>
            </div>
          )}

          {answer && (
            <div className="voice-box answer">
              <span className="voice-label">AI</span>
              <p>{answer}</p>
            </div>
          )}

          {status === STATUS.WAITING && (
            <p className="waiting-msg">No speech detected. Tap the mic to continue or end the call.</p>
          )}
        </div>
      </div>
    </div>
  )
}
