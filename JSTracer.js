var JSTracer = function(){
	var report_to_tracer = new Object();
	var listscript;
	var JSFeaExt = new JSFeatureExtractor();
//------------------------------------------------------------------------
	this.trace = function(){

		//send data to the background page
		chrome.runtime.sendMessage({tabId:"", type:"", data:""}, function(response){
			console.log(response.mex);
		});

		for(var i=0; i<scripts.length; i++){
			console.log("trace: " + i);
			listscript = scripts[i];
			JSFeaExt.extractScript(listscript);
			if(report_to_tracer.dommodf == -1 && report_to_tracer.eval == -1 && report_to_tracer.iframestr == 1 && report_to_tracer.smallareael == -1 && report_to_tracer.suspstring == -1 && report_to_tracer.stringmodf == -1 && report_to_tracer.functemporizcall == -1 && report_to_tracer.eventattacch == -1)
                        console.log("Benign");
			//resultpro = "benign";
                else
			console.log("Send to the server");
                        //send to the server

		}
	}


}

//wait for the data from the script that has been directly injected into the page
window.addEventListener("message", function(event){
	//console.log("Event.source: ");// + event.source);
	if(event.source != window)
		return;
	//console.log("Before if");
	if(event.data.type && (event.data.type == "OVERRIDES")){
		/*console.log("EVENT: " + event.data.trace_type);
		console.log(event.data.trace_code);
		console.log(event.data.trace_href);
		*/

		//console.log("Before sending");
		//send the data received from the script directly injected into the page to the background page
		chrome.runtime.sendMessage({type: event.data.t_type, code: event.data.t_code, href: event.data.t_href});
		console.log("Data sent to background page");
	}
	//else
	//	console.log("Message not from overrides");
}, false);

