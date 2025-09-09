import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

type AudioContextValue = {
  isEnabled: boolean
  toggleEnabled: () => void
  playSnap: () => void
  volume: number
  setVolume: (v: number) => void
}

const AudioCtx = createContext<AudioContextValue | null>(null)

function createAmbientVoices(ctx: AudioContext, destination: AudioNode) {
  // Bus and ducking for sidechain-like effect
  const bus = ctx.createGain()
  bus.gain.value = 1
  bus.connect(destination)

  // Vinyl noise (very subtle)
  const vinylGain = ctx.createGain()
  vinylGain.gain.value = 0.03
  vinylGain.connect(bus)
  const vinylBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const vb = vinylBuffer.getChannelData(0)
  for (let i = 0; i < vb.length; i++) {
    vb[i] = (Math.random() * 2 - 1) * 0.02
  }
  const vinylSrc = ctx.createBufferSource()
  vinylSrc.buffer = vinylBuffer
  vinylSrc.loop = true
  const vinylHp = ctx.createBiquadFilter()
  vinylHp.type = 'highpass'
  vinylHp.frequency.value = 120
  const vinylLp = ctx.createBiquadFilter()
  vinylLp.type = 'lowpass'
  vinylLp.frequency.value = 3500
  vinylSrc.connect(vinylHp)
  vinylHp.connect(vinylLp)
  vinylLp.connect(vinylGain)
  try { vinylSrc.start() } catch {}

  // Pad chain with ducking
  const duckGain = ctx.createGain()
  duckGain.gain.value = 1
  duckGain.connect(bus)

  const padLp = ctx.createBiquadFilter()
  padLp.type = 'lowpass'
  padLp.frequency.value = 1400
  padLp.Q.value = 0.6
  padLp.connect(duckGain)

  const delay = ctx.createDelay(1.5)
  delay.delayTime.value = 0.32
  const feedback = ctx.createGain()
  feedback.gain.value = 0.22
  delay.connect(feedback)
  feedback.connect(delay)
  delay.connect(padLp)

  // Gentle cutoff wobble for lo-fi movement
  const cutoffLfo = ctx.createOscillator()
  cutoffLfo.type = 'sine'
  cutoffLfo.frequency.value = 0.08
  const cutoffAmount = ctx.createGain()
  cutoffAmount.gain.value = 200
  cutoffLfo.connect(cutoffAmount)
  cutoffAmount.connect(padLp.frequency)
  cutoffLfo.start()

  // Chord pad: soft saws detuned, filtered
  const freqs = [261.63, 329.63, 392.0, 440.0, 523.25]
  const voices: { osc: OscillatorNode; gain: GainNode }[] = []
  for (let i = 0; i < freqs.length; i++) {
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freqs[i] * (1 + (Math.random() - 0.5) * 0.015)
    const gain = ctx.createGain()
    gain.gain.value = 0
    osc.connect(gain)
    gain.connect(delay)
    osc.start()
    const now = ctx.currentTime
    gain.gain.linearRampToValueAtTime(0.12, now + 4 + i * 1.2)
    voices.push({ osc, gain })
  }

  // Drum machine (simple lo-fi beat)
  const drumGain = ctx.createGain()
  drumGain.gain.value = 0.25
  drumGain.connect(bus)

  const bpm = 72
  const spb = 60 / bpm // seconds per beat (quarter)
  const sixteenth = spb / 4
  const lookaheadMs = 25
  const scheduleWindow = 0.1 // seconds

  const patternLen = 16
  const kickPattern = [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]
  const snarePattern = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
  const hatPattern = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1]

  const stepRef = { value: 0 }
  const nextNoteTimeRef = { value: ctx.currentTime + 0.05 }
  let timerId: number | null = null

  function duckAt(time: number) {
    try {
      duckGain.gain.cancelScheduledValues(time)
      duckGain.gain.setValueAtTime(0.78, time)
      duckGain.gain.linearRampToValueAtTime(1.0, time + 0.35)
    } catch {}
  }

  function scheduleKick(time: number) {
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(120, time)
    osc.frequency.exponentialRampToValueAtTime(50, time + 0.12)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.38, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18)
    osc.connect(gain)
    gain.connect(drumGain)
    osc.start(time)
    osc.stop(time + 0.2)
    duckAt(time)
  }

  function scheduleSnare(time: number) {
    const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
    const src = ctx.createBufferSource()
    src.buffer = noiseBuf
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1800
    bp.Q.value = 0.8
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.22, time)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.12)
    src.connect(bp)
    bp.connect(g)
    g.connect(drumGain)
    src.start(time)
    src.stop(time + 0.2)
  }

  function scheduleHat(time: number) {
    const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1)
    const src = ctx.createBufferSource()
    src.buffer = noiseBuf
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 6000
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.12, time)
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.06)
    src.connect(hp)
    hp.connect(g)
    g.connect(drumGain)
    src.start(time)
    src.stop(time + 0.08)
  }

  function scheduler() {
    const now = ctx.currentTime
    while (nextNoteTimeRef.value < now + scheduleWindow) {
      const step = stepRef.value % patternLen
      const t = nextNoteTimeRef.value
      if (kickPattern[step]) scheduleKick(t)
      if (snarePattern[step]) scheduleSnare(t)
      if (hatPattern[step]) scheduleHat(t)
      stepRef.value++
      nextNoteTimeRef.value += sixteenth
    }
  }

  function start() {
    if (timerId !== null) return
    timerId = window.setInterval(scheduler, lookaheadMs) as unknown as number
  }

  function stop() {
    if (timerId !== null) {
      window.clearInterval(timerId)
    }
    const now = ctx.currentTime
    for (const v of voices) {
      try {
        v.gain.gain.cancelScheduledValues(now)
        v.gain.gain.linearRampToValueAtTime(0, now + 0.6)
      } catch {}
      try { v.osc.stop(now + 0.8) } catch {}
    }
    try { cutoffLfo.stop(now + 0.8) } catch {}
    try { vinylSrc.stop(now + 0.5) } catch {}
  }

  return { start, stop }
}

function playSnapSfx(ctx: AudioContext, destination: AudioNode) {
  const now = ctx.currentTime

  // Single aesthetic click: very short filtered noise burst with quick envelope
  const dur = 0.045
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
  const ch = buf.getChannelData(0)
  for (let i = 0; i < ch.length; i++) {
    // Emphasize transient, soft tail
    const t = i / ch.length
    ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6)
  }
  const src = ctx.createBufferSource()
  src.buffer = buf

  const hp = ctx.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 900

  const bp = ctx.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2200
  bp.Q.value = 1.1

  const lp = ctx.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 5500

  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0, now)
  g.gain.linearRampToValueAtTime(0.16, now + 0.001)
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur)

  src.connect(hp)
  hp.connect(bp)
  bp.connect(lp)
  lp.connect(g)
  g.connect(destination)

  src.start(now)
  src.stop(now + dur)
}

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false)
  const audioRef = useRef<AudioContext | null>(null)
  const ambientRef = useRef<ReturnType<typeof createAmbientVoices> | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const musicGainRef = useRef<GainNode | null>(null)
  const [volume, _setVolume] = useState<number>(0.7)
  const volumeRef = useRef<number>(0.7)

  const ensureContext = useCallback(async () => {
    if (!audioRef.current) {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!Ctx) return null
      const ctx: AudioContext = new Ctx()
      audioRef.current = ctx
    }
    const ctx = audioRef.current!
    if (ctx.state === 'suspended') {
      try { await ctx.resume() } catch {}
    }
    if (!masterGainRef.current) {
      const mg = ctx.createGain()
      mg.gain.value = volumeRef.current
      mg.connect(ctx.destination)
      masterGainRef.current = mg
    }
    if (!musicGainRef.current) {
      const mus = ctx.createGain()
      // Cap background (music) to 10% of previous level
      mus.gain.value = 0.1
      mus.connect(masterGainRef.current!)
      musicGainRef.current = mus
    }
    return ctx
  }, [])

  const startAmbient = useCallback(async () => {
    const ctx = await ensureContext()
    if (!ctx) return
    ambientRef.current?.stop()
    const dest = musicGainRef.current || masterGainRef.current || ctx.destination
    ambientRef.current = createAmbientVoices(ctx, dest)
    ambientRef.current.start()
  }, [ensureContext])

  const stopAmbient = useCallback(() => {
    ambientRef.current?.stop()
    ambientRef.current = null
  }, [])

  const toggleEnabled = useCallback(() => {
    setIsEnabled(prev => !prev)
  }, [])

  useEffect(() => {
    let cancelled = false
    if (isEnabled) {
      startAmbient()
    } else {
      stopAmbient()
      // Optionally suspend the context to save battery
      const ctx = audioRef.current
      if (ctx && ctx.state !== 'suspended') {
        ctx.suspend().catch(() => {})
      }
    }
    return () => { cancelled = true; void cancelled }
  }, [isEnabled, startAmbient, stopAmbient])

  const playSnap = useCallback(async () => {
    const ctx = await ensureContext()
    if (!ctx) return
    if (ctx.state === 'suspended') {
      try { await ctx.resume() } catch {}
    }
    const dest = masterGainRef.current || ctx.destination
    playSnapSfx(ctx, dest)
  }, [ensureContext])

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    volumeRef.current = clamped
    _setVolume(clamped)
    const mg = masterGainRef.current
    const ctx = audioRef.current
    if (mg && ctx) {
      try {
        const now = ctx.currentTime
        mg.gain.cancelScheduledValues(now)
        mg.gain.linearRampToValueAtTime(clamped, now + 0.08)
      } catch {}
    }
  }, [])

  const value = useMemo<AudioContextValue>(() => ({ isEnabled, toggleEnabled, playSnap, volume, setVolume }), [isEnabled, toggleEnabled, playSnap, volume, setVolume])

  // Initialize the AudioContext at first user interaction to satisfy autoplay policies
  useEffect(() => {
    function prime() {
      ensureContext()
      window.removeEventListener('pointerdown', prime)
      window.removeEventListener('touchstart', prime)
    }
    window.addEventListener('pointerdown', prime, { passive: true })
    window.addEventListener('touchstart', prime, { passive: true })
    return () => {
      window.removeEventListener('pointerdown', prime)
      window.removeEventListener('touchstart', prime)
    }
  }, [ensureContext])

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>
}

export function useAudio(): AudioContextValue {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudio must be used within AudioProvider')
  return ctx
}


