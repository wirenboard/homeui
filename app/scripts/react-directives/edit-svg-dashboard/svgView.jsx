import { observer } from 'mobx-react-lite';
import React, { useRef, useEffect, useState } from 'react';

const isAllowedBindableElement = element => {
  const allowedNodes = ['path', 'circle', 'text', 'rect', 'g'];
  return allowedNodes.includes(element?.nodeName);
};

const getBindableElement = element => {
  return element?.tagName === 'tspan' ? element.parentElement : element;
};

const getParentGroups = element => {
  let res = [];
  for (let el = element; el && el.tagName !== 'svg'; el = el.parentElement) {
    if (el.tagName === 'g') {
      res.push(el);
    }
  }
  return res;
};

const getBindableElementsAndGroups = (elementsUnderCursor, withGroups) => {
  const isUnique = (value, index, array) => {
    return array.indexOf(value) === index;
  };

  return elementsUnderCursor
    .flatMap(el => {
      let res = withGroups ? getParentGroups(el) : [];
      if (el && !res.length) {
        res.push(getBindableElement(el));
      }
      return res;
    })
    .filter(isUnique);
};

const findBindableElement = elements => {
  for (let i = 0; i < elements.length && elements[i].tagName !== 'svg'; ++i) {
    if (isAllowedBindableElement(elements[i])) {
      return elements[i];
    }
  }
  return null;
};

const getElement = (e, currentElement) => {
  const elements = getBindableElementsAndGroups(
    document.elementsFromPoint(e.clientX, e.clientY),
    e.getModifierState('Alt')
  );
  const index = elements.findIndex(v => v === currentElement);
  if (index !== -1) {
    return (
      findBindableElement(elements.slice(index + 1)) ||
      findBindableElement(elements.slice(0, index)) ||
      currentElement
    );
  }
  return findBindableElement(elements);
};

const SvgView = observer(({ svg, onSelectElement, className }) => {
  const svgWrapperRef = useRef();
  const [selectedElement, setSelectedElement] = useState(null);
  useEffect(() => {
    svgWrapperRef.current.innerHTML = svg;
    setSelectedElement(null);
  }, [svg]);

  const onClick = e => {
    const editable = getElement(e, selectedElement);
    if (onSelectElement) {
      onSelectElement(editable);
    }
    setSelectedElement(editable);
  };

  return <div className={className} ref={svgWrapperRef} onClick={onClick}></div>;
});

export default SvgView;
