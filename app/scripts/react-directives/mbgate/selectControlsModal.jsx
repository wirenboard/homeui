import React, { useEffect, useState, useRef } from 'react';
import SimpleModal from '../components/modals/simpleModal';
import { observer } from 'mobx-react-lite';
import { Tree } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import { LineEdit } from '../common';
import { useTranslation } from 'react-i18next';

const searchFn = (node, term) => {
  const patternJson = JSON.parse(term);
  if (node.isLeaf) {
    const matchParent =
      patternJson.devicePattern.length === 0 ||
      node.parent.data.name.toLowerCase().includes(patternJson.devicePattern);
    if (!matchParent) {
      return false;
    }
    return (
      patternJson.controlPattern.length === 0 ||
      node.data.name.toLowerCase().includes(patternJson.controlPattern)
    );
  }
  if (patternJson.devicePattern.length === 0 && patternJson.controlPattern.length !== 0) {
    return false;
  }
  return node.data.name.toLowerCase().includes(patternJson.devicePattern);
};

const Node = ({ node, style, dragHandle, tree }) => {
  const toggleSelection = e => {
    let selected = tree.selectedIds;
    if (node.isSelected) {
      selected.delete(node.data.id);
      if (!node.isLeaf) {
        node.children.forEach(child => selected.delete(child.data.id));
      } else {
        if (node.parent.children.some(child => !selected.has(child.data.id))) {
          selected.delete(node.parent.data.id);
        }
      }
    } else {
      selected.add(node.data.id);
      if (!node.isLeaf) {
        node.children.forEach(child => selected.add(child.data.id));
      } else {
        if (node.parent.children.every(child => selected.has(child.data.id))) {
          selected.add(node.parent.data.id);
        }
      }
    }
    tree.setSelection({
      ids: Array.from(selected),
      anchor: null,
      mostRecent: node.data.id,
    });
    e.preventDefault();
    e.stopPropagation();
  };
  return (
    <div
      style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center' }}
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {!node.isLeaf && (
        <i
          className={
            node.isOpen ? 'glyphicon glyphicon-chevron-right' : 'glyphicon glyphicon-chevron-down'
          }
          onClick={e => {
            node.toggle();
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{ cursor: 'pointer', top: '0px' }}
        />
      )}
      <div
        style={{
          cursor: 'pointer',
          backgroundColor: node.isSelected ? 'lightblue' : 'white',
          marginLeft: node.isLeaf ? '25px' : '3px',
        }}
        onClick={toggleSelection}
      >
        <span>{node.data.name}</span>
        <span style={{ color: 'gray' }}>{` (${node.data.mqttId})`}</span>
      </div>
    </div>
  );
};

const SelectControlsModal = observer(({ state }) => {
  const { t } = useTranslation();
  const treeRef = useRef(null);
  const { ref, width, height } = useResizeObserver();
  const [devicePattern, setDevicePattern] = useState('');
  const [controlPattern, setControlPattern] = useState('');
  useEffect(() => {
    if (state.selected.length === 0) {
      treeRef.current?.setSelection({
        ids: [],
        anchor: null,
        mostRecent: null,
      });
    }
  }, [state.selected]);
  return (
    <SimpleModal {...state.simpleModalState}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', marginBottom: '10px' }}>
        <LineEdit
          placeholder={t('mbgate.labels.search-device')}
          value={devicePattern}
          onChange={e => setDevicePattern(e.target.value)}
        />
        <LineEdit
          placeholder={t('mbgate.labels.search-control')}
          value={controlPattern}
          onChange={e => setControlPattern(e.target.value)}
        />
      </div>
      <div ref={ref}>
        <Tree
          data={state.controls}
          width={width}
          height={height}
          searchTerm={JSON.stringify({
            devicePattern: devicePattern.toLowerCase(),
            controlPattern: controlPattern.toLowerCase(),
          })}
          searchMatch={searchFn}
          disableEdit={true}
          disableDrag={true}
          disableDrop={true}
          selectionFollowsFocus={false}
          onSelect={selected => {
            state.selected = selected;
          }}
          ref={treeRef}
        >
          {Node}
        </Tree>
      </div>
    </SimpleModal>
  );
});

export default SelectControlsModal;
