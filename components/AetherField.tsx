'use client'

import { useEffect, useRef, useState } from 'react'

const vertexShader = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const fragmentShader = `
  precision mediump float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec2 u_mouse;
  uniform float u_presence;
  uniform float u_density;
  uniform float u_pulse;

  // Smooth noise function
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  float smoothNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    
    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float field(vec2 p) {
    float t = u_time * 0.1;
    float scale = 2.0;
    
    // Base interference pattern
    float n1 = smoothNoise(p * scale + vec2(t * 0.3, t * 0.2));
    float n2 = smoothNoise(p * scale * 1.5 - vec2(t * 0.2, t * 0.3));
    float interference = abs(n1 - n2);
    
    // Standing wave pattern
    float wave = sin(length(p - vec2(0.5)) * 8.0 - t * 2.0) * 0.5 + 0.5;
    
    // Combine patterns
    float field = interference * 0.6 + wave * 0.4;
    
    // Mouse influence (always active, subtle disturbance)
    vec2 mouseNorm = vec2(u_mouse.x / u_resolution.x, 1.0 - u_mouse.y / u_resolution.y);
    float dist = length(p - mouseNorm);
    float baseInfluence = exp(-dist * 6.0) * 0.15;
    float presenceInfluence = exp(-dist * 8.0) * u_presence * 0.3;
    field += baseInfluence + presenceInfluence;
    
    // Density modulation
    field *= (0.7 + u_density * 0.3);
    
    return field;
  }

  // Aurora color palette - wide spectrum with many colors
  vec3 auroraColor(float intensity) {
    // Create a spectrum that shifts through aurora colors
    float hue = intensity * 3.0 + u_time * 0.05 + length(gl_FragCoord.xy / u_resolution.xy - vec2(0.5)) * 0.5;
    
    // Expanded aurora colors: full spectrum
    vec3 color1 = vec3(0.0, 1.0, 0.8);   // Bright cyan
    vec3 color2 = vec3(0.0, 1.0, 0.5);   // Emerald green
    vec3 color3 = vec3(0.3, 1.0, 0.4);   // Lime green
    vec3 color4 = vec3(0.6, 1.0, 0.3);   // Yellow-green
    vec3 color5 = vec3(1.0, 0.9, 0.2);   // Yellow
    vec3 color6 = vec3(1.0, 0.6, 0.1);   // Orange
    vec3 color7 = vec3(1.0, 0.3, 0.5);   // Pink-red
    vec3 color8 = vec3(1.0, 0.2, 0.8);   // Magenta
    vec3 color9 = vec3(0.8, 0.2, 1.0);   // Purple
    vec3 color10 = vec3(0.4, 0.3, 1.0);  // Indigo
    vec3 color11 = vec3(0.2, 0.5, 1.0);  // Blue
    vec3 color12 = vec3(0.0, 0.7, 1.0);  // Sky blue
    
    // Cycle through colors based on position and time
    float phase = fract(hue);
    
    vec3 color;
    if (phase < 0.083) {
      color = mix(color1, color2, phase * 12.0);
    } else if (phase < 0.166) {
      color = mix(color2, color3, (phase - 0.083) * 12.0);
    } else if (phase < 0.25) {
      color = mix(color3, color4, (phase - 0.166) * 12.0);
    } else if (phase < 0.333) {
      color = mix(color4, color5, (phase - 0.25) * 12.0);
    } else if (phase < 0.416) {
      color = mix(color5, color6, (phase - 0.333) * 12.0);
    } else if (phase < 0.5) {
      color = mix(color6, color7, (phase - 0.416) * 12.0);
    } else if (phase < 0.583) {
      color = mix(color7, color8, (phase - 0.5) * 12.0);
    } else if (phase < 0.666) {
      color = mix(color8, color9, (phase - 0.583) * 12.0);
    } else if (phase < 0.75) {
      color = mix(color9, color10, (phase - 0.666) * 12.0);
    } else if (phase < 0.833) {
      color = mix(color10, color11, (phase - 0.75) * 12.0);
    } else if (phase < 0.916) {
      color = mix(color11, color12, (phase - 0.833) * 12.0);
    } else {
      color = mix(color12, color1, (phase - 0.916) * 12.0);
    }
    
    return color;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec2 p = uv;
    
    float f = field(p);
    
    // Pure black background
    vec3 color = vec3(0.0, 0.0, 0.0);
    
    // Aurora energy with wide spectrum
    // Subtle pulse increases intensity momentarily (1.0 to 1.15 - 15% increase)
    float baseIntensity = pow(f, 1.2) * 0.6;
    float intensity = baseIntensity * (1.0 + u_pulse * 0.15);
    vec3 aurora = auroraColor(f + length(p - vec2(0.5)) * 0.5);
    
    // Blend aurora colors based on intensity
    color = mix(color, aurora, intensity);
    
    gl_FragColor = vec4(color, 1.0);
  }
`

interface AetherFieldProps {
  onPresenceChange?: (presence: number) => void
}

export default function AetherField({ onPresenceChange }: AetherFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [presence, setPresence] = useState(0)
  const [density, setDensity] = useState(0.5)
  const mouseRef = useRef({ x: 0, y: 0 })
  const animationFrameRef = useRef<number>()
  const timeRef = useRef(0)
  const decayTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Notify parent of presence changes
  useEffect(() => {
    onPresenceChange?.(presence)
  }, [presence, onPresenceChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl')
    if (!gl) return

    // Create shader
    function createShader(
      gl: WebGLRenderingContext,
      type: number,
      source: string
    ): WebGLShader | null {
      const shader = gl.createShader(type)
      if (!shader) return null
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader))
        gl.deleteShader(shader)
        return null
      }
      return shader
    }

    // Create program
    const vertex = createShader(gl, gl.VERTEX_SHADER, vertexShader)
    const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentShader)
    if (!vertex || !fragment) return

    const program = gl.createProgram()
    if (!program) return

    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program))
      return
    }

    // Setup geometry
    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    )

    const positionLocation = gl.getAttribLocation(program, 'a_position')
    const timeLocation = gl.getUniformLocation(program, 'u_time')
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
    const mouseLocation = gl.getUniformLocation(program, 'u_mouse')
    const presenceLocation = gl.getUniformLocation(program, 'u_presence')
    const densityLocation = gl.getUniformLocation(program, 'u_density')
    const pulseLocation = gl.getUniformLocation(program, 'u_pulse')

    function resize() {
      if (!canvas || !gl) return
      const dpr = window.devicePixelRatio || 1
      const displayWidth = canvas.clientWidth
      const displayHeight = canvas.clientHeight
      canvas.width = displayWidth * dpr
      canvas.height = displayHeight * dpr
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    resize()
    window.addEventListener('resize', resize)

    function render() {
      if (!gl || !canvas) return
      
      timeRef.current += 0.016 // ~60fps

      // Calculate pulse using resonant frequencies
      // Base: Schumann resonance divided down (7.83 Hz / 10 = 0.783 Hz)
      // Associated with grounding, connection, Earth's natural frequency
      // With presence: speeds up toward alpha wave range (8-13 Hz / 10 = 0.8-1.3 Hz)
      // Alpha waves: relaxed awareness, calm focus, creative flow
      const schumannResonance = 7.83 / 10 // 0.783 Hz - grounding, connection
      const alphaWaveMin = 8 / 10 // 0.8 Hz - relaxed awareness
      const alphaWaveMax = 13 / 10 // 1.3 Hz - creative flow
      
      const baseFrequency = schumannResonance
      const maxFrequency = alphaWaveMax
      const pulseFrequency = baseFrequency + presence * (maxFrequency - baseFrequency)
      
      // Use a smoother pulse envelope (sine wave, only positive values)
      const pulse = Math.max(0, Math.sin(timeRef.current * pulseFrequency * Math.PI * 2))

      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

      gl.uniform1f(timeLocation, timeRef.current)
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
      gl.uniform2f(mouseLocation, mouseRef.current.x, mouseRef.current.y)
      gl.uniform1f(presenceLocation, presence)
      gl.uniform1f(densityLocation, density)
      gl.uniform1f(pulseLocation, pulse)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [presence, density])

  // Mouse/touch interaction
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      
      if ('touches' in e) {
        if (e.touches.length > 0) {
          mouseRef.current = {
            x: (e.touches[0].clientX - rect.left) * dpr,
            y: (e.touches[0].clientY - rect.top) * dpr,
          }
        }
      } else {
        mouseRef.current = {
          x: (e.clientX - rect.left) * dpr,
          y: (e.clientY - rect.top) * dpr,
        }
      }
    }

    const handlePress = () => {
      // Cancel any ongoing decay
      if (decayTimerRef.current) {
        clearTimeout(decayTimerRef.current)
        decayTimerRef.current = null
      }
      setPresence(1)
    }

    const handleRelease = () => {
      // Slow decay
      const decay = () => {
        setPresence((prev) => {
          const next = prev * 0.95
          if (next > 0.01) {
            decayTimerRef.current = setTimeout(decay, 16)
          } else {
            decayTimerRef.current = null
          }
          return next <= 0.01 ? 0 : next
        })
      }
      decayTimerRef.current = setTimeout(decay, 16)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('touchmove', handleMove)
    window.addEventListener('mousedown', handlePress)
    window.addEventListener('mouseup', handleRelease)
    window.addEventListener('touchstart', handlePress)
    window.addEventListener('touchend', handleRelease)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('mousedown', handlePress)
      window.removeEventListener('mouseup', handleRelease)
      window.removeEventListener('touchstart', handlePress)
      window.removeEventListener('touchend', handleRelease)
      if (decayTimerRef.current) {
        clearTimeout(decayTimerRef.current)
        decayTimerRef.current = null
      }
    }
  }, [])

  // Subtle density variation over time
  useEffect(() => {
    const interval = setInterval(() => {
      setDensity((prev) => {
        const target = 0.5 + Math.sin(Date.now() * 0.0001) * 0.1
        return prev * 0.99 + target * 0.01
      })
    }, 100)

    return () => clearInterval(interval)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        cursor: 'none',
      }}
    />
  )
}
