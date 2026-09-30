import { type zxcvbn as ZxcvbnCore, type zxcvbnOptions as ZxcvbnOptions } from '@zxcvbn-ts/core';
import classNames from 'classnames';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import VisibilityOffIcon from '@/assets/icons/visibility-off.svg';
import VisibilityIcon from '@/assets/icons/visibility.svg';
import { Button } from '@/components/button';
import { Input } from '../input';
import { type PasswordProps } from './types';
import './styles.css';

let zxcvbnLoad: Promise<{ zxcvbn: typeof ZxcvbnCore; zxcvbnOptions: typeof ZxcvbnOptions }> | null = null;

function loadZxcvbn() {
  if (!zxcvbnLoad) {
    zxcvbnLoad = Promise.all([import('@zxcvbn-ts/core'), import('@zxcvbn-ts/language-common')]).then(
      ([core, zxcvbnCommonPackage]) => {
        core.zxcvbnOptions.setOptions({
          dictionary: { ...zxcvbnCommonPackage.dictionary },
          graphs: zxcvbnCommonPackage.adjacencyGraphs,
        });
        return core;
      },
    );
  }
  return zxcvbnLoad;
}

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
  const [isHidden, setIsHidden] = useState(true);

  const toggleIsHidden = () => setIsHidden((prev) => !prev);

  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!showIndicator) {
      return undefined;
    }
    let isCancelled = false;
    loadZxcvbn().then((core) => {
      if (!isCancelled) {
        setScore(core.zxcvbn(value).score);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [showIndicator, value]);

  return (
    <>
      <div
        className={classNames('password-inputContainer', {
          'password-inputContainerFullWidth': isFullWidth,
        })}
      >
        <Input
          ref={ref}
          type={isHidden ? 'password' : 'text'}
          className={classNames('password-input', className, {
            'password-inputLargeDots': isHidden,
          })}
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

        {!isDisabled && (
          <Button
            size={size}
            className={classNames('password-toggle', {
              'password-toggleS': size === 'small',
              'password-toggleL': size === 'large',
            })}
            type="button"
            aria-label={t(isHidden ? 'common.buttons.password-show' : 'common.buttons.password-hide')}
            icon={isHidden ? <VisibilityIcon /> : <VisibilityOffIcon />}
            variant="secondary"
            isOutlined
            onClick={toggleIsHidden}
          />
        )}
      </div>
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
                  },
                )}
              />
            ))}
          </div>
          <div
            className={classNames('password-score', {
              'password-scoreDanger': score < 2,
            })}
            aria-live="assertive"
          >
            {t(`common.labels.password-strength-${score}`)}
          </div>
        </div>
      )}
    </>
  );
};
