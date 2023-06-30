import { observer } from 'mobx-react-lite';
import React, { useRef, useEffect, useState } from 'react';

const findElement = target => {
  const allowedNodes = ['path', 'circle', 'text', 'rect'];
  if (allowedNodes.includes(target.nodeName)) {
    return target;
  }
  let el = null;
  allowedNodes.find(v => {
    el = target.closest(v);
    return el;
  });
  return el;
};

const getElement = (e, selectedElement) => {
  const elements = document.elementsFromPoint(e.clientX, e.clientY);
};

const SvgView = observer(({ svg, onSelectElement, className }) => {
  const svgWrapperRef = useRef();
  const [selectedElement, setSelectedElement] = useState(null);
  useEffect(() => {
    svgWrapperRef.current.innerHTML = svg;
    setSelectedElement(null);
  }, [svg]);

  const onClick = e => {
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const editable = findElement(e.target || e.srcElement);
    if (onSelectElement) {
      onSelectElement(editable);
    }
    setSelectedElement(editable);
  };

  return <div className={className} ref={svgWrapperRef} onClick={onClick}></div>;
});

export default SvgView;
