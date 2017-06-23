class ScriptsCtrl {
  constructor(EditorProxy, whenMqttReady, errors) {
    'ngInject';

    this.EditorProxy = EditorProxy;
    this.errors = errors;
    /*
     get list
     /rpc/v1/wbrules/Editor/List/contactless-uLo93IW6a0 {"id":1,"params":{}}
     get one
     * /rpc/v1/wbrules/Editor/Load/contactless-Usf4VuT4Ba {"id":2,"params":{"path":"rules.js"}}
     save
     /rpc/v1/wbrules/Editor/Save/contactless-Usf4VuT4Ba {"id":3,"params":{"path":"rules.js","content": ....
     */

    this.renamedScripts = [];
    this.deletedScripts = [];

    whenMqttReady().then( ()=>
        EditorProxy.List()
    ).then(scripts=> {
      // пишу каждому временное имя
      this.scripts = scripts.map(script=> {
        script.tempName = script.virtualPath;
        return script
      })
    }).catch(errors.catch("Error listing the scripts"));
  }

  renameMode(index) {
    this.renamedScripts[index] = true
  }

  undoRename(index) {
    this.renamedScripts[index] = false
  }

  save(index) {
    var path = this.scripts[index].virtualPath;
    if (path == this.scripts[index].tempName)
      return;
    // приходится сначала запрашивать скрипт изза отсутствия поля контент в списке скриптов
    this.EditorProxy.Load({path}).then(script=>{
      console.log("script",script);
      this.EditorProxy.Save({
            path: this.scripts[index].virtualPath,
            content: script.content
          })
          .then(data=> {
            // after save
            this.scripts[index].virtualPath = this.scripts[index].tempName;
            this.renamedScripts[index] = false
          })
          .catch(this.errors.catch("Error saving the file"))
    })
  }

  restart(index) {
    alert("restart Script N " + index)

  }

  toggleScript(index) {//отключить/включить
    alert("toggle Script N " + index)

  }

  deleteMode(index) {
    this.deletedScripts[index] = !this.deletedScripts[index];
  }

  deleteScript(index) {
    this.EditorProxy.Remove({path: this.scripts[index].virtualPath}).then(script=>{

    })
  }
}

//-----------------------------------------------------------------------------
export default angular
    .module('homeuiApp.scripts', [])
    .controller('ScriptsCtrl', ScriptsCtrl);
