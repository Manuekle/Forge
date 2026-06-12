"use client"

import * as React from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const feedbackTypes = [
  { value: "problema", label: "Problema" },
  { value: "idea", label: "Idea" },
  { value: "elogio", label: "Elogio" },
] as const

const areas = [
  "Implementación de modelo",
  "Descubrir",
  "Documentación",
  "Navegación y búsqueda",
  "Agentes",
  "Ajustar",
  "Voz",
  "Características",
  "Otros",
] as const

interface FeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const [type, setType] = React.useState<string>("")
  const [area, setArea] = React.useState<string>("")
  const [comment, setComment] = React.useState("")

  const handleSubmit = () => {
    // TODO: handle feedback submission
    onOpenChange(false)
  }

  const handleCancel = () => {
    setType("")
    setArea("")
    setComment("")
    onOpenChange(false)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Enviar comentarios">
      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            ¿Qué tipo de comentarios desea enviar?
          </label>
          <div className="flex gap-1.5 rounded-full bg-surface p-1 ring-hair">
            {feedbackTypes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn(
                  "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                  type === t.value
                    ? "bg-surface-3 text-text-primary lift-1"
                    : "text-muted hover:text-text-primary"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            ¿Con qué área tuvo problemas?
          </label>
          <div className="flex flex-wrap gap-1.5">
            {areas.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setArea(a === area ? "" : a)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ring-hair",
                  area === a
                    ? "bg-surface-3 text-text-primary lift-1"
                    : "bg-surface text-muted hover:text-text-primary hover:bg-surface-2"
                )}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">
            Comentarios
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Describa su comentario..."
            rows={4}
            className="w-full resize-none rounded-[var(--radius-card)] bg-surface p-3 text-sm text-text-primary ring-hair outline-none placeholder:text-muted focus:ring-hair-strong transition-all duration-200"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            Enviar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
