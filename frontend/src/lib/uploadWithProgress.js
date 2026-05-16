const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes

/**
 * POST multipart form with upload progress (fetch does not expose upload progress).
 * @param {string} url
 * @param {FormData} formData
 * @param {{ onProgress?: (p: { loaded: number; total: number; percent: number | null }) => void; signal?: AbortSignal; timeoutMs?: number }} opts
 * @returns {Promise<any>} Parsed JSON response body
 */
export function postFormDataWithUploadProgress(url, formData, opts = {}) {
  const { onProgress, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = opts

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", url)
    xhr.responseType = "json"
    xhr.timeout = timeoutMs

    const onAbort = () => {
      xhr.abort()
    }
    if (signal) {
      if (signal.aborted) {
        reject(new Error("Upload cancelled"))
        return
      }
      signal.addEventListener("abort", onAbort)
    }

    xhr.upload.onprogress = (e) => {
      if (!onProgress) return
      if (e.lengthComputable) {
        onProgress({
          loaded: e.loaded,
          total: e.total,
          percent: Math.round((100 * e.loaded) / e.total),
        })
      } else {
        onProgress({ loaded: e.loaded, total: 0, percent: null })
      }
    }

    xhr.onload = () => {
      if (signal) signal.removeEventListener("abort", onAbort)
      if (xhr.status >= 200 && xhr.status < 300) {
        const body = xhr.response
        if (body && typeof body === "object") {
          resolve(body)
          return
        }
        try {
          resolve(JSON.parse(xhr.responseText || "{}"))
        } catch {
          resolve({})
        }
        return
      }
      let detail = xhr.responseText || xhr.statusText || ""
      try {
        const j = JSON.parse(xhr.responseText)
        if (j.detail != null) {
          detail = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail)
        }
      } catch {
        /* keep detail as text */
      }
      reject(new Error(`Upload failed: ${xhr.status} ${detail}`.trim()))
    }

    xhr.onerror = () => {
      if (signal) signal.removeEventListener("abort", onAbort)
      reject(new Error("Network error — check the API URL and that the backend is running."))
    }

    xhr.ontimeout = () => {
      if (signal) signal.removeEventListener("abort", onAbort)
      reject(
        new Error(
          `Upload timed out after ${Math.round(timeoutMs / 60000)} min — try a shorter clip or a faster connection.`
        )
      )
    }

    xhr.onabort = () => {
      if (signal) signal.removeEventListener("abort", onAbort)
      reject(new Error("Upload cancelled"))
    }

    xhr.send(formData)
  })
}
