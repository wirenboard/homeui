import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import { type CollapseButtonProps } from './types';
import './styles.css';

export const CollapseButton = observer(({ className, state, stopPropagation, isDisabled }: CollapseButtonProps) => {
  const { t } = useTranslation();

  return (
    <span
      role="button"
      className={classNames('collapseButton', className, {
        'collapseButton-disabled': isDisabled,
      })}
      tabIndex={0}
      aria-disabled={isDisabled}
      aria-expanded={!state.collapsed}
      aria-label={state.collapsed ? t('common.buttons.expand') : t('common.buttons.collapse')}
      onClick={(ev) => {
        if (stopPropagation) {
          ev.stopPropagation();
        }
        if (isDisabled) {
          return;
        }
        state.setCollapsed(!state.collapsed);
      }}
    >
      {state.collapsed
        ? <ChevronRightIcon className="collapseButton-icon" />
        : <ChevronDownIcon className="collapseButton-icon" />
      }
    </span>
  );
});
