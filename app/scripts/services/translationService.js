function translationService($translate) {
  'ngInject';

  return {
    getUnitsName(c) {
      const units = c.units
      const trPath = 'units.' + units;
      const tr = $translate.instant(trPath);
      if (tr == trPath) {
        return units;
      }
      return tr;
    }
  };
}

export default translationService;
