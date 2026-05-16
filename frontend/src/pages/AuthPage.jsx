import { useState } from "react"

function AuthPage() {
  const [mode, setMode] = useState("signin")

  return (
    <div className="min-h-screen bg-light-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">{mode === "signin" ? "Sign in" : "Create account"}</h1>
          <div className="text-sm text-text-teritary">
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="underline">
              {mode === "signin" ? "Create account" : "Sign in"}
            </button>
          </div>
        </div>

        <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-xs text-text-teritary mb-1">Email</label>
            <input className="w-full border rounded-md p-2" type="email" />
          </div>

          <div>
            <label className="block text-xs text-text-teritary mb-1">Password</label>
            <input className="w-full border rounded-md p-2" type="password" />
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-xs text-text-teritary mb-1">Display name</label>
              <input className="w-full border rounded-md p-2" type="text" />
            </div>
          )}

          <div className="pt-2">
            <button className="w-full h-12 rounded-xl bg-cyan-glow text-white font-semibold">{mode === "signin" ? "Sign in" : "Create account"}</button>
          </div>
        </form>

        <div className="mt-4 text-center text-sm text-text-teritary">Or continue with</div>
        <div className="mt-3 flex gap-2">
          <button className="flex-1 border rounded-md p-2">Continue with Google</button>
          <button className="flex-1 border rounded-md p-2">Continue with Apple</button>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
