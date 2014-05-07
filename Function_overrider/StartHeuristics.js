if(typeof already_injected === "undefined"){

	/*
	 * Module from "DOMSnitch" project.
	 * Loads the indicated modules.
	 */
	if(!window.LOADED) {
	
	  	loader= new DOMSnitch.Loader();
	  	loader.loadAll();
	  	loader.load();
	  
	  	window.LOADED = true;
	}
}
