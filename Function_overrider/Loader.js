console.log("DOM Snitch");

if(typeof already_injected === "undefined"){
	
	var DOMSnicth_module = "DOMSnitch=function(configData){this._json=window.JSON;this._modules={};this.loadModules();};DOMSnitch.prototype={get config(){return this._hooks;},get JSON(){return this._json;},get modules(){return this._modules;},loadModules:function(){var moduleNames=Object.getOwnPropertyNames(DOMSnitch.Modules);for(var i=0;i<moduleNames.length;i++){var moduleName=moduleNames[i];if(moduleName=='Base'||!!this._modules[moduleName]){continue;}else{var module=new DOMSnitch.Modules[moduleName](this);module.load();this._modules[moduleName]=module;}}}};DOMSnitch.Modules={};DOMSnitch.Heuristics={};";
	var Base_module = "DOMSnitch.Modules.Base=function(){};DOMSnitch.Modules.Base.prototype={_overloadMethod:function(target,type,methodPtr,callback){var targetMethod=typeof target=='string'?this._targets[target]:target;if(targetMethod.funcName){Object.defineProperty(targetMethod.obj,targetMethod.funcName,{value:methodPtr});}},generateGlobalId:function(){throw Error('generateGlobalId() is not implemented.');},load:function(){throw Error('load() is not implemented.');},unload:function(){throw Error('unload() is not implemented.');}};";
	
	/*
	 * Module from "DOMSnitch" project.
	 * Loads modules inside the page (injecting
	 * script tags)
	 */
	
	window.DIR_PATH = "";
	window.USE_DEBUG = true;
	
	DOMSnitch.Loader = function() {
	  	this._modules = {};
	  	this._codeBuff = [];
	};
	
	DOMSnitch.Loader.prototype = {
	  	_loadCode: function(jscode) {
	    		this._codeBuff.push(jscode);
	    		if(document.documentElement) {
	      			var scriptElem = document.createElement("script");
	      			scriptElem.textContent = this._codeBuff;
	      			this._codeBuff = [];
	      			document.documentElement.appendChild(scriptElem);
	      			document.documentElement.removeChild(scriptElem);
	    		}	 
			else {
	      			window.setTimeout(this._loadCode.bind(this, ""), 0);
	    		}
	  	},
	  
	  	load: function() {
	    		this._loadCode("if(!window.snitch) { snitch = new DOMSnitch({})} else { snitch.loadModules()}");
	  	},
	  
	  	loadModule: function(moduleName, moduleSource) {
	    		if(window.DIR_PATH) {
	      			moduleSource = window.DIR_PATH + moduleSource;
	    		}
	    		var xhr = new XMLHttpRequest;
	    		var moduleUrl = chrome.extension.getURL(moduleSource);
	    		xhr.open("GET", moduleUrl, false);
	    		xhr.send();
	    		var replace_string = "(function(){var signatures = "+"";
	    		var jscode = xhr.responseText.replace("(function(){", replace_string);
	    		this._loadCode(jscode);
	  	},
	  
	  	loadAll: function(){
		  	this._loadCode(DOMSnicth_module);
		  	this._loadCode(Base_module);
		  	//this._loadCode2(overrides_module);//TODO this must add signatures dynamically into the module, like I do in loadModule now
		 	this.loadModule("overrides","Function_overrider/overrides.js");
	  	}
	};
}
