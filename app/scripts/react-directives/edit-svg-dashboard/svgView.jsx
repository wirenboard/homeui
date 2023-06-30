import { observer } from 'mobx-react-lite';
import React, { useRef, useEffect } from 'react';

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

const SvgView = observer(({ svg, onSelectElement, className }) => {
  const svgWrapperRef = useRef();
  useEffect(() => {
    svgWrapperRef.current.innerHTML = svg;
  }, [svg]);

  const onClick = e => {
    var editable = findElement(e.target || e.srcElement);
    if (editable) {
      if (onSelectElement) {
        onSelectElement(editable);
      }
    }
  };

  return <div className={className} ref={svgWrapperRef} onClick={onClick}></div>;
});

export default SvgView;
