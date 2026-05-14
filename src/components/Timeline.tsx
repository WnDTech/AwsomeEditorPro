import { useRef, useEffect, useCallback } from 'react'
import { useEditorStore } from '../store/editorStore'
import { formatTime } from '../utils/helpers'

export function Timeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isScrubbing = useRef(false)
  const { duration, zoom, scrollX, dispatch, markers } = useEditorStore()

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const w = rect.width
    const h = rect.height

    ctx.fillStyle = '#14161c'
    ctx.fillRect(0, 0, w, h)

    const pixelsPerSecond = zoom
    const startTime = scrollX / pixelsPerSecond
    const endTime = startTime + w / pixelsPerSecond
    const effectiveEnd = Math.max(endTime, duration)

    const gridInterval = getGridInterval(pixelsPerSecond)

    const startTick = Math.floor(startTime / gridInterval) * gridInterval
    const endTick = effectiveEnd + gridInterval

    ctx.font = '10px "Segoe UI", system-ui, sans-serif'
    ctx.textAlign = 'center'

    for (let t = startTick; t <= endTick; t += gridInterval) {
      const x = t * pixelsPerSecond - scrollX
      if (x < -50 || x > w + 50) continue

      ctx.strokeStyle = '#2a2d35'
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()

      ctx.fillStyle = '#6b7280'
      ctx.fillText(formatTime(t), x, 12)

      const subInterval = gridInterval / 4
      for (let s = 1; s < 4; s++) {
        const subX = (t + s * subInterval) * pixelsPerSecond - scrollX
        if (subX < 0 || subX > w) continue
        ctx.strokeStyle = '#1e2028'
        ctx.beginPath()
        ctx.moveTo(subX, 0)
        ctx.lineTo(subX, h)
        ctx.stroke()
      }
    }

    for (const marker of markers) {
      const mx = marker.position * pixelsPerSecond - scrollX
      if (mx < -10 || mx > w + 10) continue
      ctx.fillStyle = marker.color
      ctx.beginPath()
      ctx.moveTo(mx, 0)
      ctx.lineTo(mx - 4, 0)
      ctx.lineTo(mx, 6)
      ctx.lineTo(mx + 4, 0)
      ctx.closePath()
      ctx.fill()
    }

    ctx.strokeStyle = '#3a3d45'
    ctx.beginPath()
    ctx.moveTo(0, h - 1)
    ctx.lineTo(w, h - 1)
    ctx.stroke()
  }, [duration, zoom, scrollX, markers])

  useEffect(() => {
    draw()
    const observer = new ResizeObserver(draw)
    if (canvasRef.current) observer.observe(canvasRef.current)
    return () => observer.disconnect()
  }, [draw])

  const getTimeFromEvent = (e: React.MouseEvent): number => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return 0
    const x = e.clientX - rect.left + scrollX
    return Math.max(0, x / zoom)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    isScrubbing.current = true
    const time = getTimeFromEvent(e)
    dispatch({ type: 'SET_CURSOR', payload: time })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isScrubbing.current) return
    const time = getTimeFromEvent(e)
    dispatch({ type: 'SET_CURSOR', payload: time })
  }

  const handleMouseUp = () => {
    isScrubbing.current = false
  }

  useEffect(() => {
    const handleGlobalMouseUp = () => { isScrubbing.current = false }
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const state = useEditorStore.getState()
      if (e.ctrlKey || e.metaKey) {
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1
        const newZoom = Math.min(500, Math.max(20, Math.round(state.zoom * zoomDelta)))
        state.dispatch({ type: 'SET_ZOOM', payload: newZoom })
      } else {
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
        const newScrollX = Math.max(0, state.scrollX + delta)
        state.dispatch({ type: 'SET_SCROLL', payload: { x: newScrollX } })
      }
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-6 cursor-pointer"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    />
  )
}

function getGridInterval(pixelsPerSecond: number): number {
  const minPixelGap = 60
  const intervals = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 30, 60]
  for (const interval of intervals) {
    if (interval * pixelsPerSecond >= minPixelGap) return interval
  }
  return 60
}
