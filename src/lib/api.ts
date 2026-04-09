export type UploadResponse = { upload_url: string }

export type TranscriptionOptions = {
  speaker_labels: boolean
  language_detection: boolean
  punctuate: boolean
  format_text: boolean
}

export type TranscribeRequest = {
  upload_url: string
  options: TranscriptionOptions
}

export type TranscribeResponse = { transcript_id: string }

export type TranscriptStatus = 'queued' | 'processing' | 'completed' | 'error'

export type TranscriptWord = {
  start: number
  end: number
  text: string
  confidence: number
  speaker?: string
}

export type TranscriptUtterance = {
  start: number
  end: number
  text: string
  speaker: string
  words?: TranscriptWord[]
}

export type Transcript = {
  id: string
  status: TranscriptStatus
  text?: string
  words?: TranscriptWord[]
  utterances?: TranscriptUtterance[]
  error?: string
  language_code?: string
}

export async function transcribe(request: TranscribeRequest): Promise<TranscribeResponse> {
  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!res.ok) {
    const message = await safeReadError(res)
    throw new Error(message)
  }

  return (await res.json()) as TranscribeResponse
}

export async function getStatus(id: string, signal?: AbortSignal): Promise<Transcript> {
  const res = await fetch(`/api/status/${encodeURIComponent(id)}`, { signal })
  if (!res.ok) {
    const message = await safeReadError(res)
    throw new Error(message)
  }
  return (await res.json()) as Transcript
}

export function uploadFile(args: {
  file: File
  onProgress: (pct: number) => void
  signal?: AbortSignal
}): Promise<UploadResponse> {
  const { file, onProgress, signal } = args

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.open('POST', '/api/upload')
    xhr.responseType = 'json'

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return
      const pct = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)))
      onProgress(pct)
    }

    xhr.onerror = () => reject(new Error('Upload failed. Please try again.'))
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response as UploadResponse)
        return
      }
      const msg =
        (xhr.response && typeof xhr.response === 'object' && 'error' in xhr.response
          ? String((xhr.response as { error?: unknown }).error)
          : null) ?? `Upload failed with status ${xhr.status}.`
      reject(new Error(msg))
    }

    const form = new FormData()
    form.append('file', file)
    xhr.send(form)

    if (signal) {
      if (signal.aborted) {
        xhr.abort()
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }

      const onAbort = () => {
        xhr.abort()
        reject(new DOMException('Aborted', 'AbortError'))
      }
      signal.addEventListener('abort', onAbort, { once: true })
    }
  })
}

async function safeReadError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: unknown }
    if (data && typeof data.error === 'string' && data.error.trim().length > 0) {
      return data.error
    }
  } catch {
    // ignore
  }
  return `Request failed with status ${res.status}.`
}

