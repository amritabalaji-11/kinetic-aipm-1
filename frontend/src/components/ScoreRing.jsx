import React from 'react'

function getColor(score) {
  if (score <= 49) return 'text-red-500'
  if (score <= 74) return 'text-amber-500'
  return 'text-emerald-500'
}

export default function ScoreRing({ score = 0, size = 96, stroke = 12 }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const percent = Math.max(0, Math.min(100, score))
  const dash = (percent / 100) * circumference
  const remaining = circumference - dash
  const colorClass = getColor(percent)

  return (
    <div className="inline-flex items-center justify-center">
      <svg width={size} height={size} className="block">
        <defs />
        <g transform={`translate(${size / 2}, ${size / 2})`}>
          <circle r={radius} fill="none" stroke="#eef2f7" strokeWidth={stroke} />
          <circle
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${remaining}`}
            style={{ color: undefined }}
            className={colorClass}
            transform="rotate(-90)"
          />
        </g>
      </svg>
      <div className="absolute pointer-events-none">
        <div className="text-center">
          <div className="text-xl font-bold">{percent}</div>
          <div className="text-xs text-text-teritary">Score</div>
        </div>
      </div>
    </div>
  )
}
