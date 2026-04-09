import { useCallback, useMemo, useRef, useState } from 'react'
import { Mic, UploadCloud, X } from 'lucide-react'

import { cn } from '../lib/utils'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Button } from './ui/button'

const MAX_BYTES = 500 * 1024 * 1024
const ACCEPTED_MIME = new Set([
  'audio/mpeg', // mp3
  'audio/mp4', // m4a (sometimes)
  'audio/x-m4a',
  'audio/wav',
  'audio/webm',
  'video/mp4', // mp4
])

export function UploadZone(props: {
  file: File | null
  disabled?: boolean
  onFileSelected: (file: File) => void
}) {
  const { file, disabled, onFileSelected } = props
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const acceptAttr = useMemo(() => {
    return [
      '.mp3',
      '.mp4',
      '.m4a',
      '.wav',
      '.webm',
      '.mpeg',
      'audio/*',
      'video/mp4',
    ].join(',')
  }, [])

  const validate = useCallback((f: File): string | null => {
    if (f.size > MAX_BYTES) return 'File is too large. Max size is 500MB.'
    if (ACCEPTED_MIME.has(f.type)) return null

    const ext = f.name.toLowerCase().split('.').pop() ?? ''
    const okByExt = new Set(['mp3', 'mp4', 'm4a', 'wav', 'webm', 'mpeg'])
    if (okByExt.has(ext)) return null

    return 'Unsupported file type. Please upload mp3, mp4, m4a, wav, webm, or mpeg.'
  }, [])

  const handleFile = useCallback(
    (f: File | null | undefined) => {
      if (!f) return
      const msg = validate(f)
      if (msg) {
        setError(msg)
        return
      }
      setError(null)
      onFileSelected(f)
    },
    [onFileSelected, validate],
  )

  return (
    <div className="space-y-3">
      {error && (
        <Alert className="relative pr-12" variant="destructive">
          <AlertTitle>File error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8"
            onClick={() => setError(null)}
          >
            <X />
            <span className="sr-only">Dismiss</span>
          </Button>
        </Alert>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFile(e.currentTarget.files?.[0])}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (disabled) return
          setIsDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (disabled) return
          setIsDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsDragging(false)
          if (disabled) return
          handleFile(e.dataTransfer.files?.[0])
        }}
        className={cn(
          'group relative flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-10 text-left transition-colors',
          isDragging
            ? 'border-zinc-400 bg-zinc-900/60'
            : 'border-zinc-700 bg-zinc-950/30 hover:border-zinc-500 hover:bg-zinc-900/40',
          disabled && 'cursor-not-allowed opacity-60 hover:border-zinc-700 hover:bg-zinc-950/30',
        )}
      >
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/50">
          <Mic className="h-6 w-6 text-zinc-200" />
          <UploadCloud className="absolute -right-2 -top-2 h-5 w-5 text-zinc-400" />
        </div>
        <div className="text-center">
          <div className="text-sm font-medium text-zinc-100">
            Drag & drop audio here, or click to browse
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            mp3, mp4, m4a, wav, webm, mpeg • up to 500MB
          </div>
        </div>
      </button>

      {file && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/30 px-4 py-3">
          <div className="text-sm font-medium text-zinc-100">{file.name}</div>
          <div className="mt-1 text-xs text-zinc-400">{formatBytes(file.size)}</div>
        </div>
      )}
    </div>
  )
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let val = bytes
  let idx = 0
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024
    idx += 1
  }
  const digits = idx === 0 ? 0 : idx === 1 ? 0 : 1
  return `${val.toFixed(digits)} ${units[idx]}`
}

