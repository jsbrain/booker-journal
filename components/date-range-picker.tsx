'use client'

import * as React from 'react'
import type { DateRange } from 'react-day-picker'
import { CalendarIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// Custom component (NOT provided by shadcn/ui registry).
// Kept outside `components/ui/*` so shadcn CLI can safely overwrite that folder.
const ALL_TIME_START_YEAR = 2000

type Preset = {
  label: string
  getValue: () => DateRange
}

interface DateRangePickerProps {
  dateRange: DateRange | undefined
  setDateRange: (range: DateRange | undefined) => void
}

export function DateRangePicker({
  dateRange,
  setDateRange,
}: DateRangePickerProps) {
  const [displayMonth, setDisplayMonth] = React.useState<Date>(
    dateRange?.from || new Date(),
  )
  const [open, setOpen] = React.useState(false)
  const [tempDateRange, setTempDateRange] = React.useState<
    DateRange | undefined
  >(dateRange)

  React.useEffect(() => {
    setTempDateRange(dateRange)
  }, [dateRange])

  const toYear = React.useMemo(() => new Date().getFullYear() + 1, [])

  const presets: Preset[] = React.useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    return [
      {
        label: 'All Time',
        getValue: () => ({
          from: new Date(ALL_TIME_START_YEAR, 0, 1),
          to: today,
        }),
      },
      {
        label: 'Last Year',
        getValue: () => ({
          from: new Date(now.getFullYear() - 1, 0, 1),
          to: new Date(now.getFullYear() - 1, 11, 31),
        }),
      },
      {
        label: 'This Year',
        getValue: () => ({
          from: new Date(now.getFullYear(), 0, 1),
          to: new Date(now.getFullYear(), 11, 31),
        }),
      },
      {
        label: 'Last Month',
        getValue: () => {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
          return {
            from: lastMonth,
            to: lastDay,
          }
        },
      },
      {
        label: 'This Month',
        getValue: () => ({
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        }),
      },
      {
        label: 'Last 30 Days',
        getValue: () => ({
          from: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
          to: today,
        }),
      },
      {
        label: 'Last 14 Days',
        getValue: () => ({
          from: new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000),
          to: today,
        }),
      },
    ]
  }, [])

  const handlePresetClick = (preset: Preset) => {
    const newRange = preset.getValue()
    setTempDateRange(newRange)
    if (newRange.from) {
      setDisplayMonth(newRange.from)
    }
  }

  const handleApply = () => {
    if (tempDateRange?.from && tempDateRange?.to) {
      setDateRange(tempDateRange)
      setOpen(false)
    }
  }

  const formatDateRange = () => {
    if (!dateRange?.from) return 'Select date range'
    if (!dateRange.to) return dateRange.from.toLocaleDateString()
    return `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal sm:w-72',
            !dateRange?.from && 'text-muted-foreground',
          )}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="flex flex-col gap-1 border-r p-3 min-w-40">
            <div className="text-sm font-semibold px-2 py-1.5">Presets</div>
            {presets.map(preset => (
              <Button
                key={preset.label}
                variant="ghost"
                className="justify-start text-sm font-normal h-9 px-2"
                onClick={() => handlePresetClick(preset)}>
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-3 p-4">
            <Calendar
              mode="range"
              selected={tempDateRange}
              onSelect={setTempDateRange}
              numberOfMonths={2}
              captionLayout="dropdown"
              fromYear={ALL_TIME_START_YEAR}
              toYear={toYear}
              showOutsideDays={false}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
            />

            <div className="flex items-center justify-between border-t pt-3">
              <div className="text-xs text-muted-foreground">
                {tempDateRange?.from ? (
                  tempDateRange.to ? (
                    <>
                      {tempDateRange.from.toLocaleDateString()} →{' '}
                      {tempDateRange.to.toLocaleDateString()}
                    </>
                  ) : (
                    <>From: {tempDateRange.from.toLocaleDateString()}</>
                  )
                ) : (
                  <>No dates selected</>
                )}
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={handleApply}
                disabled={!tempDateRange?.from || !tempDateRange?.to}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
