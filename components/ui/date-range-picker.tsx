"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { DateRange } from "react-day-picker"
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Preset = {
  label: string
  getValue: () => DateRange
}

interface DateRangePickerProps {
  dateRange: DateRange | undefined
  setDateRange: (range: DateRange | undefined) => void
}

export function DateRangePicker({ dateRange, setDateRange }: DateRangePickerProps) {
  const [displayMonth, setDisplayMonth] = React.useState<Date>(dateRange?.from || new Date())
  const [open, setOpen] = React.useState(false)
  // Local state for the temporary selection
  const [tempDateRange, setTempDateRange] = React.useState<DateRange | undefined>(dateRange)
  const currentYear = displayMonth.getFullYear()
  const currentMonth = displayMonth.getMonth()

  // Sync tempDateRange with dateRange when it changes externally
  React.useEffect(() => {
    setTempDateRange(dateRange)
  }, [dateRange])

  // Generate year options (current year ± 10 years)
  const yearOptions = React.useMemo(() => {
    const years = []
    const baseYear = new Date().getFullYear()
    for (let i = baseYear - 10; i <= baseYear + 10; i++) {
      years.push(i)
    }
    return years
  }, [])

  const presets: Preset[] = React.useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    return [
      {
        label: "All Time",
        getValue: () => ({
          from: new Date(2000, 0, 1), // Start from year 2000
          to: today,
        }),
      },
      {
        label: "Last Year",
        getValue: () => ({
          from: new Date(now.getFullYear() - 1, 0, 1),
          to: new Date(now.getFullYear() - 1, 11, 31),
        }),
      },
      {
        label: "This Year",
        getValue: () => ({
          from: new Date(now.getFullYear(), 0, 1),
          to: new Date(now.getFullYear(), 11, 31),
        }),
      },
      {
        label: "Last Month",
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
        label: "This Month",
        getValue: () => ({
          from: new Date(now.getFullYear(), now.getMonth(), 1),
          to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        }),
      },
      {
        label: "Last 30 Days",
        getValue: () => ({
          from: new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000),
          to: today,
        }),
      },
      {
        label: "Last 14 Days",
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

  const handleYearChange = (year: string) => {
    setDisplayMonth(new Date(parseInt(year), currentMonth, 1))
  }

  const handleMonthChange = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setDisplayMonth(new Date(currentYear, currentMonth - 1, 1))
    } else {
      setDisplayMonth(new Date(currentYear, currentMonth + 1, 1))
    }
  }

  const formatDateRange = () => {
    if (!dateRange?.from) return "Select date range"
    if (!dateRange.to) return dateRange.from.toLocaleDateString()
    return `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateRange?.from && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="flex flex-col gap-1 border-r p-3 min-w-[160px]">
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

          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <Button variant="outline" size="icon" onClick={() => handleMonthChange("prev")} className="size-7">
                <ChevronLeftIcon className="size-4" />
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium min-w-[100px] text-center">
                  {displayMonth.toLocaleString("default", { month: "long" })}
                </span>
                <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                  <SelectTrigger className="w-[90px] h-7 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" size="icon" onClick={() => handleMonthChange("next")} className="size-7">
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>

            <Calendar
              mode="range"
              selected={tempDateRange}
              onSelect={setTempDateRange}
              numberOfMonths={2}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
            />

            <div className="flex items-center justify-between border-t pt-3">
              <div className="text-xs text-muted-foreground">
                {tempDateRange?.from ? (
                  tempDateRange.to ? (
                    <>
                      {tempDateRange.from.toLocaleDateString()} → {tempDateRange.to.toLocaleDateString()}
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
                disabled={!tempDateRange?.from || !tempDateRange?.to}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
