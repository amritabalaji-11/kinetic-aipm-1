/**
 * Holds the next analysis upload in memory so we can navigate to /upload/loading
 * immediately while the multipart request runs on that page (File is not JSON-serializable).
 *
 * `runPendingUploadIfAny` dedupes across React Strict Mode double-mount using a shared promise.
 *
 * Clearing `inflightPromise` is deferred to the next microtask so React `p.then` handlers
 * can run in the same turn as settlement without a remount seeing { pending: null, inflight: null }.
 */

let pending = null
let inflightPromise = null

/** Short-lived recovery for React Strict Mode / remount after upload completes. */
export const LAST_UPLOAD_RECOVERY_KEY = "kinetic_upload_recovery"

/** How long we trust a recovered analysis_id (slow uploads + dev HMR). */
export const RECOVERY_MAX_AGE_MS = 30 * 60 * 1000 // 30 minutes

/**
 * @param {{
 *   videoFile: File
 *   exercise: string
 *   weight: number
 *   unit: string
 *   videoPreviewUrl: string | null
 *   userId: string
 *   sessionId: string
 * }} payload
 */
export function queueAnalysisUpload(payload) {
  try {
    sessionStorage.removeItem(LAST_UPLOAD_RECOVERY_KEY)
  } catch {
    /* ignore */
  }
  pending = payload
}

export function setUploadRecoveryAnalysisId(analysisId) {
  try {
    sessionStorage.setItem(
      LAST_UPLOAD_RECOVERY_KEY,
      JSON.stringify({ analysisId, ts: Date.now() })
    )
  } catch {
    /* ignore */
  }
}

export function readUploadRecoveryAnalysisId(maxAgeMs = RECOVERY_MAX_AGE_MS) {
  try {
    const raw = sessionStorage.getItem(LAST_UPLOAD_RECOVERY_KEY)
    if (!raw) return null
    const { analysisId, ts } = JSON.parse(raw)
    if (!analysisId || typeof ts !== "number") return null
    if (Date.now() - ts > maxAgeMs) {
      sessionStorage.removeItem(LAST_UPLOAD_RECOVERY_KEY)
      return null
    }
    return analysisId
  } catch {
    return null
  }
}

export function clearUploadRecovery() {
  try {
    sessionStorage.removeItem(LAST_UPLOAD_RECOVERY_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * If a job is queued (or an upload is already in flight), run `postUpload(job)` once and
 * return the same Promise to all callers. Resolves to `analysis_id` string.
 * @param {(job: object) => Promise<string>} postUpload
 * @returns {Promise<string> | null}
 */
export function runPendingUploadIfAny(postUpload) {
  if (inflightPromise) return inflightPromise

  const job = pending
  if (!job) return null

  pending = null
  const inner = postUpload(job)
  inflightPromise = inner.finally(() => {
    // Let consumers' .then / React state updates run before we drop the shared handle.
    queueMicrotask(() => {
      inflightPromise = null
    })
  })

  return inflightPromise
}
