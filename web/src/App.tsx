import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

type BrushCmd = {
  color: string
  shape: string
  size: number
  text: string
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    c.width = Math.min(window.innerWidth - 40, 1100)
    c.height = Math.min(window.innerHeight - 320, 700)
    const ctx = c.getContext('2d')
    if (ctx) {
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctxRef.current = ctx
    }
  }, [])

  function clear() {
    const ctx = ctxRef.current
    const c = canvasRef.current
    if (ctx && c) ctx.clearRect(0, 0, c.width, c.height)
    setTranscript('')
  }

  async function parse(text: string): Promise<BrushCmd | null> {
    try {
      const res = await fetch(`${API_BASE}/api/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  function draw(cmd: BrushCmd) {
    const ctx = ctxRef.current
    const c = canvasRef.current
    if (!ctx || !c) return
    const x = c.width / 2 + (Math.random() - 0.6) * 200
    const y = c.height / 2 + (Math.random() - 0.6) * 160
    ctx.save()
    ctx.globalAlpha = 0.92
    ctx.strokeStyle = cmd.color
    ctx.lineWidth = cmd.size
    ctx.shadowBlur = 10
    ctx.shadowColor = cmd.color + '80'
    ctx.beginPath()
    if (cmd.shape === 'circle') {
      ctx.arc(x, y, cmd.size, 0, Math.PI * 2)
      ctx.stroke()
    } else if (cmd.shape === 'spiral') {
      for (let i = 0; i < 40; i++) {
        const ang = i * 0.6
        const r = i * 2.2
        ctx.lineTo(x + Math.cos(ang) * r, y + Math.sin(ang) * r)
      }
      ctx.stroke()
    } else if (cmd.shape === 'zigzag') {
      ctx.moveTo(x, y)
      for (let i = 1; i <= 6; i++) {
        ctx.lineTo(x + i * 20, y + (i % 2 ? -15 : 15))
      }
      ctx.stroke()
    } else if (cmd.shape === 'line') {
      ctx.moveTo(x - 60, y)
      ctx.lineTo(x + 60, y)
      ctx.stroke()
    } else {
      ctx.moveTo(x, y)
      ctx.bezierCurveTo(x + 50, y - 60, x + 120, y + 40, x + 180, y - 20)
      ctx.stroke()
    }
    ctx.restore()
  }

  function start() {
    setError('')
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SR) {
      setError('SpeechRecognition not supported in this browser')
      return
    }
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = async (e: any) => {
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
      }
      if (final.trim()) {
        setTranscript(final)
        const cmd = await parse(final)
        if (cmd) draw(cmd)
      }
    }
    rec.onerror = (e: any) => {
      setError(e.error || 'error')
      setListening(false)
    }
    rec.onend = () => {
      if (listening) rec.start()
    }
    rec.start()
    recognitionRef.current = rec
    setListening(true)
  }

  function stop() {
    if (recognitionRef.current) recognitionRef.current.stop()
    setListening(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 16px' }}>
      <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ margin: 0, fontSize: 'clamp(28px,5vw,48px)', letterSpacing: '-0.02em', fontWeight: 700 }}>
        Voicebrush
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} style={{ margin: 0, color: 'rgba(247,247,247,0.6)', textAlign: 'center' }}>
        Speak - it paints. Natural language becomes gestural brush strokes.
      </motion.p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
        <button onClick={start} disabled={listening} style={btn(listening)}>Start mic</button>
        <button onClick={stop} disabled={!listening} style={btn(!listening)}>Stop</button>
        <button onClick={clear} style={btn(false)}>Clear</button>
      </div>
      {error && <div style={{ color: '#ff6b6b', fontSize: 14 }}>{error}</div>}
      {transcript && <div style={{ color: 'rgba(247,247,247,0.8)', maxWidth: 900, textAlign: 'center', lineHeight: 1.6 }}>{transcript}</div>}
      <motion.canvas ref={canvasRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'radial-gradient(1200px 700px at 50% 30%, rgba(255,255,255,0.02), transparent)' }} />
    </div>
  )
}

function btn(disabled: boolean): React.CSSProperties {
  return {
    appearance: 'none',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.04), transparent)',
    color: '#f7f7f7',
    padding: '10px 18px',
    borderRadius: 999,
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 500
  }
}
