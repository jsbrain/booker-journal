"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

interface DateTimePickerProps {
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  placeholder?: string
}

export function DateTimePicker({ date, setDate, placeholder = "Pick a date and time" }: DateTimePickerProps) {
  const [selectedTime, setSelectedTime] = React.useState<string>("10:00")

  // Generate time slots (every 15 minutes from 00:00 to 23:45)
  const timeSlots = React.useMemo(() => {
    return Array.from({ length: 96 }, (_, i) => {
      const totalMinutes = i * 15
      const hour = Math.floor(totalMinutes / 60)
      const minute = totalMinutes % 60
      return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
    })
  }, [])

  // Initialize time from date if provided
  React.useEffect(() => {
    if (date) {
      const hours = date.getHours().toString().padStart(2, "0")
      const minutes = date.getMinutes().toString().padStart(2, "0")
      setSelectedTime(`${hours}:${minutes}`)
    }
  }, [date])

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Combine date with current selected time
      const [hours, minutes] = selectedTime.split(":")
      const newDate = new Date(selectedDate)
      newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      setDate(newDate)
    } else {
      setDate(undefined)
    }
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    if (date) {
      const [hours, minutes] = time.split(":")
      const newDate = new Date(date)
      newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      setDate(newDate)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            format(date, "PPP 'at' HH:mm")
          ) : (
            <span>{placeholder}</span>
          )}
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
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "ghost"}
                    onClick={() => handleTimeSelect(time)}
                    className="w-full text-sm h-8 font-normal justify-start"
                    size="sm"
                  >
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
