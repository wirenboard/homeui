import scriptEditorDirective from '../react-directives/script-editor/script-editor';

class ScriptsCtrl {
  constructor(EditorProxy, whenMqttReady, errors, rolesFactory, $scope) {
    'ngInject';

    this.EditorProxy = EditorProxy;
    this.errors = errors;
    this.haveRights = rolesFactory.checkRights(rolesFactory.ROLE_THREE);
    if (!this.haveRights) return;

    const loadList = () => {
      whenMqttReady()
        .then(() => EditorProxy.List())
        .then(scripts => {
          console.log('scripts', scripts);
          // пишу каждому временное имя
          this.scripts = scripts.map(script => {
            script.tempName = script.virtualPath;
            script.processingRequest = false;
            return script;
          });
        })
        .catch('rules.errors.list');
    };

    /*
     get list
     /rpc/v1/wbrules/Editor/List/wb-mqtt-homeui-uLo93IW6a0 {"id":1,"params":{}}
     get one
     /rpc/v1/wbrules/Editor/Load/wb-mqtt-homeui-Usf4VuT4Ba {"id":2,"params":{"path":"rules.js"}}
     save
     /rpc/v1/wbrules/Editor/Save/wb-mqtt-homeui-Usf4VuT4Ba {"id":3,"params":{"path":"rules.js","content": ....
     */

    loadList();
  }

  deleteScript(index) {
    var path = this.scripts[index].virtualPath;
    this.EditorProxy.Remove({ path: path }).then(
      script => {
        this.scripts.splice(index, 1);
      },
      err => alert(err)
    );
  }
}

//-----------------------------------------------------------------------------
export default angular
  .module('homeuiApp.scripts', [])
  .controller('ScriptsCtrl', ScriptsCtrl)
  .directive('scriptEditorPage', scriptEditorDirective);
