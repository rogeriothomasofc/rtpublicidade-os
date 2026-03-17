import { CalendarIcon, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  PeriodPreset, 
  DateRange, 
  PERIOD_LABELS 
} from '@/hooks/useDashboardFilters';
import { useState, useEffect } from 'react';

interface DateRangePickerDashboardProps {
  preset: PeriodPreset;
  dateRange: DateRange;
  onPresetChange: (preset: PeriodPreset) => void;
  onCustomRangeChange: (range: DateRange) => void;
}

const presetOptions: PeriodPreset[] = [
  'all',
  'yesterday',
  'today',
  'last7days',
  'last15days',
  'last30days',
  'thisMonth',
  'lastMonth',
];

export function DateRangePickerDashboard({
  preset,
  dateRange,
  onPresetChange,
  onCustomRangeChange,
}: DateRangePickerDashboardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({
    from: dateRange.from,
    to: dateRange.to,
  });

  // Sync tempRange when dateRange changes externally
  useEffect(() => {
    setTempRange({ from: dateRange.from, to: dateRange.to });
  }, [dateRange.from, dateRange.to]);

  // Reset to presets view when popover closes
  useEffect(() => {
    if (!isOpen) {
      setShowCalendar(false);
    }
  }, [isOpen]);

  const handlePresetSelect = (selectedPreset: PeriodPreset) => {
    onPresetChange(selectedPreset);
    setIsOpen(false);
  };

  const handleCustomClick = () => {
    setTempRange({ from: dateRange.from, to: dateRange.to });
    setShowCalendar(true);
  };

  const handleRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range) {
      setTempRange(range);
      // Only apply when both dates are selected
      if (range.from && range.to) {
        onCustomRangeChange({ from: range.from, to: range.to });
        setIsOpen(false);
      }
    }
  };

  const displayLabel = preset === 'custom' 
    ? `${format(dateRange.from, 'dd/MM/yy')} - ${format(dateRange.to, 'dd/MM/yy')}`
    : PERIOD_LABELS[preset];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="min-w-0 sm:min-w-[180px] justify-between text-xs sm:text-sm">
          <span className="flex items-center gap-1.5 sm:gap-2 truncate">
            <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{displayLabel}</span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        {!showCalendar ? (
          <div className="p-1 min-w-[180px]">
            {presetOptions.map((option) => (
              <button
                key={option}
                onClick={() => handlePresetSelect(option)}
                className={cn(
                  "w-full px-3 py-2 text-sm text-left rounded-md hover:bg-accent transition-colors",
                  preset === option && 'bg-accent font-medium'
                )}
              >
                {PERIOD_LABELS[option]}
              </button>
            ))}
            <div className="border-t my-1" />
            <button
              onClick={handleCustomClick}
              className={cn(
                "w-full px-3 py-2 text-sm text-left rounded-md hover:bg-accent transition-colors",
                preset === 'custom' && 'bg-accent font-medium'
              )}
            >
              {PERIOD_LABELS.custom}
            </button>
          </div>
        ) : (
          <Calendar
            mode="range"
            defaultMonth={tempRange.from || dateRange.from}
            selected={{ from: tempRange.from, to: tempRange.to }}
            onSelect={handleRangeSelect}
            numberOfMonths={1}
            locale={ptBR}
            className={cn("p-3 pointer-events-auto")}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
