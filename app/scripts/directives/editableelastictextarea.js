// Based on the code from angular-xeditable https://github.com/vitalets/angular-xeditable
angular.module('homeuiApp').directive('editableElasticTextarea', (editableDirectiveFactory) => {
  var directive = editableDirectiveFactory({
    directiveName: 'editableElasticTextarea',
    inputTpl: '<textarea class="form-control" placeholder="{{ placeholder }}" msd-elastic></textarea>',
    addListeners: function () {
      var self = this;
      self.parent.addListeners.call(self);
      // submit textarea by ctrl+enter even with buttons
      if (self.single && self.buttons !== 'no') {
        self.autosubmit();
      }
    },
    autosubmit: function () {
      var self = this;
      self.inputEl.bind('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (e.keyCode === 13)) {
          self.scope.$apply(() => {
            self.scope.$form.$submit();
          });
        }
      });
    }
  });
  var oldLink = directive.link || (() => {});
  directive.link = (scope, element, attrs, ctrl) => {
    oldLink.call(this, scope, element, attrs, ctrl);
    scope.placeholder = element.attr("placeholder") || "";
  };
  return directive;
});
