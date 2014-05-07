
var main = function() {
	//var htmlfe = new HTMLFeatureExtractor();
	
	//htmlfe.train(); //this function is used only when you want store in a db the report
        //htmlfe.traindb(); //this function is used only when you want store in a db the parameter of the SVM algorithm
        //htmlfe.test();  //this function is used only when you want test the SVM algorithm with the pages previously stored in a database

	/*chrome.storage.local.get(null, function(items){	
		   logs = items.devmode;
		   htmlfe.scan(logs); //this function is used for the normal use of the extension (only scan)
	 });*/
    	
	//htmlfe.scan();
	
	var tracer = new JSTracer();
	tracer.trace();
}; 

main();
