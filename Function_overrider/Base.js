/*
 * Module from "DOMSnitch" project.
 * Performs the actual overriding instructions.
 */

DOMSnitch.Modules.Base = function() {
};

DOMSnitch.Modules.Base.prototype = {
  	_overloadMethod: function(target, type, methodPtr, callback) {
    
		console.log("Method overloading..");

		var targetMethod = typeof target == "string" ? this._targets[target] : target;    
        
    		if(targetMethod.funcName) {
      			// this kind of override cannot be undone
      			Object.defineProperty(targetMethod.obj, targetMethod.funcName, {value: methodPtr});
    		}
  	},
  	generateGlobalId: function() {
    		throw Error("generateGlobalId() is not implemented.");
  	},

  	load: function() {
    		throw Error("load() is not implemented.");
  	},

/*_overloadProperty: function(target, type, customGet, customSet, callback) {
    var targetProp = typeof target == "string" ? this._targets[target] : target;
    var getPtr = customGet ? customGet : this._createPropertyGet(this, type, targetProp);
    //var setPtr = customSet ? customSet : this._createPropertySet(this, type, targetProp, callback);
    
    
    if(targetProp.propName) {
      var lookupGet = targetProp.obj.__lookupGetter__(targetProp.propName);
      //var lookupSet = targetProp.obj.__lookupSetter__(targetProp.propName);

      if(lookupGet || lookupSet) {
        return;
      }
      
      targetProp.origVal = targetProp.obj[targetProp.propName];
      targetProp.obj.__defineGetter__(targetProp.propName, getPtr);
      //targetProp.obj.__defineSetter__(targetProp.propName, setPtr);
    }
  },
_createPropertyGet: function(module, type, target) {
    return function() {
      var data = target.origVal;
      var handler = module.config[type];
      if(handler) {
        var trace = "";
        try {
          module.makeMessage("eval", "SIIII", "vv");
        } catch(e) {
          trace = e.stack.toString();
        }

        var gid = module.generateGlobalId(type);
        var modifiedData = handler(arguments.callee, trace, data, type + "/get", gid);
        data = modifiedData ? modifiedData : data;
      }
          
      return data;
    };
  },*/
  	unload: function() {
    		throw Error("unload() is not implemented.");
  	}
};
