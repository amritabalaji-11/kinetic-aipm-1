import React from 'react'

export default function RepChart({ repScores = [] , width = 600, height = 140}){
  const max = Math.max(100, ...repScores)
  const padding = 8
  const innerW = width - padding * 2
  const innerH = height - padding * 2
  const barWidth = repScores.length > 0 ? innerW / repScores.length - 6 : 0

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width={width} height={height} fill="transparent" />
      {repScores.map((s, i) => {
        const x = padding + i * (barWidth + 6)
        const h = (s / max) * innerH
        const y = padding + (innerH - h)
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={h} fill="#06b6d4" rx="3" />
            <text x={x + barWidth / 2} y={height - 4} fontSize="10" textAnchor="middle" fill="#1f2937">{s}</text>
          </g>
        )
      })}
    </svg>
  )
}
