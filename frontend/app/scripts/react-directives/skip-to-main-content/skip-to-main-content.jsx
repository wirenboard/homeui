import ReactDOM from 'react-dom/client';
import { SkipToContentButton } from '@/components/skip-to-content-button';
import { setReactLocale } from '~/react-directives/locale';

export default function skipToMainContentDirective() {
  'ngInject';
  setReactLocale();

  return {
    restrict: 'E',
    scope: {},
    link: function (scope, element) {
      scope.root = ReactDOM.createRoot(element[0]);
      scope.root.render(
        <SkipToContentButton />
      );
    },
  };
}
