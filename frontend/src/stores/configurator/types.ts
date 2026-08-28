// Черновик редактирования (плоская модель). Устройство несёт тип, группировку (module),
// настройки адаптеров и привязки ролей к контролам. Производное (binding/transform/kind/…)
// достраивает сборка (build-config), здесь только решения оператора.
export interface DeviceDraft {
  did: number; // числовой id; 0–9 резерв, старт с 10, не переиспользовать
  name: string;
  type: string; // тип устройства из каталога
  module: string; // группировка «один физ. прибор» (обяз. для экспорта)
  area?: string; // комната свободным текстом (опц.)
  adapters: Record<string, boolean>; // adapter_settings: в какие цели отдавать
  bindings: Record<string, string>; // role → cell id
  ranges: Record<string, { min: number; max: number; step: number }>; // role → правка диапазона
}
