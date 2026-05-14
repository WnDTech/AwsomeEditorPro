import { useState, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { applyEffectToSelection, applyGenerate } from '../hooks/useAudioEngine'
import { EffectParamDef } from '../types'

export function EffectDialog() {
  const { activeDialog, dispatch } = useEditorStore()
  const [params, setParams] = useState<Record<string, number>>({})

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
    if (activeDialog.type === 'effect') {
      await applyEffectToSelection(activeDialog.effectType, params)
    } else {
      await applyGenerate(activeDialog.effectType, params)
    }
    dispatch({ type: 'SET_ACTIVE_DIALOG', payload: null })
  }

  const handleCancel = () => {
    dispatch({ type: 'SET_ACTIVE_DIALOG', payload: null })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleCancel}>
      <div
        className="bg-surface-300 border border-surface-50/50 rounded-lg shadow-2xl w-[380px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-surface-50/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200">{activeDialog.name}</h3>
          <button className="text-gray-500 hover:text-gray-300 text-lg leading-none" onClick={handleCancel}>&times;</button>
        </div>

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

        <div className="px-4 py-3 border-t border-surface-50/30 flex items-center justify-end gap-2">
          <button className="btn-secondary text-xs" onClick={handleCancel}>Cancel</button>
          <button className="btn-primary text-xs" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  )
}
