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

type Stroke = {
  id: number
  points: Array<{ x: number; y: number }>
  color: string
  size: number
  opacity: number
  vel: number
  rot: number
  shape: string
  birth: number
  life: number
  trail: boolean
}

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const strokesRef = useRef<Stroke[]>([])
  const rafRef = useRef<number | null>(null)
  const idRef = useRef(0)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [error, setError] = useState('')
  const recRef = useRef<any>(null)
  const lastFinalRef = useRef('')

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    const set = () => {
      const w = Math.min(window.innerWidth - 20, 1400)
      const h = Math.min(window.innerHeight - 360, 800)
      c.width = w * dpr
      c.height = h * dpr
      c.style.width = w + 'px'
      c.style.height = h + 'px'
      const ctx = c.getContext('2d')
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
      }
    }
    set()
    const loop = () => {
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    window.addEventListener('resize', set)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', set)
    }
  }, [])

  function strokePath(cmd: BrushCmd): Array<{ x: number; y: number }> {
    const c = canvasRef.current
    if (!c) return []
    const w = c.clientWidth
    const h = c.clientHeight
    const cx = w * (0.5 + (Math.random() - 0.5) * 0.16)
    const cy = h * (0.5 + (Math.random() - 0.5) * 0.12)
    const len = (80 + Math.random() * 160) * (cmd.velocity || 1)
    const bend = (0.25 + Math.random() * 0.45) * (cmd.velocity >= 1 ? 1.6 : 0.9)
    switch (cmd.shape) {
      case 'line':
        return [
          { x: cx - len * 0.6, y: cy },
          { x: cx + len * 0.6, y: cy },
        ]
      case 'swipe':
        return [
          { x: cx - len * 0.7, y: cy - len * 0.25 },
          { x: cx + len * 0.3, y: cy + len * 0.18 },
          { x: cx + len * 0.8, y: cy - len * 0.12 },
        ]
      case 'wave': {
        const pts = []
        for (let i = 0; i <= 9; i++) {
          const t = i / 9
          const x = cx - len * 0.6 + t * len * 1.2
          const y = cy + Math.sin(t * Math.PI * 2 + Math.random() * 0.4) * (len * 0.18)
          pts.push({ x, y })
        }
        return pts
      }
      case 'zigzag': {
        const pts = []
        let x = cx - len * 0.6, y = cy
        pts.push({ x, y })
        for (let i = 1; i <= 7; i++) {
          x += len * 0.16
          y += (i % 2 === 1 ? -len * 0.12 : len * 0.12)
          pts.push({ x, y })
        }
        return pts
      }
      case 'spiral': {
        const pts = []
        for (let i = 0; i <= 24; i++) {
          const ang = (i / 24) * Math.PI * 3
          const r = (i / 24) * len * 0.5
          pts.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r })
        }
        return pts
      }
      case 'circle': {
        const pts = []
        const r = len * 0.32
        for (let i = 0; i <= 16; i++) {
          const ang = (i / 16) * Math.PI * 2
          pts.push({ x: cx + Math.cos(ang) * r, y: cy + Math.sin(ang) * r })
        }
        return pts
      }
      case 'dots': {
        const pts = []
        for (let i = 0; i <= 5; i++) {
          pts.push({ x: cx + (i - 2.5) * (len * 0.16), y: cy + (Math.random() - 0.5) * len * 0.12 })
        }
        return pts
      }
      default: {
        const pts = []
        pts.push({ x: cx - len * 0.6, y: cy + len * 0.15 })
        pts.push({ x: cx - len * 0.25, y: cy - len * bend })
        pts.push({ x: cx + len * 0.25, y: cy + len * bend * 0.6 })
        pts.push({ x: cx + len * 0.6, y: cy - len * 0.2 })
        return pts
      }
    }
  }

  function spawn(cmd: BrushCmd) {
    const pts = strokePath(cmd)
    if (pts.length < 2) return
    const now = performance.now()
    for (let i = 0; i < Math.max(1, cmd.count); i++) {
      const jitter = i > 0 ? 0.12 : 0
      const cpts = pts.map(p => ({ x: p.x + (Math.random() - 0.5) * len(p, pts) * jitter, y: p.y + (Math.random() - 0.5) * len(p, pts) * jitter }))
      strokesRef.current.push({
        id: ++idRef.current,
        points: cpts,
        color: cmd.color,
        size: (cmd.size || 9) * (0.9 + Math.random() * 0.25),
        opacity: Math.min(1, cmd.opacity || 0.98),
        vel: cmd.velocity || 1,
        rot: cmd.rotation || 0,
        shape: cmd.shape,
        birth: now,
        life: 1400 + Math.random() * 900,
        trail: true,
      })
    }
    if (strokesRef.current.length > 900) strokesRef.current = strokesRef.current.slice(-700)
  }

  function len(p: any, pts: any[]): number {
    const idx = pts.indexOf(p)
    if (idx <= 0) return 40
    const a = pts[idx - 1], b = p
    return Math.hypot(b.x - a.x, b.y - a.y)
  }

  function draw() {
    const ctx = ctxRef.current
    const c = canvasRef.current
    if (!ctx || !c) return
    ctx.fillStyle = 'rgba(8,8,10,0.12)'
    ctx.fillRect(0, 0, c.clientWidth, c.clientHeight)
    const now = performance.now()
    strokesRef.current = strokesRef.current.filter(s => now - s.birth < s.life + 200)
    for (const s of strokesRef.current) {
      const age = now - s.birth
      const t = Math.min(1, age / s.life)
      const alpha = s.opacity * (1 - t) * (0.9 + Math.sin(age * 0.002) * 0.1)
      ctx.save()
      ctx.globalCompositeOperation = 'screen'
      ctx.globalAlpha = Math.max(0, alpha)
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.size * (1 - t * 0.25)
      ctx.shadowBlur = s.size * 1.8
      ctx.shadowColor = s.color + 'aa'
      if (s.points.length === 2) {
        const [a, b] = s.points
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      } else if (s.points.length >= 3) {
        ctx.beginPath()
        ctx.moveTo(s.points[0].x, s.points[0].y)
        for (let i = 1; i < s.points.length - 1; i++) {
          const p = s.points[i]
          const n = s.points[i + 1]
          const cx = (p.x + n.x) / 2
          const cy = (p.y + n.y) / 2
          ctx.quadraticCurveTo(p.x, p.y, cx, cy)
        }
        ctx.stroke()
      } else if (s.points.length === 1) {
        const p = s.points[0]
        ctx.beginPath()
        ctx.arc(p.x, p.y, s.size * 0.5, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
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
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      setInterim(interim.trim())
      if (final.trim() && final.trim() !== lastFinalRef.current) {
        lastFinalRef.current = final.trim()
        const t = final.trim()
        setTranscript(t)
        setHistory(h => [t, ...h].slice(0, 5))
        const cmd = await parse(t)
        if (cmd) spawn(cmd)
      }
    }
    rec.onerror = (e: any) => {
      setError(e.error || 'recognition error')
      setListening(false)
    }
    rec.onend = () => {
      if (listening) { try { rec.start() } catch {} }
    }
    rec.start()
    recRef.current = rec
    setListening(true)
  }

  function stop() {
    if (recRef.current) recRef.current.stop()
    setListening(false)
    setInterim('')
  }

  function clear() {
    strokesRef.current = []
    setTranscript('')
    setInterim('')
    setHistory([])
    lastFinalRef.current = ''
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1600px 900px at 50% 10%, #15151a, #08080a)', color: '#f7f7f7', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '26px 12px' }}>
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ margin: 0, fontSize: 'clamp(30px,6vw,60px)', letterSpacing: '-0.035em', fontWeight: 800 }}>
        Voicebrush
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} style={{ margin: 0, color: 'rgba(247,247,247,0.56)', textAlign: 'center' }}>
        Speak. It paints with intent.
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
        <button onClick={start} disabled={listening} style={btn(listening)}>Start</button>
        <button onClick={stop} disabled={!listening} style={btn(!listening)}>Stop</button>
        <button onClick={clear} style={btn(false)}>Clear</button>
      </motion.div>
      <AnimatePresence>
        {error && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</motion.div>}
      </AnimatePresence>
      <AnimatePresence>
        {(transcript || interim) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ color: 'rgba(247,247,247,0.9)', maxWidth: 920, textAlign: 'center', lineHeight: 1.8, fontSize: 'clamp(14px,2.2vw,17px)' }}>
            {transcript}{interim && <span style={{ color: 'rgba(247,247,247,0.4)' }}> {interim}</span>}
          </motion.div>
        )}
      </AnimatePresence>
      <motion.canvas ref={canvasRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }} style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 60px 160px -80px rgba(159,201,255,0.5), 0 30px 80px -50px rgba(0,0,0,0.95)' }} />
      {history.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', maxWidth: 1100, justifyContent: 'center' }}>
          {history.map((h, i) => (
            <motion.span key={i} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.04 * i }} style={{ fontSize: 11, color: 'rgba(247,247,247,0.38)', padding: '5px 9px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.05)' }}>
              {h}
            </motion.span>
          ))}
        </div>
      )}
    </div>
  )
}

function btn(disabled: boolean): React.CSSProperties {
  return {
    appearance: 'none',
    border: '1px solid rgba(255,255,255,0.12)',
    background: disabled ? 'rgba(255,255,255,0.02)' : 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent)',
    color: '#f7f7f7',
    padding: '9px 18px',
    borderRadius: 999,
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    letterSpacing: '-0.01em',
  }
}
