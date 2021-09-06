export default function confirmDirective() {
    return {
        link: function (scope, element, attr) {
            var msg = attr.ngConfirm || "Are you sure?";
            var clickAction = attr.confirmedClick;
            element.bind('click', function (event) {
                if ( window.confirm(msg) ) {
                    scope.$eval(clickAction)
                }
            });
        }
    };
}