import { useEffect, useRef, useState } from 'react'

type Pt = { x: number; y: number }
type Trail = { pts: Pt[]; color: string; w: number; born: number; life: number }

export default function App() {
  const cRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const acRef = useRef<AudioContext | null>(null)
  const anRef = useRef<AnalyserNode | null>(null)
  const tdRef = useRef<Uint8Array | null>(null)
  const fdRef = useRef<Uint8Array | null>(null)
  const rafRef = useRef<number | null>(null)
  const trailsRef = useRef<Trail[]>([])
  const posRef = useRef({ x: 0, y: 0 })
  const hueRef = useRef(180)
  const [on, setOn] = useState(false)
  const [err, setErr] = useState('')
  const [lvl, setLvl] = useState(0)

  useEffect(() => {
    const c = cRef.current!
    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const w = window.innerWidth, h = window.innerHeight
      c.width = w * dpr; c.height = h * dpr
      c.style.width = w + 'px'; c.style.height = h + 'px'
      const ctx = c.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctxRef.current = ctx
      posRef.current = { x: w/2, y: h/2 }
    }
    resize()
    window.addEventListener('resize', resize)
    const loop = () => {
      draw()
      if (on) mic()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      stop()
    }
  }, [on])

  async function start() {
    try {
      setErr('')
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false })
      streamRef.current = s
      const ac = new (window.AudioContext || (window as any).webkitAudioContext)()
      acRef.current = ac
      await ac.resume()
      const src = ac.createMediaStreamSource(s)
      const an = ac.createAnalyser()
      an.fftSize = 256
      an.smoothingTimeConstant = 0.7
      src.connect(an)
      anRef.current = an
      tdRef.current = new Uint8Array(an.fftSize)
      fdRef.current = new Uint8Array(an.frequencyBinCount)
      setOn(true)
    } catch (e: any) {
      setErr(e.message || 'mic failed')
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach(t=>t.stop())
    acRef.current?.close()
    streamRef.current = null; acRef.current = null; anRef.current = null; tdRef.current = null; fdRef.current = null
    setOn(false); setLvl(0)
  }

  function mic() {
    const an = anRef.current, td = tdRef.current, fd = fdRef.current
    if (!an || !td || !fd) return
    an.getByteTimeDomainData(td)
    let rms = 0
    for (let i=0;i<td.length;i++) { const v=(td[i]-128)/128; rms+=v*v }
    rms = Math.sqrt(rms/td.length)
    const amp = Math.min(1.4, rms*3.8)
    setLvl(amp)
    an.getByteFrequencyData(fd)
    let low=0,mid=0,high=0
    const n=fd.length
    for (let i=0;i<n*0.12;i++) low+=fd[i]
    for (let i=Math.floor(n*0.12); i<n*0.4;i++) mid+=fd[i]
    for (let i=Math.floor(n*0.4); i<n;i++) high+=fd[i]
    low/=n*0.12; mid/=n*0.28; high/=n*0.6

    const c=cRef.current!
    const w=c.clientWidth,h=c.clientHeight
    const tx = w/2 + (mid-128)/128*w*0.36
    const ty = h/2 + (high-128)/128*h*0.3
    const dx=tx-posRef.current.x, dy=ty-posRef.current.y
    posRef.current.x += dx*0.28; posRef.current.y += dy*0.28
    hueRef.current += amp*36 + low*0.16

    if (amp>0.06) {
      const trail: Trail = {
        pts: Array(8).fill(0).map((_,i)=>{
          const a=i*Math.PI*2/8 + Date.now()*0.0004
          return { x: posRef.current.x + Math.cos(a)*amp*16, y: posRef.current.y + Math.sin(a)*amp*16 }
        }),
        color: `hsl(${((hueRef.current%360)+360)%360}, ${92-amp*22}%, ${64+amp*18}%)`,
        w: 2 + amp*20,
        born: performance.now(),
        life: 800 + amp*700
      }
      trailsRef.current.push(trail)
      if (trailsRef.current.length>380) trailsRef.current=trailsRef.current.slice(-300)
    }
  }

  function draw() {
    const ctx=ctxRef.current, c=cRef.current
    if (!ctx||!c) return
    ctx.fillStyle='rgba(3,3,6,0.22)'
    ctx.fillRect(0,0,c.clientWidth,c.clientHeight)
    const now=performance.now()
    trailsRef.current = trailsRef.current.filter(t=>now-t.born<t.life)
    ctx.globalCompositeOperation='lighter'
    for (const t of trailsRef.current) {
      const a=(1-(now-t.born)/t.life)*1.0
      if (a<=0) continue
      ctx.save()
      ctx.globalAlpha=a
      ctx.strokeStyle=t.color
      ctx.lineWidth=t.w*(1-(now-t.born)/t.life)
      ctx.shadowBlur=t.w*2.6
      ctx.shadowColor=t.color
      ctx.beginPath()
      ctx.moveTo(t.pts[0].x,t.pts[0].y)
      for (let i=1;i<t.pts.length;i++) {
        const p=t.pts[i], pr=t.pts[i-1]
        const cx=(pr.x+p.x)/2, cy=(pr.y+p.y)/2
        ctx.quadraticCurveTo(pr.x,pr.y,cx,cy)
      }
      ctx.stroke()
      ctx.restore()
    }
    ctx.globalCompositeOperation='source-over'
  }

  return (
    <div style={{position:'fixed',inset:0,background:'#030306'}}>
      <canvas ref={cRef}/>
      <div style={{position:'absolute',top:16,left:0,right:0,textAlign:'center',color:'#fff',pointerEvents:'none'}}>
        <h1 style={{margin:0,fontSize:'clamp(28px,6vw,68px)',letterSpacing:'-.05em',fontWeight:900}}>Soundbrush</h1>
        <p style={{margin:'6px 0 0',opacity:.75,fontSize:'clamp(12px,2vw,16px)'}}>Let sound paint beautiful art.</p>
        <div style={{marginTop:10,pointerEvents:'auto',display:'flex',gap:10,justifyContent:'center'}}>
          <button onClick={on?stop:start} style={btn}>{on?'Stop':'Start mic'}</button>
          <button onClick={()=>trailsRef.current=[]} style={btn}>Clear</button>
        </div>
        {err&&<div style={{color:'#ff4d4d',marginTop:8,fontSize:11}}>{err}</div>}
        {on&&<div style={{width:'min(340px,68vw)',height:3,borderRadius:999,background:'rgba(255,255,255,.1)',margin:'10px auto',overflow:'hidden'}}>
          <div style={{height:'100%',width:`${Math.min(100,lvl*100)}%`,background:'linear-gradient(90deg,#7fa9ff,#ffc9de,#7cffd6)'}}/>
        </div>}
      </div>
    </div>
  )
}
function btn(s:any){return{border:'1px solid rgba(255,255,255,.18)',background:'linear-gradient(180deg,rgba(255,255,255,.12),transparent)',color:'#fff',padding:'8px 14px',borderRadius:999,fontWeight:700,fontSize:12,backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)'}}
