import { useState, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { applyEffectToSelection, applyGenerate } from '../hooks/useAudioEngine'
import { EffectParamDef } from '../types'

export function EffectDialog() {
  const { activeDialog, aiStatus, dispatch } = useEditorStore()
  const [params, setParams] = useState<Record<string, number>>({})
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (activeDialog) {
      const defaults: Record<string, number> = {}
      for (const p of activeDialog.params) {
        defaults[p.key] = p.defaultValue
      }
      setParams(defaults)
    }
  }, [activeDialog])

  if (!activeDialog) return null

  const handleApply = async () => {
    setIsProcessing(true)
    try {
      if (activeDialog.type === 'effect') {
        await applyEffectToSelection(activeDialog.effectType, params)
      } else {
        await applyGenerate(activeDialog.effectType, params)
      }
      dispatch({ type: 'SET_AI_STATUS', payload: null })
      dispatch({ type: 'SET_ACTIVE_DIALOG', payload: null })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = () => {
    dispatch({ type: 'SET_AI_STATUS', payload: null })
    dispatch({ type: 'SET_ACTIVE_DIALOG', payload: null })
  }

  const isAI = activeDialog.effectType === 'voiceremoval'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={isProcessing ? undefined : handleCancel}>
      <div
        className="bg-surface-300 border border-surface-50/50 rounded-lg shadow-2xl w-[380px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-surface-50/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isAI && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-600/30 text-purple-300 border border-purple-500/30">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI
              </span>
            )}
            <h3 className="text-sm font-semibold text-gray-200">{activeDialog.name}</h3>
          </div>
          {!isProcessing && (
            <button className="text-gray-500 hover:text-gray-300 text-lg leading-none" onClick={handleCancel}>&times;</button>
          )}
        </div>

        {!isProcessing ? (
          <div className="px-4 py-3 space-y-3">
            {activeDialog.params.map((p: EffectParamDef) => (
              <div key={p.key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">{p.label}</label>
                  <span className="text-xs text-gray-500 font-mono">
                    {params[p.key]?.toFixed(p.step < 0.01 ? 3 : p.step < 0.1 ? 2 : 1)}{p.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={params[p.key] ?? p.defaultValue}
                  onChange={e => setParams(prev => ({ ...prev, [p.key]: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-purple-300">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {aiStatus?.phase || 'Processing...'}
            </div>
            <div className="w-full bg-surface-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-300 rounded-full"
                style={{ width: `${aiStatus?.percent ?? 0}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 text-right">{aiStatus?.percent ?? 0}%</div>
          </div>
        )}

        {!isProcessing && (
          <div className="px-4 py-3 border-t border-surface-50/30 flex items-center justify-end gap-2">
            <button className="btn-secondary text-xs" onClick={handleCancel}>Cancel</button>
            <button className={`btn-primary text-xs ${isAI ? 'bg-purple-600 hover:bg-purple-500' : ''}`} onClick={handleApply}>
              {isAI ? 'AI Process' : 'Apply'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
