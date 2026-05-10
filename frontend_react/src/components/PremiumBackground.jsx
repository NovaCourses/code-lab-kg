import { useEffect, useMemo, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import { useAppContext } from '../contexts'

export default function PremiumBackground() {
  const { theme } = useAppContext()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true

    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => {
      if (mounted) setReady(true)
    })

    return () => {
      mounted = false
    }
  }, [])

  const options = useMemo(() => {
    const isLight = theme === 'light'

    return ({
      fullScreen: false,
      background: {
        color: 'transparent',
      },
      fpsLimit: 60,
      detectRetina: true,
      interactivity: {
        events: {
          onHover: {
            enable: true,
            mode: 'grab',
          },
          onClick: {
            enable: true,
            mode: 'push',
          },
          resize: {
            enable: true,
          },
        },
        modes: {
          grab: {
            distance: 180,
            links: {
              opacity: 0.32,
            },
          },
          push: {
            quantity: 2,
          },
        },
      },
      particles: {
        color: {
          value: isLight
            ? ['#2563eb', '#7c3aed', '#0891b2', '#0f172a']
            : ['#2fd0c1', '#62a8ff', '#a78bfa', '#ffffff'],
        },
        links: {
          color: isLight ? '#2563eb' : '#62a8ff',
          distance: 150,
          enable: true,
          opacity: isLight ? 0.24 : 0.13,
          width: 1,
        },
        move: {
          direction: 'none',
          enable: true,
          outModes: {
            default: 'out',
          },
          random: true,
          speed: 0.55,
          straight: false,
        },
        number: {
          density: {
            enable: true,
            area: 950,
          },
          value: 80,
        },
        opacity: {
          value: {
            min: isLight ? 0.18 : 0.12,
            max: isLight ? 0.72 : 0.55,
          },
          animation: {
            enable: true,
            speed: 0.75,
            sync: false,
          },
        },
        shape: {
          type: 'circle',
        },
        size: {
          value: {
            min: 1,
            max: 3.5,
          },
          animation: {
            enable: true,
            speed: 2,
            sync: false,
          },
        },
      },
    })
  }, [theme])

  return (
    <div className="premium-background" aria-hidden="true">
      <div className="premium-gradient premium-gradient-a" />
      <div className="premium-gradient premium-gradient-b" />
      <div className="premium-gradient premium-gradient-c" />
      <div className="premium-grid-overlay" />
      {ready && <Particles id="nova-particles" className="particles-canvas" options={options} />}
    </div>
  )
}
