'use client'

import AetherField from '@/components/AetherField'
import { useEffect, useState } from 'react'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <main
      style={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <AetherField />
      <div
        style={{
          position: 'absolute',
          bottom: '3rem',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          fontSize: '0.875rem',
          letterSpacing: '0.1em',
          opacity: 0.4,
          fontWeight: 300,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div style={{ marginBottom: '0.5rem' }}>ÆTHERFIELD</div>
        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>field state</div>
      </div>
    </main>
  )
}
