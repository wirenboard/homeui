"use strict";

angular.module("homeuiApp")
  .factory("uiConfig", () => {
    return {
      data: {
        rooms: [
          {
            id: "default",
            name: "Default Room",
            widgets: [
              {
                name: "Temperature 1",
                compact: true,
                cells: [
                  { id: "Weather/Temp 1" }
                ]
              }
            ]
          }
        ]
      }
    };
  });
