import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type BrushCmd = {
  color: string
  shape: string
  size: number
  opacity: number
  rotation: number
  velocity: number
  count: number
  text: string
}

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [error, setError] = useState('')
  const recRef = useRef<any>(null)
  const rafRef = useRef<number | null>(null)
  const particlesRef = useRef<Array<any>>([])
  const timeRef = useRef(0)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = Math.min(window.innerWidth - 32, 1200) * dpr
    c.height = Math.min(window.innerHeight - 360, 720) * dpr
    c.style.width = Math.min(window.innerWidth - 32, 1200) + 'px'
    c.style.height = Math.min(window.innerHeight - 360, 720) + 'px'
    const ctx = c.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctxRef.current = ctx
    }
    const loop = (t: number) => {
      timeRef.current = t
      drawFrame()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    const onResize = () => {
      const c2 = canvasRef.current
      if (!c2) return
      const dpr2 = window.devicePixelRatio || 1
      c2.width = Math.min(window.innerWidth - 32, 1200) * dpr2
      c2.height = Math.min(window.innerHeight - 360, 720) * dpr2
      c2.style.width = Math.min(window.innerWidth - 32, 1200) + 'px'
      c2.style.height = Math.min(window.innerHeight - 360, 720) + 'px'
      const ctx = c2.getContext('2d')
      if (ctx) ctx.scale(dpr2, dpr2)
    }
    window.addEventListener('resize', onResize)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  function drawFrame() {
    const ctx = ctxRef.current
    const c = canvasRef.current
    if (!ctx || !c) return
    const cw = c.clientWidth
    const ch = c.clientHeight
    ctx.save()
    ctx.globalAlpha = 0.06
    ctx.fillStyle = '#0f0f0f'
    ctx.fillRect(0, 0, cw, ch)
    ctx.restore()

    const now = performance.now()
    particlesRef.current = particlesRef.current.filter(p => now - p.birth < p.life)
    for (const p of particlesRef.current) {
      const t = (now - p.birth) / p.life
      const x = p.x + p.vx * t * p.vel
      const y = p.y + p.vy * t * p.vel
      const alpha = (1 - t) * p.opacity
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = p.color
      ctx.lineWidth = p.size * (1 - t * 0.4)
      ctx.shadowBlur = p.size * 2
      ctx.shadowColor = p.color + '60'
      ctx.translate(x, y)
      ctx.rotate(p.rot * t)
      ctx.beginPath()
      if (p.shape === 'circle') {
        ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2)
        ctx.stroke()
      } else if (p.shape === 'spiral') {
        for (let i = 0; i < 20; i++) {
          const ang = i * 0.8 + t * 4
          const r = i * 1.6
          ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r)
        }
        ctx.stroke()
      } else if (p.shape === 'zigzag') {
        ctx.moveTo(-12, 0)
        for (let i = 0; i < 6; i++) ctx.lineTo(-12 + i * 6, (i % 2 ? -6 : 6))
        ctx.stroke()
      } else if (p.shape === 'wave') {
        ctx.moveTo(-20, 0)
        for (let i = 0; i < 10; i++) ctx.quadraticCurveTo(-20 + i * 4 + 2, (i % 2 ? -4 : 4), -20 + i * 4 + 4, 0)
        ctx.stroke()
      } else if (p.shape === 'dots') {
        for (let i = 0; i < 5; i++) {
          ctx.beginPath()
          ctx.arc((i - 2) * 4, Math.sin(i + t * 6) * 3, 1.5, 0, Math.PI * 2)
          ctx.stroke()
        }
      } else if (p.shape === 'swipe') {
        ctx.moveTo(-16, -4)
        ctx.lineTo(16, 4)
        ctx.stroke()
      } else if (p.shape === 'line') {
        ctx.moveTo(-20, 0)
        ctx.lineTo(20, 0)
        ctx.stroke()
      } else {
        ctx.moveTo(-16, 0)
        ctx.bezierCurveTo(-8, -12, 8, 12, 16, -6)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  function spawn(cmd: BrushCmd) {
    const c = canvasRef.current
    if (!c) return
    const cw = c.clientWidth
    const ch = c.clientHeight
    const cx = cw / 2 + (Math.random() - 0.5) * 260
    const cy = ch / 2 + (Math.random() - 0.5) * 200
    const now = performance.now()
    for (let i = 0; i < cmd.count; i++) {
      const ang = (Math.random() * Math.PI * 2)
      const speed = (0.6 + Math.random() * 0.8) * cmd.velocity
      particlesRef.current.push({
        birth: now,
        life: 900 + Math.random() * 700,
        x: cx + (Math.random() - 0.5) * 20,
        y: cy + (Math.random() - 0.5) * 20,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        vel: speed,
        color: cmd.color,
        size: cmd.size * (0.8 + Math.random() * 0.6),
        opacity: cmd.opacity * (0.8 + Math.random() * 0.4),
        rot: (Math.random() - 0.5) * (Math.PI / 2) * (cmd.rotation > 0 ? 2 : 1),
        shape: cmd.shape,
      })
    }
  }

  async function parse(text: string): Promise<BrushCmd | null> {
    try {
      const res = await fetch(`${API_BASE}/api/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  function start() {
    setError('')
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SR) {
      setError('SpeechRecognition not supported in this browser (Chrome/Edge recommended)')
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
        const t = final.trim()
        setTranscript(t)
        setHistory(h => [t, ...h].slice(0, 6))
        const cmd = await parse(t)
        if (cmd) spawn(cmd)
      }
    }
    rec.onerror = (e: any) => {
      setError(e.error || 'recognition error')
      setListening(false)
    }
    rec.onend = () => {
      if (listening) {
        try { rec.start() } catch {}
      }
    }
    rec.start()
    recRef.current = rec
    setListening(true)
  }

  function stop() {
    if (recRef.current) recRef.current.stop()
    setListening(false)
  }

  function clear() {
    particlesRef.current = []
    setTranscript('')
    setHistory([])
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#f7f7f7', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '28px 16px' }}>
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ margin: 0, fontSize: 'clamp(32px,6vw,64px)', letterSpacing: '-0.03em', fontWeight: 800 }}>
        Voicebrush
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} style={{ margin: 0, color: 'rgba(247,247,247,0.55)', textAlign: 'center', maxWidth: 720 }}>
        Speak. The canvas responds. Turn words into gestural motion.
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
        <button onClick={start} disabled={listening} style={btn(listening)}>Start mic</button>
        <button onClick={stop} disabled={!listening} style={btn(!listening)}>Stop</button>
        <button onClick={clear} style={btn(false)}>Clear</button>
      </motion.div>
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} style={{ color: '#ff6b6b', fontSize: 14 }}>{error}</motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {transcript && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ color: 'rgba(247,247,247,0.85)', maxWidth: 900, textAlign: 'center', lineHeight: 1.7, fontSize: 'clamp(14px,2.2vw,18px)' }}>
            "{transcript}"
          </motion.div>
        )}
      </AnimatePresence>
      <motion.canvas ref={canvasRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 120px -60px rgba(127,169,255,0.45), 0 20px 60px -40px rgba(0,0,0,0.9)' }} />
      {history.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 1100, justifyContent: 'center', marginTop: 4 }}>
          {history.map((h, i) => (
            <motion.span key={i} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 * i }} style={{ fontSize: 12, color: 'rgba(247,247,247,0.4)', padding: '6px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.06)' }}>
              {h}
            </motion.span>
          ))}
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(247,247,247,0.3)' }}>Chrome/Edge recommended for live speech</div>
    </div>
  )
}

function btn(disabled: boolean): React.CSSProperties {
  return {
    appearance: 'none',
    border: '1px solid rgba(255,255,255,0.12)',
    background: disabled ? 'rgba(255,255,255,0.02)' : 'linear-gradient(180deg, rgba(255,255,255,0.06), transparent)',
    color: '#f7f7f7',
    padding: '10px 20px',
    borderRadius: 999,
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    letterSpacing: '-0.01em',
    transition: 'all 160ms ease',
  }
}
