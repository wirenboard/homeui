export class ChartColors {
  colors = [
    { chartColor: 'rgb(31,119,180)', minMaxColor: 'rgba(31,119,180,0.2)' },
    { chartColor: 'rgb(255,127,14)', minMaxColor: 'rgba(255,127,14,0.2)' },
    { chartColor: 'rgb(44,160,44)', minMaxColor: 'rgba(44,160,44,0.2)' },
    { chartColor: 'rgb(214,39,40)', minMaxColor: 'rgba(214,39,40,0.2)' },
    { chartColor: 'rgb(148,103,189)', minMaxColor: 'rgba(148,103,189,0.2)' },
    { chartColor: 'rgb(140,86,75)', minMaxColor: 'rgba(140,86,75,0.2)' },
    { chartColor: 'rgb(227,119,194)', minMaxColor: 'rgba(227,119,194,0.2)' },
    { chartColor: 'rgb(127,127,127)', minMaxColor: 'rgba(127,127,127,0.2)' },
    { chartColor: 'rgb(188,189,34)', minMaxColor: 'rgba(188,189,34,0.2)' },
    { chartColor: 'rgb(23,190,207)', minMaxColor: 'rgba(23,190,207,0.2)' },
  ];
  index = 0;

  nextColor() {
    const color = this.colors[this.index];
    this.index += 1;
    if (this.index >= this.colors.length) {
      this.index = 0;
    }
    return color;
  }
}
