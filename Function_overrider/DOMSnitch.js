if(typeof already_injected === "undefined"){

	/*
	 * Module from "DOMSnitch" project.
	 * Sets environment for other modules
	 */
	
	DOMSnitch = function(configData) {
	
	  this._json = window.JSON;
	  
	  this._modules = {};
	  this.loadModules();
	};
	
	DOMSnitch.prototype = {
	  get config() {
	    return this._hooks;
	  },
	  
	  get JSON() {
	    return this._json;
	  },
	  
	  get modules() {
	    return this._modules;
	  },
	
	  loadModules: function() {
	    var moduleNames = Object.getOwnPropertyNames(DOMSnitch.Modules);
	    for(var i = 0; i < moduleNames.length; i++) {
	      var moduleName = moduleNames[i];
	      
	      if(moduleName == "Base" || !!this._modules[moduleName]) {
	        continue;
	      } else {
	        var module = new DOMSnitch.Modules[moduleName](this);
	        module.load();
	        this._modules[moduleName] = module;
	      }
	    }
	  }
	};
	
	DOMSnitch.Modules = {};
	DOMSnitch.Heuristics = {};
}