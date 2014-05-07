var JSHeuristics = function(){ 
 	var STRING_MOD_FN_NAMES = new Array("concat","replace","slice","split","substr",
			"substring","join","toLowerCase","toUpperCase");
 	var DOM_MOD_FN_NAMES = new Array("insertBefore","insertAfter","appendChild","cloneNode",
		"replaceChild","setAttribute","setAttributeNS","setAttributeNode","removeChild","replaceChild",
		"removeAttribute","removeAttributeNode","removeAttributeNS","createAttribute",
		"createDocumentFragment","createElement","createTextNode","write","writeln",
		"clearAttributes","insertAdjacentElement","insertAdjacentText","insertAdjacentHTML","removeNode",
		"replaceNode");
 	var SUSPICIOUS_STRINGS = new Array("evil","shell","spray","decode","encode","crypt",
			"memory","fuck","slacks"/*pace*/,"headersize","_exe");
 	var DEOBFUSCATION_FN_NAMES = new Array("unescape","fromCharCode","charCodeAt");
 	var EVENT_NAMES = new Array("onerror","onload","onbeforeunload","onunload");
 	var EVENT_FUNCTIONS = new Array("addEventListener","attachEvent","dispatchEvent","fireEvent");
 	var FINGERPRINTING_STRINGS = new Array("appCodeName", "appName", "appVersion", "cookieEnabled", 
		"language", "platform", "plugins", "systemLanguage", "userAgent", "userLanguage");
 	var STRING_LENGTH_THRESHOLD = 40;
 	var ARRAY_LENGTH_THRESHOLD = 40;
 	//return isDeobfuscationFunction(name);
 //------------------------------------------------------------------------
 	this.isStringModificationFunction = function(name){
	 	if(name == "")
		 	return false;
	 	for(var i=0; i<STRING_MOD_FN_NAMES.length; i++)
		 	if(name == STRING_MOD_FN_NAMES[i])
			 	return true;
	 	return false;
 	}
 //------------------------------------------------------
 	this.isTemporizedCall = function(name){
	 	if(name == "setTimeout" || name == "setInterval")
	 		return true;
	 	return false;
 	}
 //----------------------------------------------------------
 	this.isDOMModificationFunction = function(name){
	 	if(name == "")
		 	return false;
	 	for(var i=0; i<DOM_MOD_FN_NAMES.length; i++)
		 	if(name == DOM_MOD_FN_NAMES[i])
			 	return true;
	 	return false;
 	}
 //----------------------------------------------------------
 	this.isLongString = function(name){
	 	if(name && name.length > STRING_LENGTH_THRESHOLD) 
			return true;
		return false;
 	}
 //------------------------------------------------------
 this.isSuspiciousString = function(name){
	 if(name == "")
		 return false;
	 for(i=0; i<SUSPICIOUS_STRINGS.length; i++){
		 var patt = new RegExp(SUSPICIOUS_STRINGS[i]);
		 if(patt.test(name.toLowerCase()))
			 return true;
	 }
	 return false;
 }
 //-----------------------------------------------------------------------
 this.isEventName = function(name){
	 name = name.toLowerCase();
	 if(name == "")
		 return false;
	 for(var i=0; i<EVENT_NAMES.length; i++){
		 if(EVENT_NAMES[i] == name)
			 return true;
	 }
	 return false;
 }
 //-----------------------------------------------------------------------
 function isEventFunction(name){
	 if(name == "")
		 return false;
	 for(var i=0; i<EVENT_FUNCTIONS.length; i++){
		 if(EVENT_FUNCTIONS[i] == name)
			 return true;
	 }
	 return false;
 }
 //-----------------------------------------------------------------------
 this.isFingerprintingString = function(name){
	 if(name == "")
		 return false;
	 for(var i=0; i<FINGERPRINTING_STRINGS.length; i++){
		 if(FINGERPRINTING_STRINGS[i] == name)
			 return true;
	 }
	 return false;
 }
 //-----------------------------------------------------------------------
 	this.isDeobfuscationFunction = function(name){
	 	if(name == "")
		 	return false;
	 	for(var i=0; i<DEOBFUSCATION_FN_NAMES.length; i++){
		 	if(DEOBFUSCATION_FN_NAMES[i] == name)
			 	return true;
	 	}
	 	return false;
 	}
 //-----------------------------------------------------------------------
};
