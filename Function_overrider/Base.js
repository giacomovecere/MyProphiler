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

  	unload: function() {
    		throw Error("unload() is not implemented.");
  	}
};
