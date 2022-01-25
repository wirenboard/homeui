function translationService($translate) {
  'ngInject';

  function getPrefixTranslation(p) {
    const trPath = 'units.prefixes.' + p;
    const tr = $translate.instant(trPath);
    if (tr == trPath) {
      return '';
    }
    return tr;
  }

  function getTranslation(p) {
    const trPath = 'units.' + p;
    const tr = $translate.instant(trPath);
    if (tr == trPath) {
      return p;
    }
    return tr;
  }

  return {
    getUnitsName(c) {
      const units = c.baseUnits
      if (!units) {
        return getTranslation(c.units);
      }
      const power = c.unitsPower
      const prefix = getPrefixTranslation(power)
      if (prefix) {
        return prefix + getTranslation(units);
      }
      return getTranslation(units) + "*10^" + power;
    }
  };
}

export default translationService;
