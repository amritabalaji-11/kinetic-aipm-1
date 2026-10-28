import { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, canEncodeVideo } from "mediabunny"

// Shrinks a phone video before it is uploaded. The server cuts every video down to 720p at 30 frames a second
// before analysing it anyway, so sending the original only costs upload time. Same limits here, no audio.
const SHORT_SIDE = 720
const BITRATE = 2_500_000
const SKIP_BELOW_BYTES = 12 * 1024 * 1024 // already small: not worth the wait

const asMp4Name = (name) => name.replace(/\.[^.]+$/, "") + ".mp4"

// Starts shrinking in the background. Never fails: if the browser can't do it, or anything goes wrong,
// `promise` still resolves, with the original file, so the upload carries on as before.
//   promise  -> { file, shrunk, originalBytes, finalBytes }
//   cancel() -> stop (used when the person picks a different video)
export function startVideoPreparation(file, onProgress = () => {}) {
  let conversion = null
  let canceled = false

  const keep = (reason) => ({ file, shrunk: false, originalBytes: file.size, finalBytes: file.size, reason })

  async function run() {
    if (file.size < SKIP_BELOW_BYTES) return keep("already small")
    if (typeof VideoEncoder === "undefined") return keep("browser cannot re-encode video")

    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS })
    const track = await input.getPrimaryVideoTrack()
    if (!track) return keep("no video track")

    // "720" means the short side, like the server: a 1080x1920 phone video becomes 720x1280. Smaller ones stay as they are.
    const portrait = track.displayHeight >= track.displayWidth
    const shortSide = Math.min(track.displayWidth, track.displayHeight)
    const resize = shortSide > SHORT_SIDE ? (portrait ? { width: SHORT_SIDE } : { height: SHORT_SIDE }) : {}
    const outWidth = resize.width ?? Math.round(track.displayWidth * (resize.height ? resize.height / track.displayHeight : 1))
    const outHeight = resize.height ?? Math.round(track.displayHeight * (resize.width ? resize.width / track.displayWidth : 1))
    if (!(await canEncodeVideo("avc", { width: outWidth, height: outHeight, bitrate: BITRATE }))) return keep("no H.264 encoder")

    const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() })
    conversion = await Conversion.init({
      input,
      output,
      video: { ...resize, codec: "avc", bitrate: BITRATE, bitrateMode: "constant", frameRate: 30 }, // constant: keeps busy footage from overshooting
      audio: { discard: true },
    })
    if (!conversion.isValid) return keep("conversion not possible")
    conversion.onProgress = (p) => { if (!canceled) onProgress(p) }
    await conversion.execute()

    const result = new File([output.target.buffer], asMp4Name(file.name), { type: "video/mp4" })
    if (result.size >= file.size) return keep("not smaller")
    return { file: result, shrunk: true, originalBytes: file.size, finalBytes: result.size }
  }

  const promise = run().catch((err) => {
    if (!canceled) console.warn("[video] could not shrink, uploading the original:", err)
    return keep("failed")
  })

  return {
    promise,
    cancel() {
      canceled = true
      conversion?.cancel()
    },
  }
}
