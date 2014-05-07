/***var extension_options = {
				revolver_enabled:true,
				prophiler_enabled:true,
				wepawet_enabled:true,
				updates_frequency:"1", 
				whitelist:[], 
				signatures:signatures,
		 		async:['www.facebook.com','ak.facebook.com','plus.google.com','talkgadget.google.com','www.youtube.com','www.linkedin.com',
		 		'twitter.com','www.coursera.org'],
				lastUpdate:0,
				version:1,
				devmode:'on'
			};
var frame_requested = [];
var dont_block = [];
var whitelisted_tabs = [];
var updateTimeout = null;
*/
console.log("Background page init");
var times = 0;
/***
function hasHighMatchScore(sig){
	for(var i=0; i<signatures.length; i++){
		if(compare_signatures(sig,signatures[i])>90){
			return true;
		}
	}
	return false;
}*/

/***
//Checks if there are new signatures, if that, it updates them
function updateSignatures(){
	var remote_version = -1;
	var xmlhttp = new XMLHttpRequest();
	//TODO when server-side is ready, enable this
	/*
	// retrieving signature version
	xmlhttp.open("GET","url_from_which_to_take_the_version",false); //TODO put the right URL
	xmlhttp.send();
	remote_version = xmlhttp.responseText;
	*/
	/***if(remote_version > extension_options.version){
		//TODO when server-side is ready, enable this
		/*
		// retrieving new signatures
		xmlhttp.open("GET","url_from_which_to_take_the_new_signatures",false); //TODO put the right URL
		xmlhttp.send();
		var new_signatures = xmlhttp.responseText; // TODO the response should be an array of strings, one string for each signature
		for(var i=0; i<new_signatures.length; i++){
			// excluding duplicates and similar signatures
			if(signatures.indexOf(new_signatures[i])===-1 or !hasHighMatchScore(new_signatures[i]){
				signatures.append(new_signatures[i]);
			}
		}
		*/
		/***var lastUpdate = new Date().getTime();
		chrome.storage.local.set({signatures:signatures,lastUpdate:lastUpdate,version:remote_version});
		extension_options.signatures = signatures;
		extension_options.lastUpdate = lastUpdate;
	}
	else{
		var lastUpdate = new Date().getTime();
		chrome.storage.local.set({lastUpdate:lastUpdate});
		extension_options.lastUpdate = lastUpdate;
	}
}*/

/*
 * Cancels all script requests (except for sites that are analyzed asynchronously)
 * It's needed because some of the resources aren't blocked by the
 * beforeload event (webkit bug report: https://bugs.webkit.org/show_bug.cgi?id=65272)
 * from content scripts, causing double requests.
 */
/***function onBeforeScriptRequest(details){
	if(typeof dont_block[details.tabId] === "undefined"){
		//return {cancel:true};
	}
}*/

/***
// visiting new page: reset status of the appropriate tab
function onBeforeFrameRequest(details){
	frame_requested[details.tabId] = [];
	var async = false;
	var whitelisted = false;
	
	// check if the site must be analyzed asynchronously
	for(var i=0; i<extension_options.async.length; i++){
		if(details.url.search(extension_options.async[i])!==-1){
			async = true;
			break;
		}
	}
	
	// check if the site is whitelisted by the user
	for(var i=0; i<extension_options.whitelist.length; i++){
		if(details.url.search(extension_options.whitelist[i])!==-1){
			whitelisted = true;
			whitelisted_tabs[details.tabId] = true;
			break;
		}
	}
	
	if(!whitelisted && (typeof whitelisted_tabs[details.tabId] !== "undefined")){
		whitelisted_tabs[details.tabId] = undefined;
	}
	
	if(whitelisted || async || (details.url.search("www.pandora.com")!==-1)){ // don't know why, but pandora logs me out if I check it
		dont_block[details.tabId] = true;
	}
	else{
		if(typeof dont_block[details.tabId] !== "undefined"){
			dont_block[details.tabId] = undefined;
		}
	}
}

// injecting content scripts on demand
function onBeforeXMLHttpRequest(details){
	if(typeof frame_requested[details.tabId] === "undefined"){
		return;
	}
	
	if(typeof whitelisted_tabs[details.tabId] !== "undefined"){ //site whitelisted
		if(typeof frame_requested[details.tabId][details.frameId]==="undefined"){
			frame_requested[details.tabId][details.frameId] = true;
			return {cancel:true};
		}
		return;
	}
	
	chrome.pageAction.show(details.tabId);
	if((typeof frame_requested[details.tabId][details.frameId]==="undefined") && extension_options.revolver_enabled){
		frame_requested[details.tabId][details.frameId] = true;
		var option_string = "var extension_options = "+JSON.stringify(extension_options);
		chrome.tabs.executeScript(details.tabId,{code:option_string,runAt:'document_start',allFrames:true});
		chrome.tabs.executeScript(details.tabId,{file:'Shared_tools/spamsum.js',runAt:'document_start',allFrames:true});
		chrome.tabs.executeScript(details.tabId,{file:'Shared_tools/code_analysis.js',runAt:'document_start',allFrames:true});
		chrome.tabs.executeScript(details.tabId,{file:'Events_listener/listeners.js',runAt:'document_start',allFrames:true});
		chrome.tabs.executeScript(details.tabId,{file:'Function_overrider/DOMSnitch.js',runAt:'document_start',allFrames:true});
		chrome.tabs.executeScript(details.tabId,{file:'Function_overrider/Loader.js',runAt:'document_start',allFrames:true});
		chrome.tabs.executeScript(details.tabId,{file:'Function_overrider/StartHeuristics.js',runAt:'document_start',allFrames:true});
		var async = false;
		for(var i=0; i<extension_options.async.length; i++){
			if(details.url.search(extension_options.async[i])!==-1){
				async = true;
				break;
			}
		}
		if(details.url.search("www.pandora.com") === -1){
			console.log(details.url);
			if(!async){
				chrome.tabs.executeScript(details.tabId,{file:'Remote_scripts_fetcher/remote_scripts_sync_fetcher.js',runAt:'document_start',allFrames:true});
			}
			else{
				console.log('a')
				chrome.tabs.executeScript(details.tabId,{file:'Remote_scripts_fetcher/remote_scripts_async_fetcher.js',runAt:'document_start',allFrames:true});
			}
		}
		return {cancel:true};
	}
	if((typeof frame_requested[details.tabId][details.frameId]==="undefined") && !extension_options.revolver_enabled){
		var option_string = "var extension_options = "+JSON.stringify(extension_options);
		chrome.tabs.executeScript(details.tabId,{code:option_string,runAt:'document_start',allFrames:true});
		frame_requested[details.tabId][details.frameId] = true;
		return {cancel:true};
	}
}*/
/***
//Gets messages from the content scripts that are interacting with the user web pages
function onMessage(message,sender){
	if(message=="malicious")
		chrome.pageAction.setIcon({tabId:sender.tab.id,path:'WEPAWETMALI.gif'});
	else if(message=="process")
		chrome.pageAction.setIcon({tabId:sender.tab.id,path:'WEPAWETCHECK.png'});
	else if(message=="benign")
		chrome.pageAction.setIcon({tabId:sender.tab.id,path:'WEPAWET.gif'});
	else{
		if(message=="updated"){
			clearTimeout(updateTimeout);
			if(extension_options.updates_frequency!=="0"){
				var remainingTime = extension_options.updates_frequency*(86400000);
				updateTimeout = setTimeout(updateSignatures,remainingTime);
			}
		}else{
			extension_options = message;
			if(extension_options.revolver_enabled){
				chrome.webRequest.onBeforeRequest.addListener(onBeforeScriptRequest, {urls:["<all_urls>"], types:["script"]}, ["blocking"]);
			}	
		}
		
	}
}
*/

/***
// setting default options if no option is found (e.g. first execution of the extension after its installation)
chrome.storage.local.get(null,function(items){
	var found = false;
	for(var prop in items){
		found = true; // I just need to check if there's at least one option
		break;
	}
	if(found){
		extension_options = items;
	}
	chrome.storage.local.set(extension_options);
	
	if(extension_options.updates_frequency!=="0"){
		var timeFromLastUpdate = (new Date().getTime() - extension_options.lastUpdate);
		var remainingTime = extension_options.updates_frequency*(86400000) - timeFromLastUpdate;//one day = 86.400.000 milliseconds
		if(remainingTime<=0){
			updateSignatures();
		}
		else{
			updateTimeout = setTimeout(updateSignatures,remainingTime);
		}
	}
	
	if(extension_options.revolver_enabled){
		chrome.webRequest.onBeforeRequest.addListener(onBeforeScriptRequest, {urls:["<all_urls>"], types:["script"]}, ["blocking"]);
	}
});*/
var scripts_received = new Array();
scripts_received['urls'] = new Array();
scripts_received['code'] = new Array();

/*chrome.tabs.onUpdated.addListener(function(tabId, changeInfo){
	console.log('onUpdated');
	//if the tab has completed the loading and there are scripts in it
	if(changeInfo.status === 'complete'){// && scripts_received.length != 0){
		console.log('onUpdated->complete');
		var code_scripts = "var scripts = " + JSON.stringify(scripts_received['code']);
		chrome.tabs.executeScript(tabId, {code:code_scripts, runAt:'document_start', allFrames:true});
		chrome.tabs.executeScript(tabId, {file:'main.js', runAt:'document_start', allFrames:true});
	}
});*/

//var traces = {};
var traces_type = new Array();
var traces_code = new Array();
var traces_href = new Array();

//receive data from content script
chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse){
		//from a content script
		if(sender.tab){
			console.log("Message Received:");
			traces_type.push(request.type);
			console.log(traces_type);
			traces_code.push(request.code);
			console.log(traces_code);
			traces_href.push(request.href);	
			console.log(traces_href);
		}
	}
);
		
 
chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
	/*console.log(details['type']);
	if(details['type'] != 'script'){
                //I do not cancel the request
                return {cancel: false};
                //return details;
        }*/
        det_url = details['url'];
        console.log(det_url);
        if(det_url){
                $.ajax({
			url: det_url,
			//have to specify that it's 'text', otherwise it "executes" it causing (probably) many errors
			dataType: 'text',
                        success: function(result){
				//console.log(det_url + " : " + result);
				scripts_received['urls'].push(det_url);
				scripts_received['code'].push(result);
			},
			
			error: function(result){
				if(result.status != 0 && result.statusText != "")
					console.log(result);
				else
					console.log('Error!');
			},

			async: false
		});
	}
        console.log("request_done");
        return {cancel: false};
},
{
	urls:["<all_urls>"],
	types:["script"]
},
[
	"blocking",
	"requestHeaders"]
);


// Listens when new request
chrome.webRequest.onHeadersReceived.addListener(function(details) {
        //console.log('Web request');
        for (i = 0; i < details.responseHeaders.length; i++) {
                if (isCSPHeader(details.responseHeaders[i].name.toUpperCase())) {
                        var csp = details.responseHeaders[i].value;
                        console.log('CSP intercepted');

                        // append "https://mysite.com" to the authorized sites
                        //csp = csp.replace('script-src', 'script-src https://mysite.com');
                        //csp = csp.replace('style-src', 'style-src https://mysite.com');

                        csp  += "; 'unsafe-inline'";  // csp;
                }
        }

        return { // Return the new HTTP header
                responseHeaders: details.responseHeaders
        };
}, 
{
  	urls: ["<all_urls>"]
//  	types: ["main_frame"]
}, 
[
	"blocking", 
	"responseHeaders"
]);


function isCSPHeader(headerName) {
        return (headerName == 'CONTENT-SECURITY-POLICY') || (headerName == 'X-WEBKIT-CSP');
}


//chrome.webRequest.onBeforeRequest.addListener(onBeforeXMLHttpRequest, {urls:["<all_urls>"], types:["xmlhttprequest"]}, ["blocking"]);
//chrome.webRequest.onBeforeRequest.addListener(onBeforeFrameRequest, {urls:["<all_urls>"], types:["main_frame"]}, ["blocking"]);
//chrome.extension.onMessage.addListener(onMessage);
