import { DndContext, useDroppable, useDraggable, type DragEndEvent } from '@dnd-kit/core';
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';
import classNames from 'classnames';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import ArrowDownIcon from '@/assets/icons/arrow-down.svg';
import ArrowLeftIcon from '@/assets/icons/arrow-left.svg';
import ArrowRightIcon from '@/assets/icons/arrow-right.svg';
import ArrowUpIcon from '@/assets/icons/arrow-up.svg';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { StringField, BooleanField } from '@/components/form';
import { useAsyncAction } from '@/utils/async-action';
import { type SingleConnection } from '../../stores/single-connection-store';
import { ConnectionItem } from '../connection-item';
import { type ConnectionPrioritiesEditorProps, type SwitcherColumnProps, type SwitcherProps, type Tier } from './types';
import './styles.css';

const SwitcherElement = ({ connection, moveLeft, moveRight }) => {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: connection.name,
    data: connection,
  });
  const isMobile = useMediaQuery({ maxWidth: 991 });
  const style = transform
    ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    }
    : undefined;
  const onMoveLeft = () => moveLeft(connection);
  const onMoveRight = () => moveRight(connection);

  return (
    <div
      className={classNames('networkSwitcher-priorityItem', {
        'networkSwitcher-priorityItemIsDragging': isDragging,
      })}
      style={style}
      ref={setNodeRef}
    >
      {!isMobile && moveLeft && (
        <Button
          variant="secondary"
          aria-label={t('network-connections.buttons.priority-up')}
          icon={<ArrowLeftIcon />}
          onClick={onMoveLeft}
        />
      )}
      <div className="networkSwitcher-priorityItemContent" {...listeners} {...attributes}>
        <ConnectionItem connection={connection} />
      </div>
      {isMobile && moveLeft && (
        <Button
          variant="secondary"
          aria-label={t('network-connections.buttons.priority-up')}
          icon={<ArrowUpIcon />}
          onClick={onMoveLeft}
        />
      )}
      {moveRight && (
        <Button
          variant="secondary"
          aria-label={t('network-connections.buttons.priority-down')}
          icon={isMobile ? <ArrowDownIcon /> : <ArrowRightIcon />}
          onClick={onMoveRight}
        />
      )}
    </div>
  );
};

const SwitcherColumn = observer(({ tier, moveLeft, moveRight }: SwitcherColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: tier.name,
    data: tier,
  });
  return (
    <div className="networkSwitcher-priorityCardWrapper">
      <Card variant="secondary" heading={tier.name}>
        <div
          className={classNames('networkSwitcher-priorityGroup', { 'networkSwitcher-priorityGroupOver': isOver })}
          ref={setNodeRef}
        >
          {tier.connections.map((cn) => (
            <SwitcherElement
              key={cn.data.connection_uuid}
              connection={cn}
              moveLeft={moveLeft}
              moveRight={moveRight}
            />
          ))}
        </div>
      </Card>
    </div>
  );
});

const ConnectionPrioritiesEditor = ({ store }: ConnectionPrioritiesEditorProps) => {
  const onDragEnd = (ev: DragEndEvent) => {
    if (ev.over) {
      store.moveConnectionToTier(ev.active.data.current as SingleConnection, ev.over.data.current as Tier);
    }
  };

  return (
    <DndContext modifiers={[restrictToFirstScrollableAncestor]} onDragEnd={onDragEnd}>
      <div className="networkSwitcher-editor">
        {store.tiers.map((tier, index) => {
          return (
            <SwitcherColumn
              key={tier.id}
              tier={tier}
              moveLeft={
                index !== 0
                  ? (cn) => store.moveConnectionToTier(cn, store.tiers[index - 1])
                  : undefined
              }
              moveRight={
                index !== store.tiers.length - 1
                  ? (cn) => store.moveConnectionToTier(cn, store.tiers[index + 1])
                  : undefined
              }
            />
          );
        })}
      </div>
    </DndContext>
  );
};

export const SwitcherEditor = observer(({ switcher, onSave }: SwitcherProps) => {
  const { t } = useTranslation();

  const [onConfirmSave, isSaving] = useAsyncAction(async () => {
    await onSave();
  });

  return (
    <div className="networkSwitcher">
      <div className="networkSwitcher-description">
        {t('network-connections.labels.switcher-desc')}
      </div>
      <ConnectionPrioritiesEditor store={switcher.connectionPriorities} />

      <div className="networkSwitcher-fields">
        <BooleanField
          title={switcher.debug.name}
          value={switcher.debug.value}
          onChange={(value) => switcher.debug.setValue(value)}
        />
        <StringField
          title={switcher.connectivityUrl.name}
          description={switcher.connectivityUrl.description}
          defaultText={switcher.connectivityUrl.defaultText}
          value={switcher.connectivityUrl.value}
          error={switcher.connectivityUrl.error}
          onChange={(value: string) => switcher.connectivityUrl.setValue(value)}
        />
        <StringField
          title={switcher.connectivityPayload.name}
          description={switcher.connectivityPayload.description}
          defaultText={switcher.connectivityPayload.defaultText}
          value={switcher.connectivityPayload.value}
          error={switcher.connectivityPayload.error}
          onChange={(value: string) => switcher.connectivityPayload.setValue(value)}
        />
        <StringField
          title={switcher.stickyConnectionPeriod.name}
          description={switcher.stickyConnectionPeriod.description}
          defaultText={switcher.stickyConnectionPeriod.defaultText}
          value={switcher.stickyConnectionPeriod.value}
          error={switcher.stickyConnectionPeriod.error}
          onChange={(value: number) => switcher.stickyConnectionPeriod.setValue(value)}
        />
      </div>

      <div className="networkSwitcher-actions">
        <Button
          label={t('network-connections.buttons.cancel')}
          variant="secondary"
          disabled={!switcher.isDirty}
          onClick={() => switcher.reset()}
        />
        <Button
          label={t('network-connections.buttons.save')}
          disabled={!switcher.isDirty || switcher.hasErrors}
          isLoading={isSaving}
          onClick={onConfirmSave}
        />
      </div>
    </div>
  );
});
