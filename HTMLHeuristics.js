function HTMLHeuristics(){  
 	valid_names = new Array("a","abbr","acronym","address","applet","area","audio","b","base","basefont","bdo",
		"bgsound","big","blink","blockquote","body","br","button","caption","center","cite","code","col",
		"colgroup","datagrid","dd","del","dfn","dir","div","dl","dt","em","embed","fieldset","font","foreignObject","form",
		"frame","frameset","h1","h2","h3","h4","h5","h6","head","hr","html","i","iframe","img","input","ins",
		"isindex","kbd","label","legend","li","link","listing","map","marquee","menu","meta","nobr","noembed","noframes",
		"noscript","object","ol","optgroup","option","p","param","plaintext","pre","q","s","samp",
		"script","select","small","spacer","span","strike","strong","style","sub","sup","table",
		"tbody","td","textarea","tfoot","th","thead","title","tr","tt","u","ul","var","video","wbo","wbr","xmp");
 //--------------------------------------------------
	//Binary search in the array of valid_names
 	function binarySearch(key){
  		var left = 0;
  		var right = valid_names.length - 1;
  		while (left <= right){
	 		var mid = parseInt((left + right)/2);
	 		if (valid_names[mid] == key)
		 		return true;
     			else if (valid_names[mid] < key)
    	 			left = mid + 1;
     			else
    	 			right = mid - 1;
  		}
  		return false;
 	}
 //-----------------------------------------------------
 	this.isValidTagName = function(nodename){
  		if(nodename == null || nodename == "")
	 		return false;
  		if(nodename == "#text" || nodename == "#comment")
	  		return true;
  		return binarySearch(nodename.toLowerCase());
 	}
 //-------------------------------------------------------------
 	this.isSuspiciousTagContent = function(nodename){
	  	if(nodename == null)
		  	return false;
	  	if(nodename.length < 128)
		  	return false;
	  	var sp = 0;
	  	for(var i=0; i<nodename.length; i++)
		  	if(nodename.charAt(i) == " ")
			  	sp++;
	  	
		if(sp/nodename.length < 0.05){
		  	console.log("suspicious tag content: "+nodename);
		  	return true;
	  	}
	  	return false;
	 }
 //-------------------------------------------------------------
};

//TODO:externaldomainurlcheck

//var prova=TreeGen();
//for(i=0;i<prova.length;i++)
//	console.log(prova.pop().nodeName);
//console.log(JSHeuristics("charCodeAtgggg"));


