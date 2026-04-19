'use client'

import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('splashShown')) return
    setVisible(true)
    const fadeTimer = setTimeout(() => setFading(true), 2000)
    const hideTimer = setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem('splashShown', '1')
    }, 2600)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#FF5A5F',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.6s ease',
        pointerEvents: fading ? 'none' : 'all',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-playfair)',
          fontSize: '72px',
          fontWeight: 900,
          color: '#ffffff',
          letterSpacing: '-2px',
        }}
      >
        wiw
      </span>
    </div>
  )
}
