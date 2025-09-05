import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import classNames from 'classnames';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '../input';
import { PasswordProps } from './types';
import './styles.css';

export const Password = ({
  ref,
  value,
  className,
  isDisabled,
  isWithExplicitChanges,
  onChange,
  onChangeEvent,
  isFullWidth = false,
  size = 'default',
  ariaLabel,
  ariaDescribedby,
  showIndicator,
  ariaInvalid,
  ariaErrorMessage,
  ...rest
}: PasswordProps) => {
  const { t } = useTranslation();

  const options = {
    dictionary: {
      ...zxcvbnCommonPackage.dictionary,
    },
    graphs: zxcvbnCommonPackage.adjacencyGraphs,
  };
  zxcvbnOptions.setOptions(options);

  const score = useMemo(() => zxcvbn(value).score, [value]);

  return (
    <>
      <Input
        ref={ref}
        type="password"
        className={className}
        size={size}
        isDisabled={isDisabled}
        value={value}
        isWithExplicitChanges={isWithExplicitChanges}
        isFullWidth={isFullWidth}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
        aria-invalid={ariaInvalid}
        aria-errormessage={ariaErrorMessage}
        onChange={onChange}
        onChangeEvent={onChangeEvent}
        {...rest}
      />
      {showIndicator && (
        <div>
          <div className="password-indicatorWrapper">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={classNames(
                  'password-indicator',
                  'password-indicatorInvalid',
                  {
                    'password-indicatorDanger': score === 1 && i < score,
                    'password-indicatorWeak': score === 2 && i < score,
                    'password-indicatorNormal': score === 3 && i < score,
                    'password-indicatorStrong': score === 4 && i < score,
                  }
                )}
              />
            ))}
          </div>
          <div
            className={classNames('password-score', {
              'password-scoreDanger': score < 2,
            })}
          >{t(`common.labels.password-strength-${score}`)}
          </div>
        </div>
      )}
    </>
  );
};
