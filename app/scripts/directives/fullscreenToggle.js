import template from "./fullscreenToggle.html";

function fullscreenToggleDirective() {
    "ngInject";

    class FullscreenController {
        constructor($scope, $rootScope, $location) {
            "ngInject";

            const params = $location.search();

            $rootScope.forceFullscreen = params.fullscreen;

            $rootScope.checkFullscreen = () => {
                const fullScreenElement = document.fullscreenElement
                || document.webkitFullscreenElement
                || document.mozFullScreenElement
                || document.msFullscreenElement
                || null;
                
                return (fullScreenElement !== null) || $rootScope.forceFullscreen;
            };
            
            $rootScope.isHMI = params.hmi === true;

            const bgColor = ($rootScope.isHMI && params.hmicolor !== "") ? params.hmicolor : '';
            document.getElementById("page-wrapper").style.backgroundColor = bgColor;

            $rootScope.toggleFullscreen = () => {
                var goFullScreen = null;
                var exitFullScreen = null;
                if ("requestFullscreen" in document.documentElement) {
                    goFullScreen = "requestFullscreen";
                    exitFullScreen = "exitFullscreen";
                } else if ("mozRequestFullScreen" in document.documentElement) {
                    goFullScreen = "mozRequestFullScreen";
                    exitFullScreen = "mozCancelFullScreen";
                } else if (
                    "webkitRequestFullscreen" in document.documentElement
                ) {
                    goFullScreen = "webkitRequestFullscreen";
                    exitFullScreen = "webkitExitFullscreen";
                } else if ("msRequestFullscreen") {
                    goFullScreen = "msRequestFullscreen";
                    exitFullScreen = "msExitFullscreen";
                }

                if ($rootScope.checkFullscreen()) {
                    document[exitFullScreen]();
                } else {
                    document.documentElement[goFullScreen]();
                }
            };

            ['webkitfullscreenchange',
             'mozfullscreenchange',
             'fullscreenchange',
             'MSFullscreenChange',
             'webkitbeginfullscreen',
             'webkitendfullscreen'].forEach( ev => {
                addEventListener(ev, () => {
                    // Request redraw to faster update icon
                    $scope.$apply();
                })
            });
        }
    }

    return {
        restrict: "EA",
        scope: true,
        replace: true,
        controller: FullscreenController,
        template,
    };
}

export default fullscreenToggleDirective;
