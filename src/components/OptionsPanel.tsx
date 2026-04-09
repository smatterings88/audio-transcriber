import { ChevronDown } from 'lucide-react'

import { type TranscriptionOptions } from '../lib/api'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible'
import { Separator } from './ui/separator'
import { Switch } from './ui/switch'

export function OptionsPanel(props: {
  options: TranscriptionOptions
  disabled?: boolean
  onChange: (next: TranscriptionOptions) => void
}) {
  const { options, disabled, onChange } = props

  return (
    <Collapsible defaultOpen={false}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-zinc-100">Options</div>
          <Badge variant="secondary" className="text-zinc-200">
            Advanced
          </Badge>
        </div>
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" size="sm" disabled={disabled}>
            Toggle
            <ChevronDown className="opacity-80" />
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="mt-3 space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
        <OptionRow
          title="Speaker Labels"
          description="Identify different speakers (diarization)."
          disabled={disabled}
          checked={options.speaker_labels}
          onCheckedChange={(v) => onChange({ ...options, speaker_labels: v })}
        />
        <Separator />
        <OptionRow
          title="Auto language detection"
          description="Automatically detect the spoken language."
          disabled={disabled}
          checked={options.language_detection}
          onCheckedChange={(v) => onChange({ ...options, language_detection: v })}
        />
        <Separator />
        <OptionRow
          title="Punctuation & formatting"
          description="Improves readability. Recommended."
          disabled={disabled}
          checked={options.punctuate && options.format_text}
          onCheckedChange={(v) =>
            onChange({ ...options, punctuate: v, format_text: v })
          }
        />
      </CollapsibleContent>
    </Collapsible>
  )
}

function OptionRow(props: {
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const { title, description, checked, disabled, onCheckedChange } = props
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-100">{title}</div>
        <div className="mt-1 text-xs text-zinc-400">{description}</div>
      </div>
      <Switch
        disabled={disabled}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={title}
      />
    </div>
  )
}

