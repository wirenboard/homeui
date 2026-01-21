import { get, reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useRef, useLayoutEffect } from 'react';
import type { SvgViewProps, ParamProps } from './types';

const getSvgElement = (svg: Element, id: string) => {
  return svg.querySelector(`#${id}`) || svg.querySelector(`[data-svg-param-id=${id}]`);
};

const setReadHandler = (element, param: ParamProps, values) => {
  let el = element.querySelector('tspan') || element;
  let fn = undefined;
  try {
    fn = new Function('val', `return ${param.value}`);
  } catch (e) {
    // Syntax error in rule
  }
  return reaction(
    () => get(values, param.channel),
    (value) => {
      if (fn) {
        try {
          el.innerHTML = fn(value);
        } catch (e) {
          // Exception in rule
        }
      }
    },
    { fireImmediately: true }
  );
};

const setStyleHandler = (element, param: ParamProps, values) => {
  let fn = undefined;
  try {
    fn = new Function('val', `return ${param.value}`);
  } catch (e) {
    // Syntax error in rule
  }

  const oldStyle = element.style.cssText;
  return reaction(
    () => get(values, param.channel),
    (value) => {
      if (fn) {
        try {
          element.style.cssText = oldStyle + fn(value);
        } catch (e) {
          // Exception in rule
        }
      }
    },
    { fireImmediately: true }
  );
};

const setVisibleHandler = (element, param: ParamProps, values) => {
  let fn;
  try {
    fn = new Function('val', `return val${param.condition}${param.value}`);
  } catch (e) {
    // Syntax error in rule
  }
  return reaction(
    () => get(values, param.channel),
    (value) => {
      if (fn) {
        try {
          element.style.display = fn(value) ? '' : 'none';
        } catch (e) {
          // Exception in rule
        }
      }
    },
    { fireImmediately: true }
  );
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
  const onDown = (ev) => {
    ev.stopPropagation();
    timerId = setTimeout(onLongPress, 500);
    element.setPointerCapture(ev.pointerId);
  };

  const onCancel = (ev) => {
    clearTimeout(timerId);
    element.releasePointerCapture(ev.pointerId);
  };

  const dummyHandler = (ev) => {
    ev.preventDefault();
  };

  element.classList.add('switch');
  element.addEventListener('pointerdown', onDown);
  element.addEventListener('pointerup', onCancel);
  element.addEventListener('contextmenu', dummyHandler);
  return () => {
    element.removeEventListener('pointerdown', onDown);
    element.removeEventListener('pointerup', onCancel);
    element.removeEventListener('contextmenu', dummyHandler);
  };
};

export const SvgView = observer(({
  svg,
  params,
  id,
  currentDashboard,
  values,
  className,
  confirmHandler,
  onSwitchValue,
  onMoveToDashboard,
}: SvgViewProps) => {
  const svgWrapperRef = useRef(null);

  useLayoutEffect(() => {
    svgWrapperRef.current.innerHTML = svg;
    let disposers = [];

    if (id === currentDashboard) {
      params.forEach((param) => {
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
              setClickHandler(el, async () => {
                if (!param?.write?.check || await confirmHandler()) {
                  onSwitchValue(param.write.channel, param.write.value);
                }
              })
            );
          } else if (param?.click?.enable) {
            disposers.push(setClickHandler(el, () => onMoveToDashboard(param.click.dashboard)));
          }
          if (param['long-press']?.enable) {
            disposers.push(
              setLongPressHandler(el, () => onMoveToDashboard(param['long-press'].dashboard))
            );
          } else if (param['long-press-write']?.enable) {
            disposers.push(
              setLongPressHandler(el, () => {
                onSwitchValue(param['long-press-write'].channel, param['long-press-write'].value);
              })
            );
          }
        }
      });
    }

    return () => {
      disposers.forEach((disposer) => disposer());
      disposers = null;
      svgWrapperRef.current.innerHTML = '';
    };
  }, [svg, id, currentDashboard]);

  return <div className={className} ref={svgWrapperRef}></div>;
});
