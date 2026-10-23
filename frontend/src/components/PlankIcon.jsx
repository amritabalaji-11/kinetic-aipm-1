// A person in a plank (straight body from toes to shoulders, arm straight down, floor line) as a line icon,
// drawn like the lucide icons used for the other workout types. Same props: size, color, strokeWidth.
export default function PlankIcon({ size = 24, color = "currentColor", strokeWidth = 2, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="1 3.2 22.5 20" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <circle cx="19.6" cy="7.6" r="1.7" fill={color} stroke="none" />
      <path d="M3.6 16.6L16.2 10" />
      <path d="M16.2 10V19" />
      <path d="M3.6 16.6V19" />
      <path d="M1.8 21H22.2" opacity="0.45" />
    </svg>
  )
}
