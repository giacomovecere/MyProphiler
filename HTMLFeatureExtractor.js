var HTMLFeatureExtractor=function(){  
 	var AREA_THRESHOLD = 30;
 	var tree = new TreeGen();
 	var commonmaliciousrefresh = new RegExp(/URL\='index\.php\?spl\=.*'/i); 
 	var HTMLHEU = new HTMLHeuristics();
 	var JSFEAUEX = new JSFeatureExtractor();
 	report = new Object();
 	report.url = document.URL;
 	//var couchdb = new couchdbquery();
 	//var wepawet = new wepawetscan();
 	var setintret = null;
 	//var resultrev = null;
 	var resultpro = null;
 	var log = null;
 
//-------------------------------------------------------------
 	this.scan = function(/*log*/){
	  	//logs=log;
	  
		if(findPDF())
			return;
	  	
		//resultrev = revolver_malicious;
	  	
		/*--options part
		if(!extension_options.prophiler_enabled){
		  	console.log("Revolver report: "+resultrev);
		  console.log("JSProphiler Disabled");
		  if(resultrev==true)
			  chrome.extension.sendMessage("malicious");
		  return;
	  	}*/

	  	checkScriptPercentage();
		//there are no script in the page
	  	if(report.scriptperc == 0)
			return;
	  	/* the following functions were used during development to extract some features but I decided to not use them in the final version 
	  	findSuspiciousElementsNearEnd();
	  	checktagsContent();  
	  	findIframe();
	  	checkWhitespacePercentage();	  
	  	findMaliciousPatterns();	  
	  	*/
	  	findInvalidTagNames();
	  	ctrlScript();	  
	  	findSmallAreaElements();
	  	if(report.dommodf == -1 && report.eval == -1 && report.iframestr == 1 && report.invalidtagname == -1 && report.smallareael == -1 && report.suspstring == -1 && report.susptagstr == -1 && report.stringmodf == -1)
		  	resultpro = "benign";
	  	else	
		  	resultpro = predict(report);
	  	//console.log("Revolver report: "+resultrev);
	  	console.log("JSProphiler report: "+resultpro);
	  	/*if(resultrev == true){
		  	console.log(report);
		  	chrome.extension.sendMessage("malicious");
	  	}*/
		//if it is malicious, send it to wepawet (if the option is enabled)
	  	if(resultpro=="malicious"){// && resultrev==false){
		  	console.log(report);
		  	/*var hashcode = wepawet.checkUrl(document.URL);
		  	chrome.extension.sendMessage("process");
		  	if(extension_options.wepawet_enabled){
			  	setintret = setInterval(function(){testpagewithwepawet(hashcode);},5000);
		  	}
		  	else
			  	console.log("Wepawet Scan Disabled");
		  	*/
			return;
	  	}

	  	/*--log part
		if(log == "on"){
		  	report.wepawetresp = "not tested";
		  	report.jsprores = resultpro;
		  	report.revres = resultrev;
		  	chrome.storage.local.get(null,function(items){	
				var reportlist = new Array();		  	
				if(items.reports != null)
					reportlist = items.reports;
				var found = false;
				for(var i=0; i<reportlist.length; i++)
					if(reportlist[i].url == report.url){
						found = true;		
						break;
					}					
				
				if(!found || reportlist.length == 0){
					if(reportlist.length >= 500)
						reportlist.shift();
					reportlist.push(report);
					chrome.storage.local.set({reports:reportlist});
				}
          		});
	  	}*/
 	};
//-------------------------------------------------------------------
 	/***
	this.train = function(){
	  	if(findPDF())
			return;
	  	checkScriptPercentage();
	  	if(report.scriptperc == 0)
	  		return;
	  	//report.wepawetresp="malicious";
	  	submittoWepawet(); //this function is called only when you need to submit the page also to wepawet for scanning. Wepawet will give you the hashcode

	  	/* the following functions were used during development to extract some features but in the final version I decided to not use them  */
	/***  	findSuspiciousElementsNearEnd();
	  	checktagsContent();  
	  	findIframe();
	  	checkWhitespacePercentage();	  
	  	findMaliciousPatterns();	  	  
	  	findInvalidTagNames();
	  	ctrlScript();
	  	findSmallAreaElements();
	  
	  	console.log(report);
	  	couchdb.writereport();
 	};
//-------------------------------------------------------------------
 	this.traindb = function(){
		//this function is called only when you want to update the DB with the reports from wepawet
	  	couchdb.updatealldocument(); 
	  	var tml = new testMachineLearning();
	  	tml.train();
 	};
//-------------------------------------------------------------------
 	this.test = function(){
	  	var tml = new testMachineLearning();
	  	tml.test();
	};*/
//-------------------------------------------------------------------
 	/*function testpagewithwepawet(hashcode){
	 	status = wepawet.checkReport(hashcode); 
	 	console.log(status);
 	 	if(status != 'queued'){
 		 	if(status != "benign" && status != "error")
 			 	chrome.extension.sendMessage("malicious");
 		 	else
 				chrome.extension.sendMessage("benign");
         		if(logs == "on"){
 		    		report.jsprores = resultpro;
 		    		report.revres = resultrev;
 		    		if(status != "benign"){
 		    			if(status == "error")
 		    				report.wepawetresp = "error";
 		    			else
 		     				report.wepawetresp = "malicious";
 		    		}	 		    
 		    		else
 		    			report.wepawetresp = "benign";
 				
				chrome.storage.local.get(null,function(items){	
 			 		var reportlist = new Array();		  	
 			 		if(typeof(items.reports) != "undefined")
 						reportlist = items.reports;
 					var found = false;
 					for(var i=0; i<reportlist.length; i++)
 						if(reportlist[i].url == report.url)
 							found = true;
						if(!found || reportlist.length == 0){
 							reportlist.push(report);
 					 		chrome.storage.local.set({reports:reportlist});
 						}
 	        		});
 		 	}
 		 	clearInterval(setintret);
 	 	}
 	}*/
 //-------------------------------------------------------------------
	/*function submittoWepawet(){
	 	report.hashcode = wepawet.checkUrl(document.URL);
 	}*/
 //----------------------------------------------------------------------------------
 	function findSuspiciousElementsNearEnd(){
		var susp_elem = new Array("iframe","frame",/*"script",*/"object","embed");
		var susp = -1;
		var len = tree.length;
		if(len > 3){
			for (var i=len-4; i<len; i++){
				for(var j=0; j<susp_elem.length; j++){
					var patt = new RegExp(susp_elem[j]);
					if(patt.test(tree[i].nodeName.toLowerCase())){
						susp = 1;
						break;
					}
				}
			}
		}
		report.suspelemnearend = susp;
		//console.log("suspicious elements near end of document: "+susp);	
 	}
 //-------------------------------------------------------------------------------
	//Checks if the tags contain real text or unreadable text
 	function checktagsContent() {
		tree.resetIndexText();
	 	var susp = -1;
		while(x = tree.getNextNodeText()){
		 	if(x){
				x = x.textContent;
				var temp = x.substring(0,5);
				//Suspicious content if the length is more than 128 characters and the percentage of whitespaces to the respect of the content is less than 0.05
				if(temp != "<!--" && HTMLHEU.isSuspiciousTagContent(x.textContent)){
					susp= 1;
					break;
				}
			}
		}	
		report.susptagcontent = susp;
		//console.log("suspicious tags content: "+susp);
}
//-------------------------------------------------------------------------------
 	function findInvalidTagNames() {
		tree.resetIndex();
	 	var susp = -1;
	 	while(x = tree.getNextNode()){
			if(HTMLHEU.isValidTagName(x.nodeName.toLowerCase()) == false){ 
				susp = 1;
				break;
				//console.log("suspicious tags names: "+x.nodeName);
			}
		}
		report.invalidtagname = susp;		
	}
//-------------------------------------------------------------------------------
 	function findIframe() {
		tree.resetIndex();
	 	var susp = -1;
	 	while(x = tree.getNextNode()){
			if(x.nodeName.toLowerCase() == "iframe"){ 
				susp = 1;
				break;
			}
		}
		report.Iframe=susp;		
	}
//-------------------------------------------------------------------------------
	function ctrlScript(){
	 	JSFEAUEX.extractScript(/*report*/);
	}	 
//-----------------------------------------------------------------------
	//Computes the percentage of whitespaces in respect to the total length of the HTML page
	function checkWhitespacePercentage(){
		var wsp = 0;
		var pagestring = document.documentElement.outerHTML;
		for(var i=0; i<pagestring.length; i++){
			if(pagestring[i] == " ")
				wsp++;
		}
		var percentage = wsp/pagestring.length;
		report.whitespperc = percentage;
		//console.log("White Space Percentage: "+percentage*100+" %");
	}
//-----------------------------------------------------------------------
	//Computes the percentage of scripts in respect to the total length of the HTML page (including the scripts)
	function checkScriptPercentage(){
		var scriptlen = 0;
		var listscript = document.getElementsByTagName("script");
	 	for(var i=0; i<listscript.length; i++){//TODO: checks non-inline scripts!
		 	if(listscript.item(i).type == "" || listscript.item(i).type == "text/javascript"){
			 	var scriptnodoubleblanks = listscript.item(i).textContent;
			 	scriptlen += scriptnodoubleblanks.length+17;		 
		 	}
	 	}
	 	var pagelength = 0;
	 	/*for(var i=0;i<externaljs.length;i++){
		 	var scriptnodoubleblanks=externaljs[i];
			scriptlen+=scriptnodoubleblanks.length;	
		 	pagelength+=externaljs[i].length;
	 	}*/
		pagelength += document.documentElement.outerHTML.length;
		var percentage = scriptlen/pagelength;
		report.scriptperc = percentage;
		//console.log("Script Percentage: "+percentage*100+" %");
	}
//---------------------------------------------------------------------------
	//Checks for small area element (ex. iframe)
	function findSmallAreaElements(){
		var divs = document.getElementsByTagName("div");
		var iframe = document.getElementsByTagName("iframe");
		var obj = document.getElementsByTagName("object");
		var find = -1;
		//Checks in divs
		for(var i=0; i<divs.length; i++){
			var w = divs.item(i).getAttribute("width");
		 	var h = divs.item(i).getAttribute("height");
		 	if(w != null && h != null){
			 	if(w*h <= AREA_THRESHOLD){
				 	find = 1;
					break;
			 	}
		 	}
	 	}
		//Checks in iframes
		for(var i=0; i<iframe.length; i++){
		 	var w = iframe.item(i).getAttribute("width");
		 	var h = iframe.item(i).getAttribute("height");
		 	if(w != null && h != null){
			 	if(w*h <= AREA_THRESHOLD){
				 	find = 1;
					break;
			 	}
		 	}
	 	}
		//Check in Objects
		for(var i=0; i<obj.length; i++){
		 	var w = obj.item(i).getAttribute("width");
		 	var h = obj.item(i).getAttribute("height");
		 	if(w != null && h != null){
			 	if(w*h <= AREA_THRESHOLD){
				 	find = 1;
					break;
			 	}
		 	}
	 	}
		report.smallareael = find;
		//if(find){		
			//console.log("There is a obj element of suspicious size")
		//}
	}
//-------------------------------------------------------------------------------
	function findMaliciousPatterns(){
		var meta = document.getElementsByTagName("meta");
		var find = -1;
		for(var i=0; i<meta.length; i++){
			//console.log(meta.item(i).getAttribute("CONTENT"));
		 	if(meta.item(i).getAttribute("HTTP-EQUIV") != null &&  meta.item(i).getAttribute("HTTP-EQUIV").toLowerCase()=="refresh"){
				var patt = new RegExp(/URL\=/i);
			 	if(meta.item(i).getAttribute("CONTENT") != null && meta.item(i).getAttribute("CONTENT").toLowerCase().search(patt)!=-1)
				 	if((meta.item(i).getAttribute("CONTENT").toLowerCase().search(commonmaliciousrefresh))!=-1){
					 	find = 1;
						break;
					 	//console.log("With high probability, this page contains malicious redirect");
				 	}
		 	}
	 	}
	 	report.maliciousredirect = find;
	}

//-------------------------------------------------------------------------------
	//Checks if there are PDFs inside the page
	function findPDF(){
		var embed = document.getElementsByTagName("embed");
		for(var i=0; i<embed.length; i++){
			if(embed.item(i).getAttribute("type") == "application/pdf")
				return true;
		}
		return false;
	}
//------------------------------------------------------------------- 
 	function predict(report){
	  	var app = new svm();
	  	if(app.predict(convertReport(report),true)>0)
		  	return "benign";
	  	else
		  	return "malicious";
 	}
//-------------------------------------------------------------------------------------------------
	function convertReport(rep){
		var temp = new Array();
		temp[0] = new Array(1);
		temp[0][0] = rep.dommodf;
		temp[0][1] = rep.eval;
		temp[0][2] = rep.iframestr;
		temp[0][3] = rep.invalidtagname;
		temp[0][4] = rep.scriptperc;
		temp[0][5] = rep.smallareael;
		temp[0][6] = rep.suspstring;
		temp[0][7] = rep.susptagstr;	
		temp[0][8] = rep.stringmodf;	
		return temp;
	}
};


