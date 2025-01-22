/* global angular */

'use strict';

class ScriptsCtrl {
  constructor(EditorProxy, whenMqttReady, errors, rolesFactory, $scope) {
    'ngInject';

    this.EditorProxy = EditorProxy;
    this.errors = errors;

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

    rolesFactory.asyncCheckRights(rolesFactory.ROLE_THREE, () => {
      this.haveRights = true;
      /*
     get list
     /rpc/v1/wbrules/Editor/List/wb-mqtt-homeui-uLo93IW6a0 {"id":1,"params":{}}
     get one
     /rpc/v1/wbrules/Editor/Load/wb-mqtt-homeui-Usf4VuT4Ba {"id":2,"params":{"path":"rules.js"}}
     save
     /rpc/v1/wbrules/Editor/Save/wb-mqtt-homeui-Usf4VuT4Ba {"id":3,"params":{"path":"rules.js","content": ....
     */

      loadList();
    });
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
export default angular.module('homeuiApp.scripts', []).controller('ScriptsCtrl', ScriptsCtrl);
