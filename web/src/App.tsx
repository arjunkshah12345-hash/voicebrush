import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type Vec = { x: number; y: number }
type Path = { pts: Vec[]; color: string; size: number; life: number; born: number }

const API_BASE = import.meta.env.VITE_API_BASE || ''

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const pathsRef = useRef<Path[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataRef = useRef<Uint8Array | null>(null)
  const rafRef = useRef<number | null>(null)
  const timeRef = useRef(0)
  const brushPosRef = useRef<Vec>({ x: 0, y: 0 })
  const velRef = useRef<number>(0)
  const hueRef = useRef<number>(200)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const [level, setLevel] = useState(0)
  const [note, setNote] = useState('')

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      c.width = w * dpr
      c.height = h * dpr
      c.style.width = w + 'px'
      c.style.height = h + 'px'
      const ctx = c.getContext('2d')
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      brushPosRef.current = { x: w / 2, y: h / 2 }
    }
    resize()
    window.addEventListener('resize', resize)
    const loop = (t: number) => {
      timeRef.current = t
      draw()
      if (listening) updateFromMic()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      stopMic()
    }
  }, [listening])

  function hsl(h: number, s: number, l: number) {
    return `hsl(${(h % 360 + 360) % 360}, ${s}%, ${l}%)`
  }

  async function startMic() {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      audioCtxRef.current = ctx
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.85
      src.connect(analyser)
      analyserRef.current = analyser
      dataRef.current = new Uint8Array(analyser.frequencyBinCount)
      setListening(true)
    } catch (e: any) {
      setError(e.message || 'Mic access denied')
    }
  }

  function stopMic() {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') audioCtxRef.current.close()
    streamRef.current = null
    audioCtxRef.current = null
    analyserRef.current = null
    dataRef.current = null
    setListening(false)
    setLevel(0)
  }

  function updateFromMic() {
    const analyser = analyserRef.current
    const data = dataRef.current
    if (!analyser || !data) return
    analyser.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / data.length)
    const amp = Math.min(1, rms * 2.6)
    setLevel(amp)

    analyser.getByteFrequencyData(data)
    let low = 0, mid = 0, high = 0
    const len = data.length
    for (let i = 0; i < len * 0.15; i++) low += data[i]
    for (let i = Math.floor(len * 0.15); i < len * 0.5; i++) mid += data[i]
    for (let i = Math.floor(len * 0.5); i < len; i++) high += data[i]
    low /= len * 0.15; mid /= len * 0.35; high /= len * 0.5

    const c = canvasRef.current!
    const w = c.clientWidth, h = c.clientHeight
    const nx = w / 2 + (mid - 128) / 128 * w * 0.22
    const ny = h / 2 + (high - 128) / 128 * h * 0.16
    const dx = nx - brushPosRef.current.x
    const dy = ny - brushPosRef.current.y
    const v = Math.min(1.6, Math.hypot(dx, dy) * 0.01 + amp * 0.8)
    velRef.current = v

    brushPosRef.current.x += dx * 0.18
    brushPosRef.current.y += dy * 0.18

    hueRef.current += amp * 14 + low * 0.08

    if (amp > 0.08 || v > 0.22) {
      const path: Path = {
        pts: [{ x: brushPosRef.current.x, y: brushPosRef.current.y }],
        color: hsl(hueRef.current, 85 - amp * 25, 58 + amp * 18),
        size: 2 + amp * 16 + v * 8,
        life: 900 + amp * 700,
        born: performance.now(),
      }
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI * 2 * i) / 6 + timeRef.current * 0.001
        path.pts.push({
          x: brushPosRef.current.x + Math.cos(ang) * (amp * 14 + v * 6),
          y: brushPosRef.current.y + Math.sin(ang) * (amp * 14 + v * 6),
        })
      }
      pathsRef.current.push(path)
    }

    if (pathsRef.current.length > 520) pathsRef.current = pathsRef.current.slice(-420)
  }

  function draw() {
    const ctx = ctxRef.current
    const c = canvasRef.current
    if (!ctx || !c) return
    ctx.fillStyle = 'rgba(6,6,9,0.16)'
    ctx.fillRect(0, 0, c.clientWidth, c.clientHeight)
    const now = performance.now()
    pathsRef.current = pathsRef.current.filter(p => now - p.born < p.life)
    ctx.globalCompositeOperation = 'screen'
    for (const p of pathsRef.current) {
      const t = (now - p.born) / p.life
      const alpha = (1 - t) * 0.95
      if (alpha <= 0) continue
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = p.color
      ctx.lineWidth = p.size * (1 - t * 0.6)
      ctx.shadowBlur = p.size * 2.2
      ctx.shadowColor = p.color + 'bb'
      ctx.beginPath()
      if (p.pts.length >= 2) {
        ctx.moveTo(p.pts[0].x, p.pts[0].y)
        for (let i = 1; i < p.pts.length; i++) {
          const a = p.pts[i - 1], b = p.pts[i]
          const cx = (a.x + b.x) / 2
          const cy = (a.y + b.y) / 2
          ctx.quadraticCurveTo(a.x, a.y, cx, cy)
        }
      }
      ctx.stroke()
      ctx.restore()
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#060609', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', pointerEvents: 'none' }}>
        <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ margin: 0, fontSize: 'clamp(26px,5vw,52px)', letterSpacing: '-0.04em', fontWeight: 800, color: '#f7f7f7' }}>
          Soundbrush
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ margin: 0, color: 'rgba(247,247,247,0.55)', fontSize: 'clamp(12px,1.6vw,14px)' }}>
          Let sound paint. Speak, hum, tap mic - it responds live.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', gap: 10, marginTop: 4, pointerEvents: 'auto' }}>
          <button onClick={listening ? stopMic : startMic} style={btn(listening)}>
            {listening ? 'Stop mic' : 'Start mic'}
          </button>
          <button onClick={() => (pathsRef.current = [])} style={btn(false)}>Clear</button>
        </motion.div>
        <AnimatePresence>
          {error && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} style={{ color: '#ff6b6b', fontSize: 12 }}>{error}</motion.div>}
        </AnimatePresence>
        {listening && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 6, width: 'min(420px,80vw)', height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ width: `${level * 100}%`, height: '100%', background: 'linear-gradient(90deg, rgba(159,201,255,0.8), rgba(255,201,222,0.9))', transition: 'width 80ms linear' }} />
          </motion.div>
        )}
      </div>
    </div>
  )
}

function btn(disabled: boolean): React.CSSProperties {
  return {
    appearance: 'none',
    border: '1px solid rgba(255,255,255,0.14)',
    background: disabled ? 'rgba(255,255,255,0.02)' : 'linear-gradient(180deg, rgba(255,255,255,0.09), transparent)',
    color: '#f7f7f7',
    padding: '8px 16px',
    borderRadius: 999,
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: '-0.01em',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
  }
}
