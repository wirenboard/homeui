'use strict';

import React from 'react';
import ReactDOM from 'react-dom/client';
import DevicesPage from './table';

const dummyData = {
  "progress": 15,
  "scanning": false,
  "devices": [
    {
      "uuid": "05a822a1-f326-3dbe-9dad-56921ecfa0f1",
      "port": {
        "path": "/dev/ttyRS485-1"
      },
      "title": "Scanned device",
      "sn": "4264834454",
      "device_signature": "WB-LED",
      "fw_signature": "ledG",
      "online": true,
      "poll": false,
      "last_seen": 1669716800,
      "bootloader_mode": false,
      "error": null,
      "cfg": {
        "slave_id": 3,
        "baud_rate": 9600,
        "parity": "N",
        "data_bits": 8,
        "stop_bits": 2
      },
      "fw": {
        "version": "3.3.1",
        "update": {
          "progress": 0,
          "error": null,
          "available_fw": null
        }
      }
    },
    {
      "uuid": "8b0bbb7b-8016-351f-b5ba-c22ae3da4002",
      "port": {
        "path": "/dev/ttyRS485-1"
      },
      "title": "Scanned device",
      "sn": "4264816601",
      "device_signature": "WB-LED",
      "fw_signature": "ledG",
      "online": false,
      "poll": false,
      "last_seen": 1669716799,
      "bootloader_mode": false,
      "error": "Armageddon!!!!!",
      "cfg": {
        "slave_id": 1,
        "baud_rate": 9600,
        "parity": "N",
        "data_bits": 8,
        "stop_bits": 2
      },
      "fw": {
        "version": "3.3.1",
        "update": {
          "progress": 0,
          "error": null,
          "available_fw": "3.3.2"
        }
      }
    },
    {
      "uuid": "8b0bbb7b-8016-351f-b5ba-c22ae3da4003",
      "port": {
        "path": "/dev/ttyRS485-1"
      },
      "title": "Scanned device",
      "sn": "4264816602",
      "device_signature": "WB-LED",
      "fw_signature": "ledG",
      "online": false,
      "poll": false,
      "last_seen": 1669716799,
      "bootloader_mode": false,
      "error": null,
      "cfg": {
        "slave_id": 1,
        "baud_rate": 9600,
        "parity": "N",
        "data_bits": 8,
        "stop_bits": 2
      },
      "fw": {
        "version": "3.3.1",
        "update": {
          "progress": 0,
          "error": "Update error",
          "available_fw": "3.3.2"
        }
      }
    },
    {
      "uuid": "8b0bbb7b-8016-351f-b5ba-c22ae3da4001",
      "port": {
        "path": "/dev/ttyRS485-1"
      },
      "title": "Scanned device",
      "sn": "4264816600",
      "device_signature": "WB-LED",
      "fw_signature": "ledG",
      "online": false,
      "poll": false,
      "last_seen": 1669716799,
      "bootloader_mode": false,
      "error": null,
      "cfg": {
        "slave_id": 1,
        "baud_rate": 9600,
        "parity": "N",
        "data_bits": 8,
        "stop_bits": 2
      },
      "fw": {
        "version": "3.3.1",
        "update": {
          "progress": 0,
          "error": null,
          "available_fw": "3.3.2"
        }
      }
    }
  ]
};


function scanDirective() {
    'ngInject';
    return {
        restrict: 'E',
        scope: {
          data: '='
        },
        link: function (scope, element, attrs, controller, transclude) {
            if (scope.root) {
              scope.root.unmount();
            }
            scope.root = ReactDOM.createRoot(element[0]);
            scope.$watch('data', function (newValue, oldValue) {
              const data = newValue || data;
              scope.root.render(<DevicesPage {...dummyData}/>);
            });
            element.on('$destroy', function() {
              scope.root.unmount();
            });
        }
    };

}

export default scanDirective;
