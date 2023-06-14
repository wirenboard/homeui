import { observer } from 'mobx-react-lite';
import React, { useRef, useLayoutEffect } from 'react';
import { get, reaction } from 'mobx';

const getSvgElement = (svg, id) => {
  return svg.querySelector(`#${id}`) || svg.querySelector(`[data-svg-param-id=${id}]`);
};

const SvgView = observer(({ svg, params, values, switchValue, className }) => {
  const svgWrapperRef = useRef();
  useLayoutEffect(() => {
    svgWrapperRef.current.innerHTML = svg;
    let disposers = [];
    params.forEach(param => {
      let el = getSvgElement(svgWrapperRef.current, param.id);
      if (el) {
        if (param?.read?.enable) {
          el = el.querySelector('tspan') || el;
          const fn = new Function('val', `return ${param.read.value}`);
          const disposer = reaction(
            () => get(values, param.read.channel),
            value => {
              el.innerHTML = fn(value);
            },
            { fireImmediately: true }
          );
          disposers.push(disposer);
        }

        if (param?.style?.enable) {
          const fn = new Function('val', `return ${param.style.value}`);
          const oldStyle = el.style.cssText;
          const disposer = reaction(
            () => get(values, param.style.channel),
            value => {
              el.style.cssText = oldStyle + fn(value);
            },
            { fireImmediately: true }
          );
          disposers.push(disposer);
        }

        if (param?.visible?.enable) {
          const fn = new Function(
            'val',
            `return val${param.visible.condition}${param.visible.value}`
          );
          const disposer = reaction(
            () => get(values, param.visible.channel),
            value => {
              el.style.display = fn(value);
            },
            { fireImmediately: true }
          );
          disposers.push(disposer);
        }
        if (param?.write?.enable) {
          el.classList.add('switch');
          const onClick = e => {
            switchValue(param.write.channel, param.write.value);
          };
          el.addEventListener('click', onClick);
          disposers.push(() => {
            el.removeEventListener('click', onClick);
          });
        }
      }
    });

    return () => {
      disposers.forEach(disposer => disposer());
    };
  }, []);

  return <div className={className} ref={svgWrapperRef}></div>;
});

export default SvgView;
