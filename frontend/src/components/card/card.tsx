import classNames from 'classnames';
import { PropsWithChildren, MouseEvent, KeyboardEvent } from 'react';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';
import ChevronRightIcon from '@/assets/icons/chevron-right.svg';
import { Tooltip } from '@/components/tooltip';
import { CardAction, CardProps } from './types';
import './styles.css';

const CardActionUrl = ({ action, id }: { action: CardAction; id?: string }) => {
  return (
    <Tooltip
      text={action.title}
      placement="top"
    >
      <a
        href={action.url(id)}
        className="card-action"
        onClick={(ev) => ev.stopPropagation()}
      >
        <action.icon />
      </a>
    </Tooltip>
  );
};

const CardActionButton = ({ action, id }: { action: CardAction; id?: string }) => {
  const actionCall = (ev: MouseEvent<HTMLButtonElement>) => {
    ev.stopPropagation();
    action.action(id);
  };

  if (action.disabled) {
    return (
      <button
        type="button"
        className="card-action"
        disabled={true}
      >
        <action.icon />
      </button>
    );
  }

  return (
    <Tooltip
      text={action.title}
      placement="top"
    >
      <button
        type="button"
        className="card-action"
        disabled={action.disabled}
        onClick={actionCall}
      >
        <action.icon />
      </button>
    </Tooltip>
  );
};

const CardHeader = ({
  id, heading, actions = [], toggleBody, isBodyVisible, withError,
}: CardProps) => {
  return (
    <>
      <h4 className={classNames('card-title', { 'card-titleWithError': withError })}>{heading}</h4>

      {(!!actions.length || !!toggleBody) && (
        <div className="card-actions">
          {actions.map((action, i) => (
            action.url ? (
              <CardActionUrl action={action} id={id} key={i} />
            ) : (
              <CardActionButton action={action} id={id} key={i} />
            )
          ))}
          {!!toggleBody && (
            isBodyVisible ? <ChevronDownIcon className="card-toggle" /> : <ChevronRightIcon className="card-toggle" />
          )}
        </div>
      )}
    </>
  );
};

export const Card = ({
  children, id, className, heading, actions, toggleBody, withError, isBodyVisible = true, variant = 'primary',
}: PropsWithChildren<CardProps>) => {
  const onKeyHeaderClick = (ev: KeyboardEvent<HTMLDivElement>) => {
    const target = ev.target as HTMLElement;

    const isHeader = target.classList.contains('card-headerContainer')
      || target.classList.contains('card-header');

    const isAcceptKey = ev.key === 'Enter' || ev.key === ' ';

    if (isHeader && isAcceptKey) {
      ev.preventDefault();
      toggleBody();
    }
  };

  return (
    <div
      className={classNames('card', className, {
        'card-primary': variant === 'primary',
        'card-secondary': variant === 'secondary',
      })}
      id={id}
    >
      {toggleBody ? (
        <div className="card-headerContainer">
          <div
            role="button"
            className="card-header card-headerToggable"
            tabIndex={0}
            onClick={toggleBody}
            onKeyDown={onKeyHeaderClick}
          >
            <CardHeader
              heading={heading}
              id={id}
              actions={actions}
              isBodyVisible={isBodyVisible}
              toggleBody={toggleBody}
              withError={withError}
            />
          </div>
        </div>
      ) : (
        <div className="card-header">
          <CardHeader heading={heading} id={id} actions={actions} withError={withError} />
        </div>
      )}

      {isBodyVisible && (<div className="card-body">{children}</div>)}
    </div>
  );
};
