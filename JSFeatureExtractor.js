function JSFeatureExtractor(){  
	var longstring = null;
	listlongstring = new Array();
	var listshortstring = new Array();
	var UNPRINTABLE_THRESHOLD = 0.7;
	var MAX_PREFIX_LEN = 4;
	var MAX_NUMBER_LEN = 4;
	var iframepatt = new RegExp(/<iframe/);
	var tagpatt = new RegExp(/<script|<object|<embed|<frame/);
	var parser = new Array();
	var functionlist = new Array();
	var pattern=new RegExp(/(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/);
	namelist = new Array();
	JSHEU = new JSHeuristics();
	//URLFE = new URLFeatureExtractor();
	//--------------------------------------------------------------------------------
	//Reads the left branch of a DOM tree
	function readleft(branch){
		if(branch != undefined){
			if(!branch.value)
				readleft(branch.left);
			else 
				longstring = longstring + "" + branch.value;
			if(branch.right)
				longstring = longstring + "" + branch.right.value;
		}
	}
	//--------------------------------------------------------------------------------
	//Adds the name to the list, if it is not already there
	function addnamelist(name,listb){
		if(listb.indexOf(name) == -1)
			listb.push(name);
    	}
	//--------------------------------------------------------------------------------------------------
	function readArray(array){
		for(var x=0; x<array.length; x++)
			if(array[x].value){
				if(JSHEU.isLongString(array[x].value))
					 addnamelist(array[x].value, listlongstring);
				else
					 addnamelist(array[x].value, listshortstring);
			}
			else{ 
				longstring = "";
				readleft(array[x]);
				if(JSHEU.isLongString(longstring))
					addnamelist(longstring, listlongstring);
		        else
		        	addnamelist(longstring, listshortstring);
			}
	}
	//--------------------------------------------------------------------------------
	//Extracts strings from the DOM tree
	function extractString(branch){
	 	longstring = "";	
	 	//console.log(branch);
		//if it is a 'var' statement
		if(branch instanceof AST_Var){
			if(branch.definitions[0].value){ 
				if(branch.definitions[0].value.value){
					longstring = branch.definitions[0].value.value;
				 	if(longstring && isNaN(longstring)){
				 		if(JSHEU.isLongString(longstring))
					 		addnamelist(longstring, listlongstring);
				 		else 
					 		addnamelist(longstring, listshortstring);
			 		}
				}
				else if(branch.definitions[0].value.args)
				 	readArray(branch.definitions[0].value.args);
				else if(branch.definitions[0].value.left){
				 	longstring = "";
				 	readleft(branch.definitions[0].value);
				 	if(JSHEU.isLongString(longstring))
					 	addnamelist(longstring, listlongstring);
				 	else
					 	addnamelist(longstring, listshortstring);
				}
	   		}
		}
		else if(branch instanceof AST_SimpleStatement){
			if(branch.body && branch.body.right && branch.body.right.value){
				longstring = branch.body.right.value;
				if(longstring && isNaN(longstring))
					if(JSHEU.isLongString(longstring))
						addnamelist(longstring, listlongstring);
					else 
						addnamelist(longstring, listshortstring);
			}
			else if(branch.body && branch.body.right && branch.body.right.left){
				longstring = "";
				readleft(branch.body.right);
				if(JSHEU.isLongString(longstring))
		    	 		addnamelist(longstring, listlongstring);
		     		else
		    	 		addnamelist(longstring, listshortstring);
			}
			else if(branch.body && branch.body.right && branch.body.right.args)
				readArray(branch.body.right.args);
			else if(branch.body && branch.body.args)
				readArray(branch.body.args);
	 	}
	} 
	//--------------------------------------------------------------------------------
	/*
	This feature checks inside the strings for these keywords:
	("evil","shell","spray","decode","encode","crypt","memory","fuck","slacks","headersize","_exe")
	*/
	function findSouspiciousString(){
		var susp = -1;
		for(var j=0; j<listlongstring.length; j++)
			if(JSHEU.isSuspiciousString(listlongstring[j])){
				 //console.log("The script contains a suspicious string: "+ listlongstring[j]);
				susp = 1;
				break;
			}
		report_to_tracer.suspstring = susp;
	}
	//----------------------------------------------------------------
	function countOccurrences(c, s){
		count = 0;
		for(var i=0; i<s.length; i++) 
			if (s.charCodeAt(i) == c) 
				count++;
		return count;
	}
	//-----------------------------------------------------------------
	//Calculates the entropy of a string
	function calcEntropy(source) {
		var S = 0.0;
		var ch;
		var p = new Array(); //ascii
		for (ch=0; ch<256; ch++){
			p[ch] = countOccurrences(ch, source)/source.length;
			//log2(X)=logN(X)/logN(2)
			//
			if (p[ch] > 0) 
				S += -p[ch]*Math.log(p[ch])/Math.log(2);
		}
		return S;
	}
	//--------------------------------------------------------------------------------
	function isAsciiPrintable(c){
		c = c.charCodeAt(0);
		if(c>=32 && c<=126)
			return true;
		else 
			return false;
	}
	//-----------------------------------------------------------------------------
	function countOccurrencesWithDistance(what, s){
		var res = new Array();
		var len = what.length;
		var count = 0;
		var dist = 0;
		var i = 0;
		var pos;
		while(i < s.length){
			pos = s.indexOf(what,i);
			if (pos != -1) {
				count++;
				dist += (pos - i + len); //before updating i sum the distance from the previous occurrence
				//go ahead of what.length() chars
				i = pos + len;
			}
			else 
				break;
		}
		res[0] = count;
		//the last one usually doesn't get counted; if less than 2 occurrences return 1 so that the final percentage keeps really low
		if(count > 1)
		  res[1] = dist/(count-1);
	    	else 
	      		res[1] = 1;
		return res;
	}
	//----------------------------------------------------------------------------------------------------
	function experimentalShellcodeCheck(occurrences, avg_distance, pattern_length){
		if ((occurrences>2) && (avg_distance < pattern_length+MAX_NUMBER_LEN+1) )  
			return true;
		else 
			return false;
	}
	//-------------------------------------------------------------------------------------------------------------------
	function experimentalShellcodeSearch(val){
		if (val.length < MAX_PREFIX_LEN+1) 
			return 0;
		var res;
		var x = new Array();
		var occurrences = new Array(); //0 is not used, then +1 for the next longer prefix, to check if it decreases
		var avg_dist = new Array;
		for(var i=1; i<=MAX_PREFIX_LEN+1; i++){ //start from 1
			var pref=val.substring(0,i);
			x = countOccurrencesWithDistance(pref, val);
			occurrences[i] = x[0];
			avg_dist[i] = x[1];
			if(i > 1){
				if(occurrences[i] < occurrences[i-1]){
					if (experimentalShellcodeCheck(occurrences[i-1], avg_dist[i-1], i-1)){
						//the prefix is long i-1
						res = occurrences[i-1] / val.length;
						/*expected shellcode % for this pattern: total occurrences percentage / (1/expected pattern len)*/
						res = res / (1/avg_dist[i-1]);
						return res;
					}
					else 
						return 0; 
				}
				else if (occurrences[i] > occurrences[i-1])
					//method not good
					return 0;
				//else go on...
			}
		}
		if (experimentalShellcodeCheck(occurrences[MAX_PREFIX_LEN+1], avg_dist[MAX_PREFIX_LEN+1], MAX_PREFIX_LEN+1)){
			res = occurrences[MAX_PREFIX_LEN+1] / val.length();
			return res/(1/avg_dist[MAX_PREFIX_LEN+1]);
		}
		else 
			return 0;
	}
	//-------------------------------------------------------------------------------------------
	//Reverses a string
	function reverse(s){
	    return s.split("").reverse().join("");
	}
	//--------------------------------------------------------------------------------------------
	//Calculates the probabilty that a string contain shell code
	function calcShellCodeProb(val){
		var length = val.length;
		var unprintableChars = 0;
		var afAF09 = 0;
		var ch;
		for (var k=0; k<val.length; k++){
			ch = val.charAt(k);
			//9: non printable chars
			if (!isAsciiPrintable(ch) ) 
				unprintableChars ++;
			//10: 0-9,a-f percentage
			if ((ch>=48 && ch<=57) || (ch>=65 && ch<=70) || (ch>=97 && ch<=102)) 
				afAF09 ++;
		}
		var unprintableProb = unprintableChars/length/55/200;
		var afAF09Prob = afAF09 /length;
		if (unprintableProb > UNPRINTABLE_THRESHOLD) 
			unprintableProb = 0;
		var expShPerc = experimentalShellcodeSearch(val);
		if (expShPerc == 0){
			//repeat analysis backward - naive way, reversing the string
			expShPerc = experimentalShellcodeSearch(reverse(val));
		}
		if(expShPerc > unprintableProb){
			if(expShPerc > afAF09Prob) 
				shellcodeProbability = expShPerc;
			else 
				shellcodeProbability = afAF09Prob;
		}
		else{
			if(unprintableProb > afAF09Prob) 
				shellcodeProbability = unprintableProb;
			else 
				shellcodeProbability = afAF09Prob;
		}		
		return shellcodeProbability;
	}
	//-------------------------------------------------------------------------------------------------------------
	//Looks for the following string modification functions: "concat","replace","slice","split","substr","substring","join","toLowerCase","toUpperCase"
	function checkStringModificationFunctions(){
		var found = -1;
		for(var i=0; i<functionlist.length; i++)
			if(JSHEU.isStringModificationFunction(functionlist[i])){
				//console.log("The script contains a string modification function: "+functionlist[i]);
				found = 1;
				break;
			}
		report_to_tracer.stringmodf = found;
	}
	//---------------------------------------------------------------------------------------------------
	 //Extracts the max shell code probability, the max entropy and the max string length of the strings
	function checkStringProperties(){
	 	var maxShellcodeProb = 0;
	 	var maxEntropy = 0;
	 	var maxLength = 0;
	 	var maxLengthwowhitesp = 0;
     		for(var i=0; i<listlongstring.length; i++){
    	 		var currStr = listlongstring[i];
			var currS = calcShellCodeProb(currStr);
			var currE = calcEntropy(currStr);
			var currL = currStr.length;
			var currLwoSP = 0;
			if(!pattern.test(currStr)){
				for(var x=0; x<currL; x++){
					if(currStr.charAt(x) != " ")
						currLwoSP++;
					else{
						if(currLwoSP > maxLengthwowhitesp)
							maxLengthwowhitesp = currLwoSP;
						currLwoSP = 0;
					}
				}		
			}
			if(currLwoSP > maxLengthwowhitesp)
				maxLengthwowhitesp = currLwoSP;
			if(currS > maxShellcodeProb) 
				maxShellcodeProb = currS;
			if(currE > maxEntropy) 
				maxEntropy = currE;
			if(currL > maxLength) 
				maxLength = currL;
     		}
    		report_to_tracer.maxshcodeprob = maxShellcodeProb;
     		report_to_tracer.maxentropy = maxEntropy;
     		report_to_tracer.maxstrlength = maxLength;
     		report_to_tracer.maxstrlengthwsp = maxLengthwowhitesp;
	    	//console.log("Max ShellCode Probability: "+maxShellcodeProb+" Max Entropy: "+maxEntropy+" Max String Length: "+maxLength);
	}
	//--------------------------------------------------------------------------------------------------------
	//Looks for long string inside loops. This is a well know deobfuscation string
	function checkDeobfuscationRoutines(){
	 	var longstrlength = listlongstring.length;
	 	for(var i=0; i<parser.length; i++){
			for(var j=0; j<parser[i].body.length; j++){
				//console.log(parser[i].body[j]);
				if(parser[i].body[j] instanceof AST_For || parser[i].body[j] instanceof AST_While || parser[i].body[j] instanceof AST_Do){
					if(parser[i].body[j].body instanceof AST_BlockStatement){
						//console.log(parser[i].body[j].body.body[0]);
						for(var z=0; z<parser[i].body[j].body.body.length; z++)
							extractString(parser[i].body[j].body.body[z]);
					}
					else
						extractString(parser[i].body[j].body);
				}
			}		
	 	}
	 	if(longstrlength < listlongstring.length){
		 	report_to_tracer.deobroutine = 1;
		 	//console.log("The script apparently uses a deobfuscation routine");
	 	}
	 	else
		 	report_to_tracer.deobroutine = -1;
	} 
	//----------------------------------------------------------------------------------------------------------
	//Generates parser array with all of the javascript scripts
	function genparse(listscript){
		listscript_inline = document.getElementsByTagName("script");
		//console.log(listscript.item(0).innerHTML);
		//TODO: add external scripts to the parser
		
		//parse inline scripts
		for(var i=0; i<listscript_inline.length; i++)
			if(listscript_inline.item(i).type == "" || listscript_inline.item(i).type == "text/javascript")
				parser.push(new parse(listscript_inline.item(i).innerHTML));
		//parse external scripts	  
		for(var j=0; j<listscript.length; j++){
			parser.push(new parse(listscript));
		}
	}
	//------------------------------------------------------------------------------------------------------------
	function extractAllString(){
		for(var i=0; i<parser.length; i++)
			for(var j=0; j<parser.body && parser[i].body.length; j++)
				extractString(parser[i].body[j]);
	}
	//------------------------------------------------------------------------------------------------------------
	//Looks for the following functions: "unescape","fromCharCode","charCodeAt"
	function findDeobfuscationFunctionNames() {
	 	var found = -1;
	 	for(var i=0; i<namelist.length; i++)
			if(JSHEU.isDeobfuscationFunction(namelist[i])){
				found = 1;
				//console.log("The script contains a suspicious name: "+functionlist[i]);
				break;	
			}
	 	for(var i=0; i<functionlist.length; i++)
			if(JSHEU.isDeobfuscationFunction(functionlist[i])){
				found = 1;
				//console.log("The script contains a suspicious name: "+functionlist[i]);
				break;	
			}
     		for(var i=0; i<listlongstring.length; i++)
			if (JSHEU.isDeobfuscationFunction(listlongstring[i])){
			 	found = 1;
			 	//console.log("The script contains a suspicious name: "+listlongstring[i]);
		 		break;
			}
	 	for(i=0; i<listshortstring.length; i++)
		 	if (JSHEU.isDeobfuscationFunction(listshortstring[i])){
			 	found = 1;
			 	//console.log("The script contains a suspicious name: "+listshortstring[i]);
		 		break;
			}
	 	report_to_tracer.deobfuncname = found;
	}
	//----------------------------------------------------------------------------------------------------------------------------------------
	//Looks for eval function inside the code
	function findEval(){
		var found = -1;
		for(var i=0; i<functionlist.length; i++)
			if(functionlist[i] == "eval"){
				//console.log("The script contains eval function");
				found = 1;
				break;
			}
		for(var i=0; i<namelist.length; i++)
			if(namelist[i] == "eval"){
				//console.log("The script contains eval function");
				found = 1;
				break;
			}
		report_to_tracer.eval = found;
	}
	//-----------------------------------------------------------------------------------------------------------------------
	//Looks for the presence of function temporized call, like setTimeout or setInterval
	function findFunctionTemporizedCalls(){
		var found = -1;
		for(var i=0; i<functionlist.length; i++)
			if(JSHEU.isTemporizedCall(functionlist[i])){
				found = 1;
				//console.log("The script contains a temporized call: "+functionlist[i]);
				break;
			}
		for(var i=0; i<namelist.length; i++)
			if(JSHEU.isTemporizedCall(namelist[i])){
				found = 1;
				//console.log("The script contains a temporized call: "+functionlist[i]);
				break;
			}
		report_to_tracer.functemporizcall = found;
	}
	//-------------------------------------------------------------------------------------------------------------------
	//Looks if there are event-attached function like: "addEventListener","attachEvent","dispatchEvent","fireEvent"
	function findEventAttachments(){
		var found = -1;
		for(var i=0; i<functionlist.length; i++)
			if(JSHEU.isEventName(functionlist[i])){
				found = 1;
				//console.log("The script contains an event attachment: "+functionlist[i]);
				break;
			}
		for(var i=0; i<namelist.length; i++)
			if(JSHEU.isEventName(namelist[i])){
				found = 1;
				//console.log("The script contains an event attachment: "+functionlist[i]);
				break;
			}
		report_to_tracer.eventattach = found;
	}
	//-------------------------------------------------------------------------------------------------------------------
	//Looks for fingerprintigfunctions
	function findFingerprintingFunctions(){
		var found = -1;
		for(var i=0; i<functionlist.length; i++)
			if(JSHEU.isFingerprintingString(functionlist[i])){
				found = 1;
				//console.log("The script contains a fingerprinting function: "+functionlist[i]);
				break;
			}
		for(var i=0; i<namelist.length; i++)
			if(JSHEU.isFingerprintingString(namelist[i])){
				found = 1;
				//console.log("The script contains a fingerprinting function: "+functionlist[i]);
				break;
			}
		report_to_tracer.fingerprintf = found;
	}
	//-------------------------------------------------------------------------------------------------------------------
	//Looks for the word "iframe" inside the script
	function findIframeStrings() {
	 	var found = -1;
		for(var i=0; i<listlongstring.length; i++){
		 	if(iframepatt.test(listlongstring[i])){
			 	found = 1;
			 	//console.log("There is a string containing an iframe tag: "+listlongstring[i]);
		 		break;
			}
	 	}
	 	for(var i=0; i<listshortstring.length; i++){
		 	if(iframepatt.test(listshortstring[i])){
			 	found = 1;
			 	//console.log("There is a string containing an iframe tag: "+listshortstring[i]);
		 		break;
			}
	 	}
	 	report_to_tracer.iframestr = found;
	}
	//---------------------------------------------------------------------------------------------------------------------
	//Looks for the following tag inside the strings: <script><object><embed><frame>
	function findSuspiciousTagStrings() {
		var found = -1;
		for(var i=0; i<listlongstring.length; i++){
			if(tagpatt.test(listlongstring[i])){
				found = 1;
				//console.log("There is a string containing an html tag: "+listlongstring[i]);
				break;
			}
		}
		for(var i=0; i<listshortstring.length; i++){
			if(tagpatt.test(listshortstring[i])){
				found = 1;
				//console.log("There is a string containing an html tag: "+listshortstring[i]);
				break; 
			}
		}
		report_to_tracer.susptagstr = found;
	}
	//---------------------------------------------------------------------------------------------------------------------
	function findSmallAreaElements(){
                var divs = document.getElementsByTagName("div");
                var iframe = document.getElementsByTagName("iframe");
                var obj = document.getElementsByTagName("object");
                var found = -1;
                //Checks in divs
                for(var i=0; i<divs.length; i++){
                        var w = divs.item(i).getAttribute("width");
                        var h = divs.item(i).getAttribute("height");
                        if(w != null && h != null){
                                if(w*h <= AREA_THRESHOLD){
                                        found = 1;
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
                                        found = 1;
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
                                        found = 1;
                                        break;
                                }
                        }
                }
                report_to_tracer.smallareael = found;
        }
	//-------------------------------------------------------------------------------
	function findDOMModificationFunction(){
		var found = -1;
		for(var i=0; i<functionlist.length; i++)
			if(JSHEU.isDOMModificationFunction(functionlist[i])){
				found = 1;
				//console.log("The script contains a DOM modification function: "+functionlist[i]);
				break;
			}
		for(var i=0; i<namelist.length; i++)
			if(JSHEU.isDOMModificationFunction(namelist[i])){
				found = 1;
				//console.log("The script contains a DOM modification function: "+functionlist[i]);
				break;
			}
		report_to_tracer.dommodf = found;		
	}
	//-------------------------------------------------------------------------------------------------------------------
	//Scans the entire DOM and store the name of the function used for further analysis
	function extractfuncname(){
		var fname = null;
		for(var i=0; i<parser.length; i++)
			for(var j=0; parser[i].body && j<parser[i].body.length;j++){
		    	 	var branch = parser[i].body[j];
		    	 	if(branch instanceof AST_Var){
		 			if(branch.definitions[0] instanceof AST_VarDef){
		 				if(branch.definitions[0].value instanceof AST_Call){
		 					if(branch.definitions[0].value.expression.name)
		 						fname = branch.definitions[0].value.expression.name;
		 					else if(branch.definitions[0].value.expression.property)
		 						fname = branch.definitions[0].value.expression.property;
		 					if(fname)
		 						functionlist.push(fname);
		 				}
		 				else if(branch.definitions[0].value instanceof AST_Dot){
		 					if(branch.definitions[0].value.property)
		 						if(fname = branch.definitions[0].value.property)
		 					    	functionlist.push(fname);
		 				}
		 			}
		 		}
		    	 	else if(branch instanceof AST_SimpleStatement){
			 		if(branch.body instanceof AST_Assign){
			 			if(branch.body.right instanceof AST_Call){
			 				if(fname = branch.body.right.expression.property);
			 				else if(fname = branch.body.right.expression.name);
			 			}
			 			else if(branch.body.left instanceof AST_Dot)
			 				if(fname = branch.body.left.property);
			 					if(fname)
			 						functionlist.push(fname);
			 		}
			 		if(branch.body instanceof AST_Call){
			 			if(branch.body.expression instanceof AST_Dot){
			 				if(branch.body.expression.property)
			 					fname = branch.body.expression.property;
			 			}
			 			else if(branch.body.expression instanceof AST_SymbolRef)
			 				if(branch.body.expression.name)
			 					fname = branch.body.expression.name;
		 					if(fname)
		 						functionlist.push(fname);
			 		}
			 	}
		     	}
	}
	//-------------------------------------------------------------------
	
	function printlist(list, message){
	 	if(list.length>0 && message)
		 	console.log(message);
	 	for(var i=0; i<list.length; i++)
		 	console.log(list[i]);
	}
	//--------------------------------------------------------------------------------------------------------------------
	this.extractScript = function(listscript){	
	 	genparse(listscript);
	 	//console.log(parser);
	 	extractAllString();
	 	extractfuncname();	 
	 	findSouspiciousString();	 
	 	findEval();
	 	checkStringModificationFunctions();
		findSmallAreaElements();
	 	/*
	 	checkDeobfuscationRoutines();	 
	 	checkStringProperties();
	 	findDeobfuscationFunctionNames();***/
	 	findFunctionTemporizedCalls();
	 	findEventAttachments();
	 	/***findFingerprintingFunctions();
	 	*/
	 	findIframeStrings();
	 	findSuspiciousTagStrings();
	 	findDOMModificationFunction();
	 	//var liststring=listlongstring.concat(listshortstring);
	 	//URLFE.scan(liststring);
	 	//printlist(namelist,"NameList: ");
	 	//printlist(listlongstring,"Long String List: ");
	 	//printlist(functionlist,"Function List: ");
		console.log("extractScript finished");
	};
	//-----------------------------------------------------------------------
};
