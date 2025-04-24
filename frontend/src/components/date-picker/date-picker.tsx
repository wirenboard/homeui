import classNames from 'classnames';
import { ru } from 'date-fns/locale/ru';
import ReactDatePicker, { registerLocale, CalendarContainer } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useTranslation } from 'react-i18next';
import { DatePickerProps } from './types';
import './styles.css';

registerLocale('ru', ru);

export const DatePicker = ({ className, value, placeholder, heading, onChange }: DatePickerProps) => {
  const { i18n } = useTranslation();

  const PickerContainer = ({ children, className }) => {
    return (
      <CalendarContainer className={className}>
        <div className="date-picker-heading">{heading}</div>
        <div>{children}</div>
      </CalendarContainer>
    );
  };

  return (
    // @ts-ignore
    <ReactDatePicker
      className={classNames('datePicker-input', className)}
      portalId="root-portal"
      selected={value}
      dateFormat={value?.getMinutes() || value?.getHours() ? 'dd.MM.yyyy, HH:mm' : 'dd.MM.yyyy'}
      locale={i18n.language}
      placeholderText={placeholder}
      calendarContainer={PickerContainer}
      maxDate={new Date()}
      showTimeInput
      isClearable
      // @ts-ignore
      onChange={(value) => onChange(value)}
    />
  );
};
