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
const ALL_TIME_START_YEAR = 1970

type Preset = {
  label: string
  getValue: () => DateRange
}

interface DateRangePickerProps {
  dateRange: DateRange | undefined
  setDateRange: (range: DateRange | undefined) => void
  allowClear?: boolean
}

export function DateRangePicker({
  dateRange,
  setDateRange,
  allowClear = false,
}: DateRangePickerProps) {
  const [displayMonth, setDisplayMonth] = React.useState<Date>(
    dateRange?.from || new Date(),
  )
  const [open, setOpen] = React.useState(false)
  const [isDesktop, setIsDesktop] = React.useState(false)
  const [tempDateRange, setTempDateRange] = React.useState<
    DateRange | undefined
  >(dateRange)

  React.useEffect(() => {
    setTempDateRange(dateRange)
  }, [dateRange])

  React.useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

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

  const handleClear = () => {
    setTempDateRange(undefined)
    setDateRange(undefined)
    setOpen(false)
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
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] overflow-auto p-0 md:w-auto"
        align="start"
      >
        <div className="flex flex-col md:flex-row">
          <div className="grid grid-cols-2 gap-1 border-b p-3 md:flex md:min-w-40 md:flex-col md:border-r md:border-b-0">
            <div className="text-sm font-semibold px-2 py-1.5">Presets</div>
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                className="justify-start text-sm font-normal h-9 px-2"
                onClick={() => handlePresetClick(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="flex min-w-0 flex-col gap-3 p-3 md:p-4">
            <Calendar
              mode="range"
              selected={tempDateRange}
              onSelect={setTempDateRange}
              numberOfMonths={isDesktop ? 2 : 1}
              captionLayout="dropdown"
              startMonth={new Date(ALL_TIME_START_YEAR, 0)}
              endMonth={new Date(toYear, 11)}
              showOutsideDays={false}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
            />

            <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
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
              <div className="flex items-center justify-end gap-2">
                {allowClear && dateRange?.from && (
                  <Button variant="ghost" size="sm" onClick={handleClear}>
                    Clear
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApply}
                  disabled={!tempDateRange?.from || !tempDateRange?.to}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
