import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, FormCheckbox, FormStringEdit, BootstrapRow } from '../common';
import { DndContext, useDroppable, useDraggable } from '@dnd-kit/core';
import { restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from 'react-responsive';
import ConnectionItem from './connectionItem';

const SwitcherElement = ({ connection, moveLeft, moveRight }) => {
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
  const rightIconClass = isMobile
    ? 'glyphicon glyphicon-arrow-down'
    : 'glyphicon glyphicon-arrow-right';
  const onMoveLeft = () => moveLeft(connection);
  const onMoveRight = () => moveRight(connection);

  return (
    <div
      className={
        isDragging ? 'priority-item well well-sm is-dragging' : 'priority-item well well-sm'
      }
      style={style}
      ref={setNodeRef}
    >
      {!isMobile && moveLeft && (
        <Button onClick={onMoveLeft} icon={'glyphicon glyphicon-arrow-left'} />
      )}
      <div className="priority-item-content" {...listeners} {...attributes}>
        <ConnectionItem connection={connection} />
      </div>
      {isMobile && moveLeft && (
        <Button onClick={onMoveLeft} icon={'glyphicon glyphicon-arrow-up'} />
      )}
      {moveRight && <Button onClick={onMoveRight} icon={rightIconClass} />}
    </div>
  );
};

function makeSwitcherList(connections, moveLeft, moveRight) {
  return connections.map(cn => {
    return (
      <SwitcherElement
        key={cn.data.connection_uuid}
        connection={cn}
        moveLeft={moveLeft}
        moveRight={moveRight}
      />
    );
  });
}

const SwitcherColumn = observer(({ tier, moveLeft, moveRight }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: tier.name,
    data: tier,
  });
  return (
    <div className="col-md-4">
      <div className="panel panel-default">
        <div className="panel-heading">
          <h3 className="panel-title">{tier.name}</h3>
        </div>
        <div className={isOver ? 'priority-group is-over' : 'priority-group'} ref={setNodeRef}>
          {makeSwitcherList(tier.connections, moveLeft, moveRight)}
        </div>
      </div>
    </div>
  );
});

const ConnectionPrioritiesEditor = ({ store }) => {
  const onDragEnd = ev => {
    if (ev.over) {
      store.moveConnectionToTier(ev.active.data.current, ev.over.data.current);
    }
  };
  return (
    <>
      <DndContext modifiers={[restrictToFirstScrollableAncestor]} onDragEnd={onDragEnd}>
        <div className="row">
          {store.tiers.map((tier, index) => {
            return (
              <SwitcherColumn
                key={tier.id}
                tier={tier}
                moveLeft={
                  index !== 0
                    ? cn => store.moveConnectionToTier(cn, store.tiers[index - 1])
                    : undefined
                }
                moveRight={
                  index !== store.tiers.length - 1
                    ? cn => store.moveConnectionToTier(cn, store.tiers[index + 1])
                    : undefined
                }
              />
            );
          })}
        </div>
      </DndContext>
    </>
  );
};

const PageButtons = observer(({ switcher, onSave }) => {
  const { t } = useTranslation();
  return (
    <BootstrapRow>
      <div className="col-md-12">
        <div className="pull-right buttons-holder">
          <Button
            key="save"
            label={t('network-connections.buttons.save')}
            type="success"
            onClick={onSave}
            disabled={!switcher.isDirty || switcher.hasErrors}
          />
          <Button
            key="cancel"
            label={t('network-connections.buttons.cancel')}
            type="default"
            onClick={() => switcher.reset()}
            disabled={!switcher.isDirty}
          />
        </div>
      </div>
    </BootstrapRow>
  );
});

const SwitcherForm = observer(({ switcher, onSave }) => {
  return (
    <>
      <ConnectionPrioritiesEditor store={switcher.connectionPriorities} />
      <FormCheckbox store={switcher.debug} />
      <FormStringEdit store={switcher.connectivityUrl} />
      <FormStringEdit store={switcher.connectivityPayload} />
      <FormStringEdit store={switcher.stickySimPeriod} />
      <PageButtons switcher={switcher} onSave={onSave} />
    </>
  );
});

const SwitcherEditor = ({ switcher, onSave }) => {
  return <SwitcherForm switcher={switcher} onSave={onSave} />;
};

export default SwitcherEditor;
