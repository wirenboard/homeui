import Plotly from 'plotly.js-basic-dist-min';
import ruLocale from 'plotly.js-locales/ru';
import { type PlotParams } from 'react-plotly.js';
import createPlotlyComponent from 'react-plotly.js/factory';
import './styles.css';

Plotly.register(ruLocale);

const Plot = createPlotlyComponent(Plotly);

export const Chart = ({ data, layout, config, onRelayout }: PlotParams) => (
  <Plot
    data={data}
    layout={layout}
    config={config}
    style={{ width: '100%', height: '100%' }}
    useResizeHandler
    onRelayout={onRelayout}
  />
);
