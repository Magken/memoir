import { useEffect, useState } from 'react'
import type {
  CalendarAccount,
  CalEvent,
  CalOccurrence,
  CalTag,
  CalTask,
  CreateEventInput,
  CreateTaskInput,
  DeleteOccurrenceScope,
  RecurrenceFreq,
} from '../../lib/calendar/types'
import { Button } from '../Button'
import { Checkbox } from '../Checkbox'
import { Input } from '../Input'
import { Modal } from '../Modal'
import { Select } from '../Select'
import { Textarea } from '../Textarea'

type CalendarEventModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  calendars: readonly CalendarAccount[]
  tags: readonly CalTag[]
  initial?: Partial<CreateEventInput> & { id?: string }
  occurrence?: CalOccurrence | null
  onClose: () => void
  onSave: (input: CreateEventInput) => void
  onDelete?: (scope?: DeleteOccurrenceScope) => void
  onUpdateOccurrence?: (patch: Partial<CreateEventInput>) => void
}

export function CalendarEventModal({
  open,
  mode,
  calendars,
  tags,
  initial,
  occurrence,
  onClose,
  onSave,
  onDelete,
  onUpdateOccurrence,
}: CalendarEventModalProps) {
  const writable = calendars.filter((c) => c.writable)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [calendarId, setCalendarId] = useState(initial?.calendarId ?? writable[0]?.id ?? '')
  const [start, setStart] = useState(initial?.start ?? '')
  const [end, setEnd] = useState(initial?.end ?? '')
  const [allDay, setAllDay] = useState(Boolean(initial?.allDay))
  const [description, setDescription] = useState(initial?.description ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [tagIds, setTagIds] = useState<string[]>(initial?.tagIds ?? [])
  const [freq, setFreq] = useState<RecurrenceFreq | ''>(initial?.recurrence?.freq ?? '')
  const [deleteScope, setDeleteScope] = useState<DeleteOccurrenceScope>('this')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title ?? '')
    setCalendarId(initial?.calendarId ?? writable[0]?.id ?? '')
    setStart(initial?.start ?? '')
    setEnd(initial?.end ?? '')
    setAllDay(Boolean(initial?.allDay))
    setDescription(initial?.description ?? '')
    setLocation(initial?.location ?? '')
    setTagIds(initial?.tagIds ?? [])
    setFreq(initial?.recurrence?.freq ?? '')
    setError(null)
  }, [open, initial])

  const save = () => {
    const input: CreateEventInput = {
      title,
      calendarId,
      start,
      end,
      allDay,
      description,
      location,
      tagIds,
      recurrence: freq ? { freq, interval: 1 } : null,
      reminders: initial?.reminders ?? [{ id: 'rem_new', minutesBefore: 10, channel: 'popup' }],
    }
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    if (occurrence?.recurringEventId && onUpdateOccurrence && mode === 'edit') {
      onUpdateOccurrence(input)
      return
    }
    onSave(input)
  }

  return (
    <Modal open={open} onClose={onClose} title={mode === 'create' ? 'Create event' : 'Edit event'} size="md">
      <div className="theme-calendar-event-form">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} shadowless />
        <Select
          label="Calendar"
          value={calendarId}
          onChange={setCalendarId}
          options={writable.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Checkbox checked={allDay} onChange={setAllDay} label="All day" size="sm" />
        <Input label="Start" value={start} onChange={(e) => setStart(e.target.value)} shadowless />
        <Input label="End" value={end} onChange={(e) => setEnd(e.target.value)} shadowless />
        <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} shadowless />
        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          shadowless
          rows={3}
        />
        <Select
          label="Repeat"
          value={freq}
          onChange={(value) => setFreq(value as RecurrenceFreq | '')}
          options={[
            { value: '', label: 'Does not repeat' },
            { value: 'DAILY', label: 'Daily' },
            { value: 'WEEKLY', label: 'Weekly' },
            { value: 'MONTHLY', label: 'Monthly' },
            { value: 'YEARLY', label: 'Yearly' },
          ]}
        />
        <div>
          <p className="type-label mb-1">Tags</p>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Checkbox
                key={tag.id}
                size="xs"
                checked={tagIds.includes(tag.id)}
                label={tag.name}
                onChange={(checked) =>
                  setTagIds((prev) =>
                    checked ? [...prev, tag.id] : prev.filter((id) => id !== tag.id),
                  )
                }
              />
            ))}
          </div>
        </div>
        {error ? <p className="type-caption text-[var(--theme-danger)]">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          {mode === 'edit' && onDelete ? (
            <>
              {occurrence?.recurringEventId ? (
                <Select
                  label="Delete"
                  value={deleteScope}
                  onChange={(value) => setDeleteScope(value as DeleteOccurrenceScope)}
                  options={[
                    { value: 'this', label: 'This event' },
                    { value: 'following', label: 'This and following' },
                    { value: 'all', label: 'All events' },
                  ]}
                />
              ) : null}
              <Button type="button" variant="ghost" onClick={() => onDelete(deleteScope)}>
                Delete
              </Button>
            </>
          ) : null}
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}

type CalendarTaskModalProps = {
  open: boolean
  initial?: Partial<CalTask>
  onClose: () => void
  onSave: (input: CreateTaskInput & { completed?: boolean }) => void
  onDelete?: () => void
}

export function CalendarTaskModal({ open, initial, onClose, onSave, onDelete }: CalendarTaskModalProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [dueAt, setDueAt] = useState(initial?.dueAt ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [completed, setCompleted] = useState(Boolean(initial?.completed))

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title ?? '')
    setDueAt(initial?.dueAt ?? '')
    setNotes(initial?.notes ?? '')
    setCompleted(Boolean(initial?.completed))
  }, [open, initial])

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? 'Edit task' : 'Create task'} size="sm">
      <div className="theme-calendar-event-form">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} shadowless />
        <Input label="Due" value={dueAt ?? ''} onChange={(e) => setDueAt(e.target.value)} shadowless />
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} shadowless rows={3} />
        <Checkbox checked={completed} onChange={setCompleted} label="Completed" size="sm" />
        <div className="flex justify-end gap-2">
          {onDelete ? (
            <Button type="button" variant="ghost" onClick={onDelete}>
              Delete
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() =>
              onSave({
                title,
                dueAt: dueAt || null,
                notes,
                completed,
              })
            }
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export function eventToInput(event: CalEvent): CreateEventInput & { id: string } {
  return {
    id: event.id,
    calendarId: event.calendarId,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    description: event.description,
    location: event.location,
    tagIds: event.tagIds,
    recurrence: event.recurrence,
    reminders: event.reminders,
  }
}
