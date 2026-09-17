import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import memeImage from '../images/Pedido de Namoro.jpg'

const FIREWORK_COLORS = ['#ff578b', '#ffd267', '#fff4e8', '#fb8db0', '#ff9d72']

function distanceToRect(x, y, rect) {
  const closestX = Math.max(rect.left, Math.min(x, rect.right))
  const closestY = Math.max(rect.top, Math.min(y, rect.bottom))
  return Math.hypot(x - closestX, y - closestY)
}

function Fireworks({ replay }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) return undefined

    let width = 0
    let height = 0
    let animationFrame = 0
    let launches = 0
    const particles = []

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    function burst(x, y) {
      const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]
      const count = 64
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count + Math.random() * 0.15
        const speed = 1.6 + Math.random() * 3.6
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: 0.010 + Math.random() * 0.012,
          size: 1.4 + Math.random() * 2.3,
          color,
        })
      }
    }

    function launch() {
      if (launches >= 13) return
      launches += 1
      burst(width * (0.16 + Math.random() * 0.68), height * (0.15 + Math.random() * 0.45))
    }

    function draw() {
      context.clearRect(0, 0, width, height)

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index]
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vx *= 0.988
        particle.vy = particle.vy * 0.988 + 0.035
        particle.life -= particle.decay

        if (particle.life <= 0) {
          particles.splice(index, 1)
          continue
        }

        context.globalAlpha = particle.life
        context.fillStyle = particle.color
        context.beginPath()
        context.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2)
        context.fill()
      }

      context.globalAlpha = 1
      if (particles.length || launches < 13) animationFrame = window.requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    launch()
    draw()
    const launchTimer = window.setInterval(() => {
      launch()
      if (launches >= 13) window.clearInterval(launchTimer)
    }, 680)

    return () => {
      window.clearInterval(launchTimer)
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
    }
  }, [replay])

  return <canvas className="fireworks" ref={canvasRef} aria-hidden="true" />
}

function App() {
  const [accepted, setAccepted] = useState(false)
  const [noPosition, setNoPosition] = useState(null)
  const [replay, setReplay] = useState(0)
  const noButtonRef = useRef(null)
  const yesButtonRef = useRef(null)
  const lastDodgeRef = useRef(0)
  const flightStartRef = useRef(null)
  const isFlyingRef = useRef(false)
  const pointerRef = useRef(null)

  const dodge = useCallback((pointerX, pointerY) => {
    const button = noButtonRef.current
    if (!button || Date.now() - lastDodgeRef.current < 90) return

    const rect = button.getBoundingClientRect()
    const width = rect.width || 132
    const height = rect.height || 58
    const margin = 18
    const maxX = Math.max(margin, window.innerWidth - width - margin)
    const maxY = Math.max(margin, window.innerHeight - height - margin)
    const safeDistance = Math.min(260, Math.max(170, Math.min(window.innerWidth, window.innerHeight) * 0.35))
    const yesRect = yesButtonRef.current?.getBoundingClientRect()
    let next = null

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const x = margin + Math.random() * (maxX - margin)
      const y = margin + Math.random() * (maxY - margin)
      const farFromPointer = distanceToRect(pointerX, pointerY, {
        left: x, top: y, right: x + width, bottom: y + height,
      }) > safeDistance
      const farFromOldPlace = Math.hypot(x - rect.left, y - rect.top) > 120
      const clearOfYes = !yesRect || x > yesRect.right + 18 || x + width < yesRect.left - 18 || y > yesRect.bottom + 18 || y + height < yesRect.top - 18

      if (farFromPointer && farFromOldPlace && clearOfYes) {
        next = { x, y }
        break
      }
    }

    if (!next) {
      const x = pointerX < window.innerWidth / 2 ? maxX : margin
      const y = pointerY < window.innerHeight / 2 ? maxY : margin
      next = { x, y }
    }

    lastDodgeRef.current = Date.now()
    flightStartRef.current = { left: rect.left, top: rect.top }
    isFlyingRef.current = true
    setNoPosition(next)
  }, [])

  useLayoutEffect(() => {
    const start = flightStartRef.current
    const button = noButtonRef.current
    if (!start || !button || !noPosition) return undefined
    flightStartRef.current = null

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const end = button.getBoundingClientRect()
    const deltaX = start.left - end.left
    const deltaY = start.top - end.top
    const lift = Math.min(48, Math.max(24, Math.hypot(deltaX, deltaY) * 0.1))

    button.style.pointerEvents = 'none'
    const animation = button.animate(
      reduceMotion ? [
        { transform: `translate(${deltaX}px, ${deltaY}px)` },
        { transform: 'translate(0, 0)' },
      ] : [
        { transform: `translate(${deltaX}px, ${deltaY}px) rotate(-7deg)`, offset: 0 },
        { transform: `translate(${deltaX * 0.48}px, ${deltaY * 0.48 - lift}px) rotate(6deg)`, offset: 0.52 },
        { transform: 'translate(0, 0) rotate(0deg)', offset: 1 },
      ],
      { duration: reduceMotion ? 240 : 760, easing: 'cubic-bezier(0.22, 0.8, 0.2, 1)' },
    )

    let disposed = false
    let watchFrame = 0
    const startedAt = performance.now()
    const watchFlight = (now) => {
      if (disposed) return
      const pointer = pointerRef.current
      if (pointer && now - startedAt > 110 && distanceToRect(pointer.x, pointer.y, button.getBoundingClientRect()) < 170) {
        dodge(pointer.x, pointer.y)
        return
      }
      watchFrame = window.requestAnimationFrame(watchFlight)
    }
    watchFrame = window.requestAnimationFrame(watchFlight)

    const finish = () => {
      if (disposed) return
      window.cancelAnimationFrame(watchFrame)
      isFlyingRef.current = false
      const pointer = pointerRef.current
      if (pointer && distanceToRect(pointer.x, pointer.y, button.getBoundingClientRect()) < 200) {
        dodge(pointer.x, pointer.y)
      } else {
        button.style.pointerEvents = ''
      }
    }
    animation.onfinish = finish
    animation.oncancel = finish

    return () => {
      disposed = true
      window.cancelAnimationFrame(watchFrame)
      animation.cancel()
    }
  }, [noPosition, dodge])

  useEffect(() => {
    if (accepted) return undefined

    function watchPointer(event) {
      if (event.pointerType === 'touch') return
      pointerRef.current = { x: event.clientX, y: event.clientY }
      if (isFlyingRef.current) return
      const rect = noButtonRef.current?.getBoundingClientRect()
      if (!rect) return
      if (distanceToRect(event.clientX, event.clientY, rect) < 200) {
        dodge(event.clientX, event.clientY)
      }
    }

    window.addEventListener('pointermove', watchPointer)
    return () => window.removeEventListener('pointermove', watchPointer)
  }, [accepted, dodge])

  if (accepted) {
    return (
      <main className="page page--accepted">
        <Fireworks replay={replay} />
        <div className="celebration" aria-live="polite">
          <div className="celebration__heart" aria-hidden="true">♥</div>
          <p className="celebration__eyebrow">A MELHOR RESPOSTA DO MUNDO</p>
          <h1>Você disse <span>sim!</span></h1>
          <p className="celebration__message">Você me fez a pessoa mais feliz do mundo. Que comece a nossa história! ❤️</p>
          {/* <button className="replay-button" type="button" onClick={() => setReplay((value) => value + 1)}>
            Ver os fogos de novo <span aria-hidden="true">↗</span>
          </button> */}
        </div>
      </main>
    )
  }

  return (
    <main className="page page--proposal">
      <div className="ambient-heart ambient-heart--one" aria-hidden="true">♡</div>
      <div className="ambient-heart ambient-heart--two" aria-hidden="true">♡</div>

      <div className="site-shell">
        <header className="site-header">
          <span className="site-header__brand"><span aria-hidden="true">♥</span> feito com carinho</span>
          <span className="site-header__note">UMA SURPRESA PARA VOCÊ</span>
        </header>

        <section className="proposal" aria-labelledby="proposal-title">
          <div className="proposal__content">
            <span className="proposal__sparkle" aria-hidden="true">✳</span>
            <p className="proposal__eyebrow">TENHO UMA PERGUNTA IMPORTANTE...</p>
            <h1 id="proposal-title">Quer namorar <em>comigo?</em></h1>
            <p className="proposal__description">Pensa com carinho. O meu coração já sabe a resposta.</p>

            <div className="choices" aria-label="Escolha sua resposta">
              <button
                className="choice choice--yes"
                type="button"
                ref={yesButtonRef}
                onClick={() => setAccepted(true)}
              >
                Sim <span aria-hidden="true">♥</span>
              </button>
              <div className="choice-placeholder">
                <button
                  className={`choice choice--no${noPosition ? ' choice--escaped' : ''}`}
                  type="button"
                  ref={noButtonRef}
                  style={noPosition ? { left: noPosition.x, top: noPosition.y } : undefined}
                  onPointerEnter={(event) => dodge(event.clientX, event.clientY)}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    dodge(event.clientX, event.clientY)
                  }}
                  onFocus={(event) => {
                    dodge(window.innerWidth / 2, window.innerHeight / 2)
                    event.currentTarget.blur()
                  }}
                  onClick={(event) => {
                    event.preventDefault()
                    dodge(event.clientX, event.clientY)
                  }}
                >
                  Não
                </button>
              </div>
            </div>
          </div>

          <div className="proposal__image-area">
            <div className="image-doodle image-doodle--top" aria-hidden="true">♥</div>
            <figure className="meme-frame">
              <img src={memeImage} alt="Gatinho segurando uma rosa e um anel, perguntando se você quer namorar comigo" />
            </figure>
            <div className="image-doodle image-doodle--bottom" aria-hidden="true">✳</div>
          </div>
        </section>

        <footer className="site-footer">♡ uma pergunta, um montão de amor ♡</footer>
      </div>
    </main>
  )
}

export default App
