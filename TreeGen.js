var TreeGen=function(){ 
 var root=window.document;
 var nodelist=new Array();
 var nodelisttext=new Array();
 var index=0;
 var indextext=0;
 init();
 
 function init(){
	 readTree(root);
 }
 //-------------------------------
 this.getNextNode=function(){
	 if(index<nodelist.length)
		 return nodelist[index++];
	 else 
		 return null;
 }
 //---------------------------------
 this.getNextNodeText=function(){
	 if(indextext<nodelisttext.length)
		 return nodelisttext[indextext++];
	 else 
		 return null;
 }
 //---------------------------------
 this.resetIndex=function(){
	 index=0;
 }
 //------------------------------------
 this.resetIndexText=function(){
	 indextext=0;
 }
 //------------------------------------
 function readTree(parent){
	 var y=parent.childNodes;
	 for (var i=0;i<y.length;i++){
		 if (y.item(i).nodeType==1){
			 nodelist.push(y.item(i));
			 readTree(y.item(i));
	     }
		 else if(y.item(i).nodeType==3){
			  nodelisttext.push(y.item(i));
			  readTree(y.item(i));
		 }
	 }	 
 }

};


