import { useEffect, useRef, useState } from "react"

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const GSI_SRC = "https://accounts.google.com/gsi/client"
const HEIGHT = 52               // visible pill height (Figma)
const GOOGLE_BUTTON_HEIGHT = 44 // height of Google's "large" button

function loadGsi() {
  if (window.google?.accounts?.id) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`)
    const script = existing || Object.assign(document.createElement("script"), { src: GSI_SRC, async: true })
    script.addEventListener("load", resolve)
    script.addEventListener("error", () => reject(new Error("Could not load Google sign-in")))
    if (!existing) document.head.appendChild(script)
  })
}

// Renders Google's official "Continue with Google" button.
// onCredential receives the Google ID token (a JWT) once the user signs in.
export default function GoogleSignInButton({ onCredential, width = 362 }) {
  const holderRef = useRef(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!CLIENT_ID) {
      setError("Google sign-in is not configured (missing VITE_GOOGLE_CLIENT_ID)")
      return
    }
    let cancelled = false
    loadGsi()
      .then(() => {
        if (cancelled || !holderRef.current) return
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => onCredential(response.credential),
        })
        window.google.accounts.id.renderButton(holderRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width,
        })
      })
      .catch((e) => !cancelled && setError(e.message))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width])

  return (
    <>
      {/* Visible pill (matches the Figma design) with Google's real button laid invisibly on top to handle the tap */}
      <div style={{ position: "relative", width, maxWidth: "100%", height: HEIGHT }}>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            borderRadius: 8,
            background: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(2,132,199,0.3)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            fontSize: 15,
            color: "#1f1f1f",
          }}
        >
          <GoogleG />
          Continue with Google
        </div>
        <div
          ref={holderRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            opacity: 0.01,
            overflow: "hidden",
            // Google's button is 44px tall; stretch it to cover the whole pill
            transform: `scaleY(${HEIGHT / GOOGLE_BUTTON_HEIGHT})`,
            transformOrigin: "top left",
          }}
        />
      </div>
      {error && <p style={{ color: "#dc2626", fontSize: 12, textAlign: "center", marginTop: 8 }}>{error}</p>}
    </>
  )
}

// Official multicolor Google "G"
function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
