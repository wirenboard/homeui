class ScriptsCtrl {
  constructor(EditorProxy, whenMqttReady, errors, rolesFactory) {
    'ngInject';

    this.EditorProxy = EditorProxy;
    this.errors = errors;
    this.haveRights = rolesFactory.checkRights(rolesFactory.ROLE_THREE);
    if(!this.haveRights) return;
    /*
     get list
     /rpc/v1/wbrules/Editor/List/contactless-uLo93IW6a0 {"id":1,"params":{}}
     get one
     /rpc/v1/wbrules/Editor/Load/contactless-Usf4VuT4Ba {"id":2,"params":{"path":"rules.js"}}
     save
     /rpc/v1/wbrules/Editor/Save/contactless-Usf4VuT4Ba {"id":3,"params":{"path":"rules.js","content": ....
     */

    whenMqttReady().then( ()=>
        EditorProxy.List()
    ).then(scripts=> {
      // пишу каждому временное имя
      this.scripts = scripts.map(script=> {
        script.tempName = script.virtualPath;
        script.processingRequest = false;
        return script
      })
    }).catch(errors.catch("Error listing the scripts"));
  }

  deleteScript(index) {
    if(confirm('Are you sure?')) {
      this.EditorProxy.Remove({path: this.scripts[index].virtualPath}).then(script=>{
        this.scripts.splice(index,1);
      },err=>alert("error"))
    }
  }
}

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.scripts', [])
    .controller('ScriptsCtrl', ScriptsCtrl);
