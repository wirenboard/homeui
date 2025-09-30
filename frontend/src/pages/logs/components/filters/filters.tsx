import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import InfoIcon from '@/assets/icons/info.svg';
import { DatePicker } from '@/components/date-picker';
import { Dropdown, Option } from '@/components/dropdown';
import { FormGroup } from '@/components/form-group';
import { Input } from '@/components/input';
import { ToggleButton } from '@/components/toggle-button';
import { Tooltip } from '@/components/tooltip';
import { LogsStore, LogLevel } from '@/stores/logs';
import './styles.css';

export const LogsFilters = observer((
  { store, filter, onFilterChange }: { store: LogsStore; filter: any; onFilterChange: (value: any) => void }
) => {
  const { t } = useTranslation();

  const levels = [
    { label: 'Emergency', value: LogLevel.Emergency },
    { label: 'Alert', value: LogLevel.Alert },
    { label: 'Critical', value: LogLevel.Critical },
    { label: 'Error', value: LogLevel.Error },
    { label: 'Warning', value: LogLevel.Warning },
    { label: 'Notice', value: LogLevel.Notice },
    { label: 'Info', value: LogLevel.Info },
    { label: 'Debug', value: LogLevel.Debug },
  ];

  const boots = [
    { label: t('logs.labels.all-boots'), value: null },
    { label: t('logs.labels.last-boot'), value: store.boots[0]?.hash },
  ];

  return (
    <div className="logsFilters">
      <Dropdown
        className="logsFilters-input"
        ariaLabel={t('logs.labels.choose-service')}
        value={filter.service}
        placeholder={t('logs.labels.all-services')}
        isLoading={!store.services.length}
        isDisabled={!store.services.length}
        options={store.services.map((service) => ({ label: service, value: service }))}
        isClearable
        isSearchable
        onChange={(option: Option) => onFilterChange({ ...filter, service: option?.value })}
      />

      <Dropdown
        className="logsFilters-input"
        ariaLabel={t('logs.labels.choose-boot')}
        value={filter.boot}
        options={boots}
        isLoading={!store.boots.length}
        isDisabled={!store.boots.length}
        isSearchable
        onChange={(option: Option) => onFilterChange({ ...filter, boot: option.value })}
      />

      <Dropdown
        className="logsFilters-input"
        ariaLabel={t('logs.labels.choose-level')}
        value={filter.levels}
        options={levels}
        placeholder={t('logs.labels.levels')}
        multiselect
        onChange={(options: Option[]) => onFilterChange({ ...filter, levels: options.map((opt) => opt.value) })}
      />

      <DatePicker
        className="logsFilters-input"
        placeholder={t('logs.labels.latest')}
        heading={t('logs.labels.set-date')}
        value={filter.time ? new Date(filter.time * 1000) : null}
        onChange={(time) => onFilterChange({ ...filter, time: time ? time.getTime() / 1000 : null })}
      />

      <FormGroup>
        <Input
          className="logsFilters-pattern"
          value={filter.pattern}
          aria-label={t('logs.labels.pattern')}
          placeholder={t('logs.labels.pattern')}
          onChange={(pattern) => onFilterChange({ ...filter, pattern })}
        />

        <Tooltip text={t('logs.buttons.case')}>
          <ToggleButton
            enabled={filter['case-sensitive']}
            aria-label={t('logs.buttons.case')}
            label="Aa"
            onClick={() => onFilterChange({ ...filter, 'case-sensitive': !filter['case-sensitive'] })}
          />
        </Tooltip>

        <Tooltip text={t('logs.buttons.regex')}>
          <ToggleButton
            enabled={filter.regex}
            aria-label={t('logs.buttons.regex')}
            label="Re"
            onClick={() => onFilterChange({ ...filter, regex: !filter.regex })}
          />
        </Tooltip>

      </FormGroup>

      <Tooltip text={t('logs.labels.help')} placement="bottom">
        <a
          href="https://unicode-org.github.io/icu/userguide/strings/regexp.html"
          target="_blank"
          className="logsFilters-info"
        >
          <InfoIcon className="logsFilters-info" />
        </a>
      </Tooltip>
    </div>
  );
});
