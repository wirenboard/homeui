import LZString from "lz-string"

function historyUrlService() {

    //   controls = [
    //     {
    //       d: deviceId
    //       c: controlId
    //       w: widgetId
    //     },
    //     ...
    //   ]
    this.encodeControls = function (controls, startDate, endDate) {
      const data = {
        c: controls,
        s: startDate,
        e: endDate
      };
      return LZString.compressToEncodedURIComponent(JSON.stringify(data))
    };

    this.encodeControl = function (deviceId, controlId, startDate, endDate) {
      return this.encodeControls([{d: deviceId, c: controlId}], startDate, endDate);
    };

    // Returns
    // {
    //   c: [
    //     {
    //       d: deviceId
    //       c: controlId
    //       w: widgetId
    //     },
    //     ...
    //   ],
    //   s: Date // Start date
    //   e: Date // End date
    // }
    this.decode = function (data) {
      try {
        var res = JSON.parse(LZString.decompressFromEncodedURIComponent(data));
        if (res.s) {
          res.s = new Date(res.s);
        }
        if (res.e) {
          res.e = new Date(res.e);
        }
        return res;
      } catch (reason) {}
      return {};
    };
}

export default historyUrlService;
