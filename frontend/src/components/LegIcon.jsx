// A bent leg (thigh across the top, knee, shin down, foot forward) as a line icon, drawn like the lucide icons used for
// the other workout types: one rounded outline, same props (size, color, strokeWidth).
export default function LegIcon({ size = 24, color = "currentColor", strokeWidth = 2, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d="M2.6 3H13C17.2 3 19.6 5.2 19.4 8.4C19.2 11.5 18.2 13.5 18.3 16.2C18.4 18 19 19.2 20.2 19.9L21.6 20.7C22.5 21.3 22.2 22.9 21.2 22.9H14.6C13.4 22.9 12.8 22.1 13 21C13.3 19 11.9 17.2 11.3 15C10.8 13.4 10.6 11.8 10.4 10.2C8 11 5.2 11.3 2.6 11.5Z" />
      <path d="M2.6 7.2C5.4 6.8 8.3 7 10.7 8.4" />
    </svg>
  )
}
