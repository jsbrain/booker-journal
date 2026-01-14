'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// Custom component (NOT provided by shadcn/ui registry).
// Kept outside `components/ui/*` so shadcn CLI can safely overwrite that folder.

interface DateTimePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  placeholder?: string
}

export function DateTimePicker({
  date,
  setDate,
  placeholder = 'Pick a date and time',
}: DateTimePickerProps) {
  const [selectedTime, setSelectedTime] = React.useState<string>('10:00')

  const timeSlots = React.useMemo(() => {
    return Array.from({ length: 96 }, (_, i) => {
      const totalMinutes = i * 15
      const hour = Math.floor(totalMinutes / 60)
      const minute = totalMinutes % 60
      return `${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`
    })
  }, [])

  React.useEffect(() => {
    if (!date) return
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    setSelectedTime(`${hours}:${minutes}`)
  }, [date])

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      setDate(undefined)
      return
    }

    const [hours, minutes] = selectedTime.split(':')
    const next = new Date(selectedDate)
    next.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    setDate(next)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    if (!date) return
    const [hours, minutes] = time.split(':')
    const next = new Date(date)
    next.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    setDate(next)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
          )}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP 'at' HH:mm") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 gap-0" align="start">
        <div className="flex">
          <div className="p-3">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              initialFocus
            />
          </div>
          <div className="border-l flex flex-col">
            <div className="p-3 border-b">
              <Label className="text-sm font-medium">Time</Label>
            </div>
            <div className="overflow-y-auto h-[280px] w-[120px]">
              <div className="p-2 space-y-1">
                {timeSlots.map(time => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? 'default' : 'ghost'}
                    onClick={() => handleTimeSelect(time)}
                    className="w-full text-sm h-8 font-normal justify-start"
                    size="sm">
                    {time}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
