import { observer } from 'mobx-react-lite';
import React, { useRef, useLayoutEffect } from 'react';
import { get, reaction } from 'mobx';

const getSvgElement = (svg, id) => {
  return svg.querySelector(`#${id}`) || svg.querySelector(`[data-svg-param-id=${id}]`);
};

const setReadHandler = (element, param, values) => {
  let el = element.querySelector('tspan') || element;
  const fn = new Function('val', `return ${param.value}`);
  const disposer = reaction(
    () => get(values, param.channel),
    value => {
      el.innerHTML = fn(value);
    },
    { fireImmediately: true }
  );
  return disposer;
};

const setStyleHandler = (element, param, values) => {
  const fn = new Function('val', `return ${param.value}`);
  const oldStyle = element.style.cssText;
  const disposer = reaction(
    () => get(values, param.channel),
    value => {
      element.style.cssText = oldStyle + fn(value);
    },
    { fireImmediately: true }
  );
  return disposer;
};

const setVisibleHandler = (element, param, values) => {
  const fn = new Function('val', `return val${param.condition}${param.value}`);
  const disposer = reaction(
    () => get(values, param.channel),
    value => {
      element.style.display = fn(value);
    },
    { fireImmediately: true }
  );
  return disposer;
};

const setClickHandler = (element, onClick) => {
  element.classList.add('switch');
  element.addEventListener('click', onClick);
  return () => {
    element.removeEventListener('click', onClick);
  };
};

const setLongPressHandler = (element, onLongPress) => {
  let timerId = null;
  const onDown = ev => {
    timerId = setTimeout(onLongPress, 500);
    element.setPointerCapture(ev.pointerId);
  };

  const onCancel = ev => {
    clearTimeout(timerId);
    element.releasePointerCapture(ev.pointerId);
  };

  element.classList.add('switch');
  element.addEventListener('pointerdown', onDown);
  element.addEventListener('pointerup', onCancel);
  element.addEventListener('pointercancel', onCancel);
  return () => {
    element.removeEventListener('pointerdown', onDown);
    element.removeEventListener('pointerup', onCancel);
    element.removeEventListener('pointercancel', onCancel);
  };
};

const SvgView = observer(({ svg, params, values, className, onSwitchValue, onMoveToDashboard }) => {
  const svgWrapperRef = useRef();
  useLayoutEffect(() => {
    svgWrapperRef.current.innerHTML = svg;
    let disposers = [];
    params.forEach(param => {
      let el = getSvgElement(svgWrapperRef.current, param.id);
      if (el) {
        if (param?.read?.enable) {
          disposers.push(setReadHandler(el, param.read, values));
        }
        if (param?.style?.enable) {
          disposers.push(setStyleHandler(el, param.style, values));
        }
        if (param?.visible?.enable) {
          disposers.push(setVisibleHandler(el, param.visible, values));
        }
        if (param?.write?.enable) {
          disposers.push(
            setClickHandler(el, () => onSwitchValue(param.write.channel, param.write.value))
          );
        } else {
          if (param?.click?.enable) {
            disposers.push(setClickHandler(el, () => onMoveToDashboard(param.click.dashboard)));
          }
        }
        if (param['long-press']?.enable) {
          disposers.push(
            setLongPressHandler(el, () => onMoveToDashboard(param['long-press'].dashboard))
          );
        } else {
          if (param['long-press-write']?.enable) {
            disposers.push(
              setLongPressHandler(el, () =>
                onSwitchValue(param['long-press-write'].channel, param['long-press-write'].value)
              )
            );
          }
        }
      }
    });

    return () => {
      disposers.forEach(disposer => disposer());
    };
  }, [svg]);

  return <div className={className} ref={svgWrapperRef}></div>;
});

export default SvgView;
