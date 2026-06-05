const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024

const ACCEPTED_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",  // .mov
  "video/x-msvideo", // .avi
  "video/avi",
  "video/msvideo",
]

export const ValidationError = {
  FILE_TOO_LARGE: {
    type: "FILE_TOO_LARGE",
    message: "That video is too large (max 500 MB). Try trimming it to your working set.",
  },
  FORMAT_UNSUPPORTED: {
    type: "FORMAT_UNSUPPORTED",
    message: "We can't read that format. Export as MP4 and try again.",
  },
  FILE_CORRUPT: {
    type: "FILE_CORRUPT",
    message: "That file looks corrupted. Re-export from your camera roll and try again.",
  },
}

function readFileHeader(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(true)
    reader.onerror = () => resolve(false)
    reader.readAsArrayBuffer(file.slice(0, 12))
  })
}

export async function validateVideoFile(file) {
  if (file.size > MAX_FILE_SIZE_BYTES) return ValidationError.FILE_TOO_LARGE
  if (!ACCEPTED_MIME_TYPES.includes(file.type)) return ValidationError.FORMAT_UNSUPPORTED
  if (file.size === 0 || !(await readFileHeader(file))) return ValidationError.FILE_CORRUPT
  return null
}
