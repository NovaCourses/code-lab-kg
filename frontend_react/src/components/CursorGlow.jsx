import { useEffect, useRef } from 'react'

const TRAIL_LENGTH = 7

export default function CursorGlow() {
  const glowRef = useRef(null)
  const trailRefs = useRef([])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches

    if (reduceMotion || coarsePointer) return undefined

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const points = Array.from({ length: TRAIL_LENGTH }, () => ({ ...target }))
    let frame = 0

    const onPointerMove = (event) => {
      target.x = event.clientX
      target.y = event.clientY
    }

    const animate = () => {
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`
      }

      points.forEach((point, index) => {
        const leader = index === 0 ? target : points[index - 1]
        point.x += (leader.x - point.x) * (0.28 - index * 0.02)
        point.y += (leader.y - point.y) * (0.28 - index * 0.02)

        const node = trailRefs.current[index]
        if (node) {
          node.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) scale(${1 - index * 0.08})`
          node.style.opacity = `${0.5 - index * 0.055}`
        }
      })

      frame = window.requestAnimationFrame(animate)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    frame = window.requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="cursor-effects" aria-hidden="true">
      <div ref={glowRef} className="cursor-glow" />
      {Array.from({ length: TRAIL_LENGTH }).map((_, index) => (
        <span
          key={index}
          ref={(node) => {
            trailRefs.current[index] = node
          }}
          className="cursor-trail-dot"
        />
      ))}
    </div>
  )
}
