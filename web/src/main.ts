const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const startBtn = document.getElementById('start')!;
const stopBtn = document.getElementById('stop')!;
const clearBtn = document.getElementById('clear')!;
const transcriptEl = document.getElementById('transcript')!;

let recognition: any;
let stream: MediaStream | null = null;
let running = false;

function clear() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
}

async function parse(text: string) {
  try {
    const res = await fetch('http://localhost:8000/api/parse', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({text})
    });
    return await res.json();
  } catch(e) { return null; }
}

function drawStroke(cmd: any) {
  const x = canvas.width/2 + (Math.random()-0.5)*100;
  const y = canvas.height/2 + (Math.random()-0.5)*100;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = cmd.color || 'skyblue';
  ctx.lineWidth = cmd.size || 8;
  ctx.beginPath();
  if (cmd.shape === 'circle') {
    ctx.arc(x,y,cmd.size||8,0,Math.PI*2);
    ctx.stroke();
  } else if (cmd.shape === 'spiral') {
    for (let i=0;i<30;i++) {
      const ang=i*0.5; const r=i*2;
      ctx.lineTo(x+Math.cos(ang)*r, y+Math.sin(ang)*r);
    }
    ctx.stroke();
  } else {
    ctx.moveTo(x,y);
    ctx.bezierCurveTo(x+40,y-40,x+80,y+40,x+120,y);
    ctx.stroke();
  }
  ctx.restore();
}

startBtn.onclick = async () => {
  if (running) return;
  const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  if (!SR) { alert('SpeechRecognition not supported'); return; }
  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.onresult = async (e: any) => {
    let final = '';
    for (let i=e.resultIndex; i<e.results.length; i++) {
      if (e.results[i].isFinal) final += e.results[i][0].transcript;
    }
    if (final.trim()) {
      transcriptEl.textContent = final;
      const cmd = await parse(final);
      if (cmd) drawStroke(cmd);
    }
  };
  recognition.start();
  running = true;
};

stopBtn.onclick = () => { if (recognition) recognition.stop(); running=false; };
clearBtn.onclick = clear;
