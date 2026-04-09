import { motion } from 'framer-motion'
import { Clock, Loader2 } from 'lucide-react'

import { type FlowStep } from '../hooks/useTranscription'
import { Progress } from './ui/progress'

export function ProgressTracker(props: {
  step: FlowStep
  uploadProgress: number
  statusText?: string | null
  elapsedSeconds: number
}) {
  const { step, uploadProgress, statusText, elapsedSeconds } = props

  return (
    <div className="space-y-3">
      {step === 'uploading' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between text-sm">
            <div className="font-medium text-zinc-100">Uploading</div>
            <div className="text-zinc-400">{uploadProgress}%</div>
          </div>
          <Progress value={uploadProgress} />
        </motion.div>
      )}

      {step === 'processing' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 font-medium text-zinc-100">
              <motion.div
                className="flex items-center gap-2"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{statusText ?? 'Queued / Processing...'}</span>
              </motion.div>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Clock className="h-4 w-4" />
              <span>{formatElapsed(elapsedSeconds)}</span>
            </div>
          </div>
          <div className="text-xs text-zinc-400">
            ~1 min processing per 10 min of audio
          </div>
        </motion.div>
      )}

      {step === 'done' && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium text-zinc-100"
        >
          Done
        </motion.div>
      )}
    </div>
  )
}

function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}m ${r.toString().padStart(2, '0')}s` : `${r}s`
}

