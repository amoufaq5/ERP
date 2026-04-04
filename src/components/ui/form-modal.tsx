"use client"

import { useState, useEffect, useCallback, type FormEvent } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface FormField {
  name: string
  label: string
  type: "text" | "email" | "number" | "date" | "select" | "textarea" | "tel" | "url"
  placeholder?: string
  required?: boolean
  options?: { label: string; value: string }[]
  defaultValue?: string
}

interface FormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  fields: FormField[]
  onSubmit: (data: Record<string, string>) => void
  submitLabel?: string
  initialData?: Record<string, string>
}

function buildInitialFormData(
  fields: FormField[],
  initialData?: Record<string, string>
): Record<string, string> {
  const data: Record<string, string> = {}
  for (const field of fields) {
    data[field.name] =
      initialData?.[field.name] ?? field.defaultValue ?? ""
  }
  return data
}

export function FormModal({
  open,
  onOpenChange,
  title,
  description,
  fields,
  onSubmit,
  submitLabel = "Create",
  initialData,
}: FormModalProps) {
  const [formData, setFormData] = useState<Record<string, string>>(() =>
    buildInitialFormData(fields, initialData)
  )
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  // Reset form when dialog opens or initialData changes
  useEffect(() => {
    if (open) {
      setFormData(buildInitialFormData(fields, initialData))
      setErrors({})
    }
  }, [open, fields, initialData])

  const handleFieldChange = useCallback(
    (name: string, value: string) => {
      setFormData((prev) => ({ ...prev, [name]: value }))
      setErrors((prev) => {
        if (!prev[name]) return prev
        const next = { ...prev }
        delete next[name]
        return next
      })
    },
    []
  )

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()

      const newErrors: Record<string, boolean> = {}
      for (const field of fields) {
        if (field.required && !formData[field.name]?.trim()) {
          newErrors[field.name] = true
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      onSubmit(formData)
      onOpenChange(false)
    },
    [fields, formData, onSubmit, onOpenChange]
  )

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!value) {
        setFormData(buildInitialFormData(fields))
        setErrors({})
      }
      onOpenChange(value)
    },
    [fields, onOpenChange]
  )

  const renderField = (field: FormField) => {
    const value = formData[field.name] ?? ""
    const hasError = errors[field.name]

    if (field.type === "select") {
      return (
        <Select
          value={value}
          onValueChange={(v) => handleFieldChange(field.name, v)}
        >
          <SelectTrigger
            className={hasError ? "border-destructive" : undefined}
          >
            <SelectValue placeholder={field.placeholder ?? `Select ${field.label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    if (field.type === "textarea") {
      return (
        <Textarea
          value={value}
          onChange={(e) => handleFieldChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          className={hasError ? "border-destructive" : undefined}
          rows={3}
        />
      )
    }

    return (
      <Input
        type={field.type}
        value={value}
        onChange={(e) => handleFieldChange(field.name, e.target.value)}
        placeholder={field.placeholder}
        className={hasError ? "border-destructive" : undefined}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2">
            {fields.map((field) => {
              const isFullWidth = field.type === "textarea"
              return (
                <div
                  key={field.name}
                  className={isFullWidth ? "sm:col-span-2" : undefined}
                >
                  <Label htmlFor={field.name} className="mb-2 block">
                    {field.label}
                    {field.required && (
                      <span className="ml-1 text-destructive">*</span>
                    )}
                  </Label>
                  {renderField(field)}
                  {errors[field.name] && (
                    <p className="mt-1 text-xs text-destructive">
                      {field.label} is required
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
