'use strict';

import React from 'react';
import ReactDOM from 'react-dom/client';
import DevicesPage from './table';

function scanDirective() {
    'ngInject';
    return {
        restrict: 'E',
        scope: {
            data: '='
        },
        link: function (scope, element) {
            if (scope.root) {
                scope.root.unmount();
            }
            scope.root = ReactDOM.createRoot(element[0]);
            scope.root.render(<DevicesPage {...scope.data}/>);

            scope.watcher = scope.$watch('data', function (newValue, oldValue) {
                if (!angular.equals(newValue, oldValue)) {
                    scope.root.render(<DevicesPage {...newValue}/>);
                }
            }, true);

            element.on('$destroy', function() {
                scope.root.unmount();
            });
            scope.$on('$destroy', function() {
                scope.watcher();
            });
        }
    };
}

export default scanDirective;
