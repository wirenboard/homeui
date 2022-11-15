import template from "./fullscreenToggle.html";

function fullscreenToogleDirective() {
    "ngInject";

    class FullscreenController {
        constructor($rootScope, $location) {
            "ngInject";

            const params = $location.search();

            $rootScope.isHMI = params.hmi === true;
            $rootScope.isFullscreen =
                params.fullscreen === true || $rootScope.isHMI;

            if (params.hmi === true && params.hmicolor !== "") {
                document.getElementById("page-wrapper").style.backgroundColor =
                    params.hmicolor;
            }

            $rootScope.toogleFullscreen = () => {
                $rootScope.isFullscreen = !$rootScope.isFullscreen;
                if ($rootScope.isFullscreen) {
                    document.documentElement.requestFullscreen();
                } else {
                    document.exitFullscreen();
                }
                $location.search(
                    "fullscreen",
                    $rootScope.isFullscreen ? true : null
                );
            };

            document.onkeydown = function (evt) {
                evt = evt || window.event;
                if (evt.key == "Escape" && $rootScope.isFullscreen) {
                    $rootScope.toogleFullscreen();
                }
            };
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

export default fullscreenToogleDirective;
