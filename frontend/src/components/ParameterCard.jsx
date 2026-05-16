import React from 'react'

function TipChip({ children }) {
  return <span className="inline-block text-xs bg-gray-100 text-text-primary px-2 py-1 rounded-full mr-2">{children}</span>
}

export default function ParameterCard({ title, score, affirmation, observation, tips = [] }) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-text-teritary mt-1">{affirmation || observation || 'No specific observation'}</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center font-semibold">{score ?? '—'}</div>
          <div className="text-xs text-text-teritary mt-1">/100</div>
        </div>
      </div>

      {tips && tips.length > 0 && (
        <div className="mt-3 flex flex-wrap">
          {tips.map((t, i) => (
            <TipChip key={i}>{t}</TipChip>
          ))}
        </div>
      )}
    </div>
  )
}
