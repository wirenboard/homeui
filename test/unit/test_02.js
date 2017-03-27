import appModule from '../../app/scripts/app';

describe("Import application main module", () => {
  beforeEach(() => {
    angular.mock.module(appModule);
  });

  it("should display module name", () => {
    expect(appModule).toEqual('homeuiApp');
  });
});
