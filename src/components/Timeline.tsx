import { useRef, useEffect, useCallback } from 'react'
import { useEditorStore } from '../store/editorStore'
import { formatTime } from '../utils/helpers'

export function Timeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
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

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left + scrollX
    const time = x / zoom
    dispatch({ type: 'SET_CURSOR', payload: time })
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-6 cursor-pointer"
      onClick={handleClick}
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
