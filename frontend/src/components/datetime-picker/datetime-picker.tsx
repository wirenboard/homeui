import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingFocusManager,
  FloatingPortal,
} from '@floating-ui/react';
import classNames from 'classnames';
import { format, parse, isValid } from 'date-fns';
import { useState, useId, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { ru, enGB } from 'react-day-picker/locale';
import { useTranslation } from 'react-i18next';
import { IMaskInput } from 'react-imask';
import CalendarIcon from '@/assets/icons/calendar.svg';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { type DateTimePickerProps } from './types';
import './styles.css';

export const DateTimePicker = ({ value, onChange, disabled, ariaLabel, isInvalid, size }: DateTimePickerProps) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Date | null>(value ?? null);
  const dateFormat = i18n.language === 'ru' ? 'dd.MM.yyyy HH:mm' : 'dd/MM/yyyy HH:mm';
  const [inputValue, setInputValue] = useState(selected ? format(selected, dateFormat) : '');

  const id = useId();
  const timeId = useId();

  useEffect(() => {
    if (value?.getTime() !== selected?.getTime()) {
      setSelected(value ?? null);
      setInputValue(value ? format(value, dateFormat) : '');
    }
  }, [value]);

  const handleDateSelect = (date?: Date) => {
    if (!date) {
      return;
    }

    const newDate = new Date(date);

    if (selected) {
      newDate.setHours(selected.getHours());
      newDate.setMinutes(selected.getMinutes());
    }

    setSelected(newDate);
    setInputValue(format(newDate, dateFormat));
    onChange?.(newDate);
  };

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(8), flip(), shift()],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context, {
    toggle: true,
  });
  const dismiss = useDismiss(context, {
    escapeKey: true,
  });
  const role = useRole(context, { role: 'dialog' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const handleTimeChange = (val: string) => {
    if (!selected) {
      return;
    }

    let h = 0;
    let m = 0;

    if (val) {
      const [parsedH, parsedM] = val.split(':').map(Number);
      if (isNaN(parsedH) || isNaN(parsedM)) {
        return;
      }
      h = parsedH;
      m = parsedM;
    }

    const newDate = new Date(selected);
    newDate.setHours(h);
    newDate.setMinutes(m);

    setSelected(newDate);
    setInputValue(format(newDate, dateFormat));
    onChange?.(newDate);
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    if (!val || !/[0-9]/.test(val)) {
      setSelected(null);
      onChange?.(null);
      return;
    }

    const parsedDate = parse(val, dateFormat, new Date());

    if (isValid(parsedDate)) {
      setSelected(parsedDate);
      onChange?.(parsedDate);
    }
  };

  return (
    <>
      <div className="datetimePicker-inputWrapper" ref={refs.setReference}>
        <IMaskInput
          id={id}
          className={classNames('input', 'datetimePicker-input', {
            'input-m': (size || 'default') === 'default',
            'input-s': size === 'small',
            'input-invalid': isInvalid,
          })}
          mask={i18n.language === 'ru' ? '00.00.0000 00:00' : '00/00/0000 00:00'}
          value={inputValue}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={ariaLabel}
          aria-controls={`${id}-popup`}
          onAccept={(val: string) => handleInputChange(val)}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') {
              setOpen(false);
            }
          }}
        />
        <Button
          className="datetimePicker-openButton"
          variant="secondary"
          size={size || 'default'}
          icon={<CalendarIcon />}
          disabled={disabled}
          aria-label={t('common.buttons.open-calendar')}
          {...getReferenceProps()}
        />
      </div>

      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal>
            <div
              ref={refs.setFloating}
              id={`${id}-popup`}
              className="datetimePicker-container"
              style={{ ...floatingStyles }}
              {...getFloatingProps()}
            >
              <DayPicker
                mode="single"
                selected={selected ?? undefined}
                locale={i18n.language === 'ru' ? ru : enGB}
                autoFocus
                onSelect={handleDateSelect}
              />

              <label className="datetimePicker-timeContainer" htmlFor={timeId}>
                <span>{t('common.labels.time')}:</span>
                <Input
                  id={timeId}
                  type="time"
                  value={selected ? format(selected, 'HH:mm') : '00:00'}
                  onChange={handleTimeChange}
                  onEnter={() => setOpen(false)}
                />
              </label>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};
