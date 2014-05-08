/***
(function(){
	
	//XXX-------------------------------------------------[spamsum (fuzzy hashing)]--------------------------------------------------------
	var r,x,y,z,c,w,b,size=7; // vars for rolling hash
	var S=32; // min length of a signature (actually, it's the double of the min length, e.g. S=32, min_length=16)
	var max_length=128; // max length of a signature
	var offset_basis=2166136261, h1, h2; // vars for traditional hash (FNV 32-bit)
	var signature1;//,signature2;
	var two_power_32 = 4294967296; // Math.pow(2,32)
	
	function base64_encode(i){
		var code = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
		return code[i];
	}
	
	function log (base,number){
		return Math.log(number)/Math.log(base);
	}
	
	function unsigned_xor(a,b){
		var result = ((a >>> 1) ^ (b >>> 1)) * 2 + (a % 2 ^ b % 2);
		return result;
	}
	
	function reset_rolling_hash(){
		r=0,x=0,y=0,z=0,c=0,w=[];
		for (var i=0; i<size; i++){
			w.push(0);
		}
	}
	
	function update_rolling_hash (r,d){
		y = y-x;
		y = y + size*d;
		x = x+d;
		x = x - w[c%size];
		w[c%size] = d;
		c++;
		z = (z*32)%two_power_32; // same as z<<5, but the shift is only for signed int, I need unsigned int.
		z = unsigned_xor(z,d);
		r = x+y+z;
		
		return r;
	}
	
	function update_traditional_hash (h,d){
		var fnv_prime = 16777619;
		
		h = (h*fnv_prime)%two_power_32;
		h = unsigned_xor(h,d);
		
		return h;
	}
	
	function compute_match_score (distance,length_a,length_b){
		return (100 - (100*S*distance)/(64*(length_a+length_b)));
	}
	
	// replaces a char at the specified position
	function setCharAt(str,index,chr) {
	    if(index > str.length-1) return str;
	    return str.substr(0,index) + chr + str.substr(index+1);
	}
	
	// eliminates sequences longer than 3 identical chars (e.g. 'LLLL')
	function eliminate_sequences (string){
		var duplicate = string;
		
		for (var i=3,j=3; i<string.length; i++){
			if(string[i]!==string[i-1] || string[i]!==string[i-2]|| string[i]!==string[i-3]){
				duplicate = setCharAt(duplicate,j,string[i]);
				j++;
			}
		}
		
		return duplicate.substring(0,j);
	}
	
	// We accept a match only if the 2 signatures have a common substring
	// of at least the size of the rolling window (var size)
	function has_common_substring (a,b){
		var hashes = [];
		var size = Math.min(a.length,b.length)*0.2; 	// enable this if you want to chose a different size than the window size
														// increasing the value -> more false negatives, less false positives
														// decreasing the value -> more false positives, less false negatives
		
		reset_rolling_hash(); // using the rolling hash as filter for possible matches
		// compute the rolling hash for the first string
		for(var i=0; i<a.length; i++){
			var d = a.charCodeAt(i);
			hashes[i] = update_rolling_hash(r,d);
		}
		
		reset_rolling_hash();
		
		// compute the rolling hash for the second string,
		// meanwhile compare it to every other rolling hashes
		// of the first string.
		// then verify the matches with string comparison
		for(var i=0; i<b.length; i++){
			var d = b.charCodeAt(i);
			var h = update_rolling_hash(r,d);
			
			if (i < size-1){
				continue;
			}
			for (var j = size-1; j<hashes.length; j++){
				if(hashes[j]!=0 && hashes[j]==h){
					// the hashes are equal -> potential match
					// confirm it with direct string comparison
					if(b.substring(i-(size-1)).length >= size){
						var sub1 = a.substr(j-(size-1),size);
						var sub2 = b.substr(i-(size-1),size);
						if(sub1 === sub2){
							return true;
						}
					}
				}
			}
		}
		return false;
	}
	
	// NOTE: slightly modified version of levenshtein distance: computes the levenshtein distance starting from the char after ':'
	// because the signature format is "block_size:signature". The block size must be equal for the strings to be compared (but similar files
	// produce the same block size), so it's better to ignore that while computing the edit distance.
	// Then computes a match score in the range [0..100]
	function compare_signatures (a, b){
		
		var dist; // levenshtein distance
		var size_a = a.substring(0,a.indexOf(':')).length;
		var size_b = b.substring(0,b.indexOf(':')).length;
		if(size_a !== size_b){ // different block sizes -> not comparable -> match score=0
			return 0;
		}
		
		// The block sizes are equal. Now we can ignore them
		a = a.substring(a.indexOf(':'),a.length);
		b = b.substring(b.indexOf(':'),b.length);
		
		// Removing sequnces of identical chars longer than 3
		//a = eliminate_sequences(a);
		//b = eliminate_sequences(b);
		
		// trivial cases with one of the strings being empty
		if(a.length == 0) {
			dist = b.length;
			return compute_match_score(dist, a.length, b.length);
		}
		if(b.length == 0){ 
			dist = a.length;
			return compute_match_score(dist, a.length, b.length);
		} 
		
		// we accept a match only if they have a common substring
		// of length >= size
		//if(!has_common_substring(a,b)){
		//	return 0;
		//}
		
		var matrix = [];
		
		// increment along the first column of each row
		var i;
		for(i = 0; i <= b.length; i++){
			matrix[i] = [i];
		}
		
		// increment each column in the first row
		var j;
		for(j = 0; j <= a.length; j++){
			matrix[0][j] = j;
		}
		
		// Fill in the rest of the matrix
		for(i = 1; i <= b.length; i++){
		    for(j = 1; j <= a.length; j++){
		    	if(b.charAt(i-1) == a.charAt(j-1)){
		    		matrix[i][j] = matrix[i-1][j-1];
		    	}
		    	else {
		    		matrix[i][j] = Math.min(matrix[i-1][j-1] + 3, // substitution
		                                Math.min(matrix[i][j-1] + 1, // insertion
		                                         matrix[i-1][j] + 1)); // deletion
		    	}
		    }
		}
		dist = matrix[b.length][a.length];
		matrix = undefined; // freeing memory
		return compute_match_score(dist, a.length, b.length);
	};
	
	// The original version produces 2 signatures for every string (one with block_size=b, one with block_size=2b,
	// so you have more chance for 2 strings to be comparable).
	// So far similar strings always produced the same block_size, so I removed one for the sake of speed.
	function spamsum (input){
		var old_signature = '';
		var b_min = 3; // minimum block size
		var n = input.length;
		b = b_min*Math.pow(2,Math.floor(log(2,(n/(S*b_min))))); // initial block size
		var old_b=b;
		if (b < b_min){
			b = b_min;
		}
		var done = false;
		
		while (!done){
			reset_rolling_hash();
			h1=offset_basis, h2=offset_basis; // vars for traditional hash
			signature1='';//,signature2='';
			
			for (var i=0; i<input.length; i++){
				var d = input.charCodeAt(i);
				r = update_rolling_hash(r,d);
				h1 = update_traditional_hash(h1, d);
				//h2 = update_traditional_hash(h2, d);
				
				if (r%b == b-1){
					signature1 += base64_encode(h1 % 64);
					h1 = offset_basis;
				}
				//if (r%(b*2) == b*2-1){
				//	signature2 += base64_encode(h2 % 64);
				//	h2 = offset_basis;
				//}
			}
			
			signature1 = eliminate_sequences(signature1);
			
			if((signature1.length<S/2) && !(b/2<b_min)){
				old_signature = signature1;
				old_b = b;
				b = b/2;
			}
			else{
				if(signature1.length>max_length){
					// this signature is too long, using the last one even if it's shorter than the usual minimum 
					signature1 = old_signature;
					b=old_b;
					done = true;
				}
				else{
					done = true;
				}
			}
		}
		
		var signature = {size:b,signature:signature1};
		
		return signature;
	}
***/	
/***	
	//XXX----------------------------------------------------[acorn (Javascript parser)]-------------------------------------------------------
	
	// collection of signatures from malicious javascript
	var malicious = signatures;
	
	// array containing the node types of every node in the AST.
	// for compatibility issues with acorn, it's reversed (last array element -> first node)
	var tree = [];
	
	var input, inputLen;
	
	//checks if the given source code is malicious
	function isMalicious(source_code) {
		if(typeof source_code === "function"){
			if(source_code.name == ''){
				source_code = source_code.toString();
				source_code = source_code.substring(11); // pick only the body
				source_code = "function a()"+source_code; // add a name to the function to avoid parser errors
			}
			else{
				source_code = source_code.toString();
			}
		}
		// some source codes have HTML comments in it. Chrome handles them ignoring all the line if a comment is encountered.
		// this emulates the same thing in acorn.
		// the --> is handled inside the proper parser, because it could be a legit token (e.g. if(a-->5))
		var replaced = source_code.replace(/<!--/g, "//<!--");
	    
		var ast = makeAST(replaced);
	    
		//var digest = hex_md5(ast);
	    //if(typeof malicious[digest] !== "undefined"){
	    //	return true;
	    //}
		
		var signature = spamsum(ast);
		for (var i=0; i<malicious[signature.size].length; i++){
			var match_score = compare_signatures(signature.signature, malicious[signature.size][i]);
			if(match_score>99){//XXX
				console.log("match score of "+match_score+"% with signature["+signature.size+"]["+i+"]");
				console.log(malicious[signature.size][i]);
				console.log(source_code);
				return true;
			}
		}
	    
	    return false;
	};
	
	/*
	 * puts the backwards array (see "parse(inpt)") in a (non-backwards) string
	 * with a newline at each node
	 */
/***	function makeAST(string) {
	    var arrayOfTypes = parse(string);
	    var ast = '';
	    for (var i = arrayOfTypes.length - 1; i >= 1; i--) {
	        ast = ast + arrayOfTypes[i];
	    }
	    ast = ast + arrayOfTypes[0];
	
	    return ast;
	}
	
	// resets the state of the parser in between consecutive executions
	function resetState() {
	    containsEsc = inFunction = labels = lastEnd = lastFinishedNode = lastStart = strict = tokEnd = undefined;
	    tokPos = tokRegexpAllowed = tokStart = tokType = tokVal = undefined;
	}
	
	/*
	 * builds an array representing the AST (it's backwards,
	 * last node of the AST -> first element of the array)
	 */
/***	function parse(inpt) {
	    tree = [];
	    input = String(inpt);
	    inputLen = input.length;
	    try {
	        parseTopLevel();
	        return tree;
	        
	    // workaround for "HTML close comment" tag   
	    } catch (err) {
	        //if the unexpected token is a --> (HTML end of comment):
	        if ((err.message.search('Unexpected token') > -1) && (input[tokStart] === ">") && (input[tokStart - 1] === "-") && (input[tokStart - 2] === "-")) {
	            input = input.substring(0, tokStart - 2) + '//' + input.substring(tokStart - 2); // replace --> with //-->
	            resetState();
	            return parse(input); // re-parse the script with the --> commented and thus ignored
	        }
	        else{
	        	return tree;
	        }
	    }
	};
	
	
	// -------------------------------------------- [acorn parser] ------------------------------------------
	
	// Acorn is organized as a tokenizer and a recursive-descent parser.
	// Both use (closure-)global variables to keep their state and
	// communicate. We already saw the `input`, and
	// `inputLen` variables above (set in `parse`).
	
	// The current position of the tokenizer in the input.
	var tokPos;
	
	// The start and end offsets of the current token.
	var tokStart, tokEnd;
	
	// The type and value of the current token. Token types are objects,
	// named by variables against which they can be compared, and
	// holding properties that describe them (indicating, for example,
	// the precedence of an infix operator, and the original name of a
	// keyword token). The kind of value that's held in `tokVal` depends
	// on the type of the token. For literals, it is the literal value,
	// for operators, the operator name, and so on.
	var tokType
	, tokVal;
	
	// Interal state for the tokenizer. To distinguish between division
	// operators and regular expressions, it remembers whether the last
	// token was one that is allowed to be followed by an expression.
	// (If it is, a slash is probably a regexp, if it isn't it's a
	// division operator. See the `parseStatement` function for a
	// caveat.)
	var tokRegexpAllowed;
	
	// These store the position of the previous token, which is useful
	// when finishing a node and assigning its `end` position.
	var lastStart, lastEnd;
	
	// This is the parser's state. `inFunction` is used to reject
	// `return` statements outside of functions, `labels` to verify that
	// `break` and `continue` have somewhere to jump to, and `strict`
	// indicates whether strict mode is on.
	var inFunction, labels, strict;
	
	// This function is used to raise exceptions on parse errors. It
	// takes either a `{line, column}` object or an offset integer (into
	// the current `input`) as `pos` argument. Raises a `SyntaxError`
	// with that message.
	function raise(pos, message) {
	    throw new SyntaxError(message);
	}
	
	// ## Token types
	
	// The assignment of fine-grained, information-carrying type objects
	// allows the tokenizer to store the information it has about a
	// token in a way that is very cheap for the parser to look up.
	
	// All token type variables start with an underscore, to make them
	// easy to recognize.
	
	// These are the general types. The `type` property is only used to
	// make them recognizeable when debugging.
	var _num = {
	    type: "num"
	}, _regexp = {
	    type: "regexp"
	}, _string = {
	    type: "string"
	};
	var _name = {
	    type: "name"
	}, _eof = {
	    type: "eof"
	};
	
	// Keyword tokens. The `keyword` property (also used in keyword-like
	// operators) indicates that the token originated from an
	// identifier-like word, which is used when parsing property names.
	//
	// The `beforeExpr` property is used to disambiguate between regular
	// expressions and divisions. It is set on all token types that can
	// be followed by an expression (thus, a slash after them would be a
	// regular expression).
	//
	// `isLoop` marks a keyword as starting a loop, which is important
	// to know when parsing a label, in order to allow or disallow
	// continue jumps to that label.
	var _break = {
	    keyword: "break"
	}, _case = {
	    keyword: "case",
	    beforeExpr: true
	}, _catch = {
	    keyword: "catch"
	};
	var _continue = {
	    keyword: "continue"
	}, _debugger = {
	    keyword: "debugger"
	}, _default = {
	    keyword: "default"
	};
	var _do = {
	    keyword: "do",
	    isLoop: true
	}, _else = {
	    keyword: "else",
	    beforeExpr: true
	};
	var _finally = {
	    keyword: "finally"
	}, _for = {
	    keyword: "for",
	    isLoop: true
	}, _function = {
	    keyword: "function"
	};
	var _if = {
	    keyword: "if"
	}, _return = {
	    keyword: "return",
	    beforeExpr: true
	}, _switch = {
	    keyword: "switch"
	};
	var _throw = {
	    keyword: "throw",
	    beforeExpr: true
	}, _try = {
	    keyword: "try"
	}, _var = {
	    keyword: "var"
	};
	var _while = {
	    keyword: "while",
	    isLoop: true
	}, _with = {
	    keyword: "with"
	}, _new = {
	    keyword: "new",
	    beforeExpr: true
	};
	var _this = {
	    keyword: "this"
	};
	
	// The keywords that denote values.
	var _null = {
	    keyword: "null",
	    atomValue: null
	}, _true = {
	    keyword: "true",
	    atomValue: true
	};
	var _false = {
	    keyword: "false",
	    atomValue: false
	};
	
	// Some keywords are treated as regular operators. `in` sometimes
	// (when parsing `for`) needs to be tested against specifically, so
	// we assign a variable name to it for quick comparing.
	var _in = {
	    keyword: "in",
	    binop: 7,
	    beforeExpr: true
	};
	
	// Map keyword names to token types.
	var keywordTypes = {
	    "break": _break,
	    "case": _case,
	    "catch": _catch,
	        "continue": _continue,
	    "debugger": _debugger,
	    "default": _default,
	        "do": _do,
	    "else": _else,
	    "finally": _finally,
	    "for": _for,
	        "function": _function,
	    "if": _if,
	    "return": _return,
	    "switch": _switch,
	        "throw": _throw,
	    "try": _try,
	    "var": _var,
	    "while": _while,
	    "with": _with,
	        "null": _null,
	    "true": _true,
	    "false": _false,
	    "new": _new,
	    "in": _in,
	        "instanceof": {
	        keyword: "instanceof",
	        binop: 7
	    },
	    "this": _this,
	        "typeof": {
	        keyword: "typeof",
	        prefix: true
	    },
	        "void": {
	        keyword: "void",
	        prefix: true
	    },
	        "delete": {
	        keyword: "delete",
	        prefix: true
	    }
	};
	
	// Punctuation token types. Again, the `type` property is purely for debugging.
	var _bracketL = {
	    type: "[",
	    beforeExpr: true
	}, _bracketR = {
	    type: "]"
	}, _braceL = {
	    type: "{",
	    beforeExpr: true
	};
	var _braceR = {
	    type: "}"
	}, _parenL = {
	    type: "(",
	    beforeExpr: true
	}, _parenR = {
	    type: ")"
	};
	var _comma = {
	    type: ",",
	    beforeExpr: true
	}, _semi = {
	    type: ";",
	    beforeExpr: true
	};
	var _colon = {
	    type: ":",
	    beforeExpr: true
	}, _dot = {
	    type: "."
	}, _question = {
	    type: "?",
	    beforeExpr: true
	};
	
	// Operators. These carry several kinds of properties to help the
	// parser use them properly (the presence of these properties is
	// what categorizes them as operators).
	//
	// `binop`, when present, specifies that this operator is a binary
	// operator, and will refer to its precedence.
	//
	// `prefix` and `postfix` mark the operator as a prefix or postfix
	// unary operator. `isUpdate` specifies that the node produced by
	// the operator should be of type UpdateExpression rather than
	// simply UnaryExpression (`++` and `--`).
	//
	// `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
	// binary operators with a very low precedence, that should result
	// in AssignmentExpression nodes.
	var _slash = {
	    binop: 10,
	    beforeExpr: true
	}, _eq = {
	    isAssign: true,
	    beforeExpr: true
	};
	var _assign = {
	    isAssign: true,
	    beforeExpr: true
	}, _plusmin = {
	    binop: 9,
	    prefix: true,
	    beforeExpr: true
	};
	var _incdec = {
	    postfix: true,
	    prefix: true,
	    isUpdate: true
	}, _prefix = {
	    prefix: true,
	    beforeExpr: true
	};
	var _bin1 = {
	    binop: 1,
	    beforeExpr: true
	}, _bin2 = {
	    binop: 2,
	    beforeExpr: true
	};
	var _bin3 = {
	    binop: 3,
	    beforeExpr: true
	}, _bin4 = {
	    binop: 4,
	    beforeExpr: true
	};
	var _bin5 = {
	    binop: 5,
	    beforeExpr: true
	}, _bin6 = {
	    binop: 6,
	    beforeExpr: true
	};
	var _bin7 = {
	    binop: 7,
	    beforeExpr: true
	}, _bin8 = {
	    binop: 8,
	    beforeExpr: true
	};
	var _bin10 = {
	    binop: 10,
	    beforeExpr: true
	};
	
	// This is a trick taken from Esprima. It turns out that, on
	// non-Chrome browsers, to check whether a string is in a set, a
	// predicate containing a big ugly `switch` statement is faster than
	// a regular expression, and on Chrome the two are about on par.
	// This function uses `eval` (non-lexical) to produce such a
	// predicate from a space-separated string of words.
	//
	// It starts by sorting the words by length.
	function makePredicate(words) {
	    words = words.split(" ");
	    var f = "",
	        cats = [];
	    out: for (var i = 0; i < words.length; ++i) {
	        for (var j = 0; j < cats.length; ++j)
	        if (cats[j][0].length == words[i].length) {
	            cats[j].push(words[i]);
	            continue out;
	        }
	        cats.push([words[i]]);
	    }
	
	    function compareTo(arr) {
	        if (arr.length == 1) return f += "return str === " + JSON.stringify(arr[0]) + ";";
	        f += "switch(str){";
	        for (var i = 0; i < arr.length; ++i) f += "case " + JSON.stringify(arr[i]) + ":";
	        f += "return true}return false;";
	    }
	
	    // When there are more than three length categories, an outer
	    // switch first dispatches on the lengths, to save on comparisons.
	    if (cats.length > 3) {
	        cats.sort(function (a, b) {
	            return b.length - a.length;
	        });
	        f += "switch(str.length){";
	        for (var i = 0; i < cats.length; ++i) {
	            var cat = cats[i];
	            f += "case " + cat[0].length + ":";
	            compareTo(cat);
	        }
	        f += "}";
	
	        // Otherwise, simply generate a flat `switch` statement.
	    } else {
	        compareTo(words);
	    }
	    return new Function("str", f);
	}
	
	// The additional reserved words in strict mode.
	var isStrictReservedWord = makePredicate("implements interface let package private protected public static yield");
	
	// The forbidden variable names in strict mode.
	var isStrictBadIdWord = makePredicate("eval arguments");
	
	// And the keywords.
	var isKeyword = makePredicate("break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this");
	
	// ## Character categories
	
	// Big ugly regular expressions that match characters in the
	// whitespace, identifier, and identifier-start categories. These
	// are only applied when a character is found to actually have a
	// code point above 128.
***/	var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/;
	var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
	var nonASCIIidentifierChars = "\u0371-\u0374\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";
/***	var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
	var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");
	
	// Whether a single character denotes a newline.
	var newline = /[\n\r\u2028\u2029]/;
	
	// Test whether a given character code starts an identifier.
	function isIdentifierStart(code) {
	    return (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 36 || code === 95 || (code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code)));
	}
	
	// Test whether a given character is part of an identifier.
	function isIdentifierChar(ch) {
	    return ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || ch === "$" || ch === "_" || (ch >= "\xaa" && nonASCIIidentifier.test(ch)));
	}
	
	// ## Tokenizer
	
	// Reset the token state. Used at the start of a parse.
	function initTokenState() {
	    tokPos = 0;
	    tokRegexpAllowed = true;
	    skipSpace();
	}
	
	// Called at the end of every token. Sets `tokEnd`, `tokVal`,
	// and `tokRegexpAllowed`, and skips the space
	// after the token, so that the next one's `tokStart` will point at
	// the right position.
	function finishToken(type, val) {
	    tokEnd = tokPos;
	    tokType = type;
	    skipSpace();
	    tokVal = val;
	    tokRegexpAllowed = type.beforeExpr;
	}
	
	function skipBlockComment() {
	    var end = input.indexOf("*//***", tokPos += 2);
	    if (end === -1) raise(tokPos - 2, "Unterminated comment");
	    tokPos = end + 2;
	}
	
	function skipLineComment() {
	    tokPos += 2;
	    while (tokPos < inputLen && !newline.test(input.charAt(tokPos)))++tokPos;
	}
	
	// Called at the start of the parse and after every token. Skips
	// whitespace and comments.
	function skipSpace() {
	    while (tokPos < inputLen) {
	        var ch = input.charAt(tokPos);
	        if (ch === "/") {
	            var nextCh = input.charAt(tokPos + 1);
	            if (nextCh === "*") {
	                skipBlockComment();
	            } else if (nextCh === "/") {
	                skipLineComment();
	            } else break;
	        } else if (ch === " " || ch === '\t' || ch === "\n" || ch === "\r" || ch === "\f" || ch === "\xa0" || ch === "\x0b" || (ch >= "\u1680" && nonASCIIwhitespace.test(ch))) {
	            ++tokPos;
	        } else {
	            break;
	        }
	    }
	}
	
	// ### Token reading
	
	// This is the function that is called to fetch the next token. It
	// is somewhat obscure, because it works in character codes rather
	// than characters, and because operator parsing has been inlined
	// into it.
	//
	// All in the name of speed.
	//
	// The `forceRegexp` parameter is used in the one case where the
	// `tokRegexpAllowed` trick does not work. See `parseStatement`.
	function readToken(forceRegexp) {
	    tokStart = tokPos;
	    if (forceRegexp) return readRegexp();
	    if (tokPos >= inputLen) return finishToken(_eof);
	
	    var code = input.charCodeAt(tokPos);
	    // Identifier or keyword. '\uXXXX' sequences are allowed in
	    // identifiers, so '\' also dispatches to that.
	    if (isIdentifierStart(code) || code === 92 /* '\' *//*** ) return readWord();
	    var next = input.charCodeAt(tokPos + 1);
	
	    switch (code) {
	        // The interpretation of a dot depends on whether it is followed
	        // by a digit.
	        case 46:
	            // '.'
	            if (next >= 48 && next <= 57) return readNumber(String.fromCharCode(code));
	            ++tokPos;
	            return finishToken(_dot);
	
	            // Punctuation tokens.
	        case 40:
	            ++tokPos;
	            return finishToken(_parenL);
	        case 41:
	            ++tokPos;
	            return finishToken(_parenR);
	        case 59:
	            ++tokPos;
	            return finishToken(_semi);
	        case 44:
	            ++tokPos;
	            return finishToken(_comma);
	        case 91:
	            ++tokPos;
	            return finishToken(_bracketL);
	        case 93:
	            ++tokPos;
	            return finishToken(_bracketR);
	        case 123:
	            ++tokPos;
	            return finishToken(_braceL);
	        case 125:
	            ++tokPos;
	            return finishToken(_braceR);
	        case 58:
	            ++tokPos;
	            return finishToken(_colon);
	        case 63:
	            ++tokPos;
	            return finishToken(_question);
	
	            // '0x' is a hexadecimal number.
	        case 48:
	            // '0'
	            if (next === 120 || next === 88) return readHexNumber();
	            // Anything else beginning with a digit is an integer, octal
	            // number, or float.
	        case 49:
	        case 50:
	        case 51:
	        case 52:
	        case 53:
	        case 54:
	        case 55:
	        case 56:
	        case 57:
	            // 1-9
	            return readNumber(String.fromCharCode(code));
	
	            // Quotes produce strings.
	        case 34:
	        case 39:
	            // '"', "'"
	            return readString(String.fromCharCode(code));
	
	            // Operators are parsed inline in tiny state machines. '=' (61) is
	            // often referred to. `finishOp` simply skips the amount of
	            // characters it is given as second argument, and returns a token
	            // of the type given by its first argument.
	        case 47:
	            // '/'
	            if (tokRegexpAllowed) {
	                ++tokPos;
	                return readRegexp();
	            }
	            if (next === 61) return finishOp(_assign, 2);
	            return finishOp(_slash, 1);
	
	        case 37:
	        case 42:
	            // '%*'
	            if (next === 61) return finishOp(_assign, 2);
	            return finishOp(_bin10, 1);
	
	        case 124:
	        case 38:
	            // '|&'
	            if (next === code) return finishOp(code === 124 ? _bin1 : _bin2, 2);
	            if (next === 61) return finishOp(_assign, 2);
	            return finishOp(code === 124 ? _bin3 : _bin5, 1);
	
	        case 94:
	            // '^'
	            if (next === 61) return finishOp(_assign, 2);
	            return finishOp(_bin4, 1);
	
	        case 43:
	        case 45:
	            // '+-'
	            if (next === code) return finishOp(_incdec, 2);
	            if (next === 61) return finishOp(_assign, 2);
	            return finishOp(_plusmin, 1);
	
	        case 60:
	        case 62:
	            // '<>'
	            var size = 1;
	            if (next === code) {
	                size = code === 62 && input.charCodeAt(tokPos + 2) === 62 ? 3 : 2;
	                if (input.charCodeAt(tokPos + size) === 61) return finishOp(_assign, size + 1);
	                return finishOp(_bin8, size);
	            }
	            if (next === 61) size = input.charCodeAt(tokPos + 2) === 61 ? 3 : 2;
	            return finishOp(_bin7, size);
	
	        case 61:
	        case 33:
	            // '=!'
	            if (next === 61) return finishOp(_bin6, input.charCodeAt(tokPos + 2) === 61 ? 3 : 2);
	            return finishOp(code === 61 ? _eq : _prefix, 1);
	
	        case 126:
	            // '~'
	            return finishOp(_prefix, 1);
	    }
	
	    // If we are here, we either found a non-ASCII identifier
	    // character, or something that's entirely disallowed.
	    var ch = String.fromCharCode(code);
	    if (ch === "\\" || nonASCIIidentifierStart.test(ch)) return readWord();
	    raise(tokPos, "Unexpected character '" + ch + "'");
	}
	
	function finishOp(type, size) {
	    var str = input.slice(tokPos, tokPos + size);
	    tokPos += size;
	    finishToken(type, str);
	}
	
	// Parse a regular expression. Some context-awareness is necessary,
	// since a '/' inside a '[]' set does not end the expression.
	function readRegexp() {
	    var escaped=null, inClass=null, start = tokPos;
	    for (;;) {
	        if (tokPos >= inputLen) raise(start, "Unterminated regular expression");
	        var ch = input.charAt(tokPos);
	        if (newline.test(ch)) raise(start, "Unterminated regular expression");
	        if (!escaped) {
	            if (ch === "[") inClass = true;
	            else if (ch === "]" && inClass) inClass = false;
	            else if (ch === "/" && !inClass) break;
	            escaped = ch === "\\";
	        } else escaped = false;
	        ++tokPos;
	    }
	    var content = input.slice(start, tokPos);
	    ++tokPos;
	    // Need to use `readWord1` because '\uXXXX' sequences are allowed
	    // here (don't ask).
	    var mods = readWord1();
	    if (mods && !/^[gmsiy]*$/.test(mods)) raise(start, "Invalid regexp flag");
	    return finishToken(_regexp, new RegExp(content, mods));
	}
	
	// Read an integer in the given radix. Return null if zero digits
	// were read, the integer value otherwise. When `len` is given, this
	// will return `null` unless the integer has exactly `len` digits.
	function readInt(radix, len) {
	    var start = tokPos,
	        total = 0;
	    for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
	    	var code = input.charCodeAt(tokPos),
	        val;
	    if (code >= 97) val = code - 97 + 10; // a
	    else if (code >= 65) val = code - 65 + 10; // A
	    else if (code >= 48 && code <= 57) val = code - 48; // 0-9
	    else val = Infinity;
	    if (val >= radix) break;
	    ++tokPos;
	    total = total * radix + val;
	    }
	    if (tokPos === start || len != null && tokPos - start !== len) return null;
	
	    return total;
	}
	
	function readHexNumber() {
	    tokPos += 2; // 0x
	    var val = readInt(16);
	    if (val == null) raise(tokStart + 2, "Expected hexadecimal number");
	    if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");
	    return finishToken(_num, val);
	}
	
	// Read an integer, octal integer, or floating-point number.
	function readNumber(ch) {
	    var start = tokPos,
	        isFloat = ch === ".";
	    if (!isFloat && readInt(10) == null) raise(start, "Invalid number");
	    if (isFloat || input.charAt(tokPos) === ".") {
	        var next = input.charAt(++tokPos);
	        if (next === "-" || next === "+")++tokPos;
	        if (readInt(10) === null && ch === ".") raise(start, "Invalid number");
	        isFloat = true;
	    }
	    if (/e/i.test(input.charAt(tokPos))) {
	        var next = input.charAt(++tokPos);
	        if (next === "-" || next === "+")++tokPos;
	        if (readInt(10) === null) raise(start, "Invalid number");
	        isFloat = true;
	    }
	    if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");
	
	    var str = input.slice(start, tokPos),
	        val = null;
	    if (isFloat) val = parseFloat(str);
	    else if (ch !== "0" || str.length === 1) val = parseInt(str, 10);
	    else if (/[89]/.test(str) || strict) raise(start, "Invalid number");
	    else val = parseInt(str, 8);
	    return finishToken(_num, val);
	}
	
	// Read a string value, interpreting backslash-escapes.
	function readString(quote) {
	    tokPos++;
	    var str = "";
	    for (;;) {
	        if (tokPos >= inputLen) raise(tokStart, "Unterminated string constant");
	        var ch = input.charAt(tokPos);
	        if (ch === quote) {
	            ++tokPos;
	            return finishToken(_string, str);
	        }
	        if (ch === "\\") {
	            ch = input.charAt(++tokPos);
	            var octal = /^[0-7]+/.exec(input.slice(tokPos, tokPos + 3));
	            if (octal) octal = octal[0];
	            while (octal && parseInt(octal, 8) > 255) octal = octal.slice(0, octal.length - 1);
	            if (octal === "0") octal = null;
	            ++tokPos;
	            if (octal) {
	                if (strict) raise(tokPos - 2, "Octal literal in strict mode");
	                str += String.fromCharCode(parseInt(octal, 8));
	                tokPos += octal.length - 1;
	            } else if (ch === "x") {
	                str += readHexChar(2);
	            } else if (ch === "u") {
	                str += readHexChar(4);
	            } else if (ch === "U") {
	                str += readHexChar(8);
	            } else {
	                switch (ch) {
	                    case "n":
	                        str += "\n";
	                        break;
	                    case "r":
	                        str += "\r";
	                        break;
	                    case "t":
	                        str += "\t";
	                        break;
	                    case "b":
	                        str += "\b";
	                        break;
	                    case "v":
	                        str += "\u000b";
	                        break;
	                    case "f":
	                        str += "\f";
	                        break;
	                    case "0":
	                        str += "\0";
	                        break;
	                    case "\r":
	                        if (input.charAt(tokPos) === "\n")++tokPos;
	                    case "\n":
	                        break;
	                    default:
	                        str += ch;
	                        break;
	                }
	            }
	        } else {
	            if (newline.test(ch)) raise(tokStart, "Unterminated string constant");
	            if (ch !== "\\") str += ch;
	            ++tokPos;
	        }
	    }
	}
	
	// Used to read character escape sequences ('\x', '\u', '\U').
	function readHexChar(len) {
	    var n = readInt(16, len);
	    if (n === null) raise(tokStart, "Bad character escape sequence");
	    return String.fromCharCode(n);
	}
	
	// Used to signal to callers of `readWord1` whether the word
	// contained any escape sequences. This is needed because words with
	// escape sequences must not be interpreted as keywords.
	var containsEsc;
	
	// Read an identifier, and return it as a string. Sets `containsEsc`
	// to whether the word contained a '\u' escape.
	//
	// Only builds up the word character-by-character when it actually
	// containeds an escape, as a micro-optimization.
	function readWord1() {
	    containsEsc = false;
	    var word = null, first = true,
	        start = tokPos;
	    for (;;) {
	        var ch = input.charAt(tokPos);
	        if (isIdentifierChar(ch)) {
	            if (containsEsc) word += ch;
	            ++tokPos;
	        } else if (ch === "\\") {
	            if (!containsEsc) word = input.slice(start, tokPos);
	            containsEsc = true;
	            if (input.charAt(++tokPos) != "u") raise(tokPos, "Expecting Unicode escape sequence \\uXXXX");
	            ++tokPos;
	            var esc = readHexChar(4);
	            if (!esc) raise(tokPos - 1, "Invalid Unicode escape");
	            if (!(first ? isIdentifierStart(esc.charCodeAt(0)) : isIdentifierChar(esc))) raise(tokPos - 4, "Invalid Unicode escape");
	            word += esc;
	        } else {
	            break;
	        }
	        first = false;
	    }
	    return containsEsc ? word : input.slice(start, tokPos);
	}
	
	// Read an identifier or keyword token. Will check for reserved
	// words when necessary.
	function readWord() {
	    var word = readWord1();
	    var type = _name;
	    if (!containsEsc) {
	        if (isKeyword(word)) type = keywordTypes[word];
	    }
	    return finishToken(type, word);
	}
	
	// ## Parser
	
	// A recursive descent parser operates by defining functions for all
	// syntactic elements, and recursively calling those, each function
	// advancing the input stream and returning an AST node. Precedence
	// of constructs (for example, the fact that `!x[1]` means `!(x[1])`
	// instead of `(!x)[1]` is handled by the fact that the parser
	// function that parses unary prefix operators is called first, and
	// in turn calls the function that parses `[]` subscripts — that
	// way, it'll receive the node for `x[1]` already parsed, and wraps
	// *that* in the unary operator node.
	//
	// Acorn uses an [operator precedence parser][opp] to handle binary
	// operator precedence, because it is much more compact than using
	// the technique outlined above, which uses different, nesting
	// functions to specify precedence, for all of the ten binary
	// precedence levels that JavaScript defines.
	//
	// [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser
	
	// ### Parser utilities
	
	// Continue to the next token.
	function next() {
	    lastStart = tokStart;
	    lastEnd = tokEnd;
	    readToken();
	}
	
	// Enter strict mode. Re-reads the next token to please pedantic
	// tests ("use strict"; 010; -- should fail).
	function setStrict(strct) {
	    strict = strct;
	    tokPos = lastEnd;
	    skipSpace();
	    readToken();
	}
	
	// Start an AST node, attaching a start offset and optionally a
	// `commentsBefore` property to it.
	function startNode() {
	    var node = {
	        type: null,
	        start: tokStart,
	        end: null
	    };
	    return node;
	}
	
	// Start a node whose start offset/comments information should be
	// based on the start of another node. For example, a binary
	// operator node is only started after its left-hand side has
	// already been parsed.
	function startNodeFrom(other) {
	    var node = {
	        type: null,
	        start: other.start
	    };
	    if (other.commentsBefore) {
	        node.commentsBefore = other.commentsBefore;
	        other.commentsBefore = null;
	    }
	    return node;
	}
	
	// Finish an AST node, adding `type`, `end`, and `commentsAfter`
	// properties.
	//
	// We keep track of the last node that we finished, in order
	// 'bubble' `commentsAfter` properties up to the biggest node. I.e.
	// in '`1 + 1 // foo', the comment should be attached to the binary
	// operator node, not the second literal node.
	var lastFinishedNode;
	
	function finishNode(node, type) {
	    node.type = type;
	    node.end = lastEnd;
	    tree.push(type);
	    return node;
	}
	
	// Test whether a statement node is the string literal `"use strict"`.
	function isUseStrict(stmt) {
	    return stmt.type === "ExpressionStatement" && stmt.expression.type === "Literal" && stmt.expression.value === "use strict";
	}
	
	// Predicate that tests whether the next token is of the given
	// type, and if yes, consumes it as a side effect.
	function eat(type) {
	    if (tokType === type) {
	        next();
	        return true;
	    }
	}
	
	// Test whether a semicolon can be inserted at the current position.
	function canInsertSemicolon() {
	    return tokType === _eof || tokType === _braceR || newline.test(input.slice(lastEnd, tokStart));
	}
	
	// Consume a semicolon, or, failing that, see if we are allowed to
	// pretend that there is a semicolon at this position.
	function semicolon() {
	    if (!eat(_semi) && !canInsertSemicolon()) unexpected();
	}
	
	// Expect a token of a given type. If found, consume it, otherwise,
	// raise an unexpected token error.
	function expect(type) {
	    if (tokType === type) next();
	    else unexpected();
	}
	
	// Raise an unexpected token error.
	function unexpected() {
	    raise(tokStart, "Unexpected token");
	}
	
	// Verify that a node is an lval — something that can be assigned
	// to.
	function checkLVal(expr) {
	    if (expr.type !== "Identifier" && expr.type !== "MemberExpression") raise(expr.start, "Assigning to rvalue");
	    if (strict && expr.type === "Identifier" && isStrictBadIdWord(expr.name)) raise(expr.start, "Assigning to " + expr.name + " in strict mode");
	}
	
	// ### Statement parsing
	
	// Parse a program. Initializes the parser, reads any number of
	// statements, and wraps them in a Program node.  Optionally takes a
	// `program` argument.  If present, the statements will be appended
	// to its body instead of creating a new node.
	function parseTopLevel() {
	    initTokenState();
	    lastStart = lastEnd = tokPos;
	    inFunction = strict = null;
	    labels = [];
	    readToken();
	    var node = startNode(),
	        first = true;
	    node.body = [];
	    while (tokType !== _eof) {
	        var stmt = parseStatement();
	        node.body.push(stmt);
	        if (first && isUseStrict(stmt)) setStrict(true);
	        first = false;
	    }
	    return finishNode(node, "Z");
	};
	
	var loopLabel = {
	    kind: "loop"
	}, switchLabel = {
	    kind: "switch"
	};
	
	// Parse a single statement.
	//
	// If expecting a statement and finding a slash operator, parse a
	// regular expression literal. This is to handle cases like
	// `if (foo) /blah/.exec(foo);`, where looking at the previous token
	// does not help.
	function parseStatement() {
	    if (tokType === _slash) readToken(true);
	
	    var starttype = tokType,
	        node = startNode();
	
	    // Most types of statements are recognized by the keyword they
	    // start with. Many are trivial to parse, some require a bit of
	    // complexity.
	    switch (starttype) {
	        case _break:
	        case _continue:
	            next();
	            var isBreak = starttype === _break;
	            if (eat(_semi) || canInsertSemicolon()) node.label = null;
	            else if (tokType !== _name) unexpected();
	            else {
	                node.label = parseIdent();
	                semicolon();
	            }
	
	            // Verify that there is an actual destination to break or
	            // continue to.
	            for (var i = 0; i < labels.length; ++i) {
	                var lab = labels[i];
	                if (node.label == null || lab.name === node.label.name) {
	                    if (lab.kind != null && (isBreak || lab.kind === "loop")) break;
	                    if (node.label && isBreak) break;
	                }
	            }
	            if (i === labels.length) raise(node.start, "Unsyntactic " + starttype.keyword);
	            return finishNode(node, isBreak ? "E" : "I");
	
	        case _debugger:
	            next();
	            semicolon();
	            return finishNode(node, "J");
	
	        case _do:
	            next();
	            labels.push(loopLabel);
	            node.body = parseStatement();
	            labels.pop();
	            expect(_while);
	            node.test = parseParenExpression();
	            semicolon();
	            return finishNode(node, "K");
	
	            // Disambiguating between a `for` and a `for`/`in` loop is
	            // non-trivial. Basically, we have to parse the init `var`
	            // statement or expression, disallowing the `in` operator (see
	            // the second parameter to `parseExpression`), and then check
	            // whether the next token is `in`. When there is no init part
	            // (semicolon immediately after the opening parenthesis), it is
	            // a regular `for` loop.
	        case _for:
	            next();
	            labels.push(loopLabel);
	            expect(_parenL);
	            if (tokType === _semi) return parseFor(node, null);
	            if (tokType === _var) {
	                var init = startNode();
	                next();
	                parseVar(init, true);
	                if (init.declarations.length === 1 && eat(_in)) return parseForIn(node, init);
	                return parseFor(node, init);
	            }
	            var init = parseExpression(false, true);
	            if (eat(_in)) {
	                checkLVal(init);
	                return parseForIn(node, init);
	            }
	            return parseFor(node, init);
	
	        case _function:
	            next();
	            return parseFunction(node, true);
	
	        case _if:
	            next();
	            node.test = parseParenExpression();
	            node.consequent = parseStatement();
	            node.alternate = eat(_else) ? parseStatement() : null;
	            return finishNode(node, "S");
	
	        case _return:
	            if (!inFunction) raise(tokStart, "'return' outside of function");
	            next();
	
	            // In `return` (and `break`/`continue`), the keywords with
	            // optional arguments, we eagerly look for a semicolon or the
	            // possibility to insert one.
	            if (eat(_semi) || canInsertSemicolon()) node.argument = null;
	            else {
	                node.argument = parseExpression();
	                semicolon();
	            }
	            return finishNode(node, "a");
	
	        case _switch:
	            next();
	            node.discriminant = parseParenExpression();
	            node.cases = [];
	            expect(_braceL);
	            labels.push(switchLabel);
	
	            // Statements under must be grouped (by label) in SwitchCase
	            // nodes. `cur` is used to keep the node that we are currently
	            // adding statements to.
	            for (var cur=null, sawDefault=null; tokType != _braceR;) {
	                if (tokType === _case || tokType === _default) {
	                    var isCase = tokType === _case;
	                    if (cur) finishNode(cur, "c");
	                    node.cases.push(cur = startNode());
	                    cur.consequent = [];
	                    next();
	                    if (isCase) cur.test = parseExpression();
	                    else {
	                        if (sawDefault) raise(lastStart, "Multiple default clauses");
	                        sawDefault = true;
	                        cur.test = null;
	                    }
	                    expect(_colon);
	                } else {
	                    if (!cur) unexpected();
	                    cur.consequent.push(parseStatement());
	                }
	            }
	            if (cur) finishNode(cur, "c");
	            next(); // Closing brace
	            labels.pop();
	            return finishNode(node, "d");
	
	        case _throw:
	            next();
	            if (newline.test(input.slice(lastEnd, tokStart))) raise(lastEnd, "Illegal newline after throw");
	            node.argument = parseExpression();
	            semicolon();
	            return finishNode(node, "f");
	
	        case _try:
	            next();
	            node.block = parseBlock();
	            node.handlers = [];
	            while (tokType === _catch) {
	                var clause = startNode();
	                next();
	                expect(_parenL);
	                clause.param = parseIdent();
	                if (strict && isStrictBadIdWord(clause.param.name)) raise(clause.param.start, "Binding " + clause.param.name + " in strict mode");
	                expect(_parenR);
	                clause.guard = null;
	                clause.body = parseBlock();
	                node.handlers.push(finishNode(clause, "G"));
	            }
	            node.finalizer = eat(_finally) ? parseBlock() : null;
	            if (!node.handlers.length && !node.finalizer) raise(node.start, "Missing catch or finally clause");
	            return finishNode(node, "g");
	
	        case _var:
	            next();
	            node = parseVar(node);
	            semicolon();
	            return node;
	
	        case _while:
	            next();
	            node.test = parseParenExpression();
	            labels.push(loopLabel);
	            node.body = parseStatement();
	            labels.pop();
	            return finishNode(node, "l");
	
	        case _with:
	            if (strict) raise(tokStart, "'with' in strict mode");
	            next();
	            node.object = parseParenExpression();
	            node.body = parseStatement();
	            return finishNode(node, "m");
	
	        case _braceL:
	            return parseBlock();
	
	        case _semi:
	            next();
	            return finishNode(node, "L");
	
	            // If the statement does not start with a statement keyword or a
	            // brace, it's an ExpressionStatement or LabeledStatement. We
	            // simply start parsing an expression, and afterwards, if the
	            // next token is a colon and the expression was a simple
	            // Identifier node, we switch to interpreting it as a label.
	        default:
	            var maybeName = tokVal,
	                expr = parseExpression();
	            if (starttype === _name && expr.type === "R" && eat(_colon)) {
	                for (var i = 0; i < labels.length; ++i)
			        if (labels[i].name === maybeName){
			        	raise(expr.start, "Label '" + maybeName + "' is already declared");
			        }
	                var kind = tokType.isLoop ? "loop" : tokType === _switch ? "switch" : null;
	                labels.push({
	                    name: maybeName,
	                    kind: kind
	                });
	                node.body = parseStatement();
	                labels.pop();
	                node.label = expr;
	                return finishNode(node, "T");
	            } else {
	                node.expression = expr;
	                semicolon();
	                return finishNode(node, "M");
	            }
	    }
	}
	
	// Used for constructs like `switch` and `if` that insist on
	// parentheses around their expression.
	function parseParenExpression() {
	    expect(_parenL);
	    var val = parseExpression();
	    expect(_parenR);
	    return val;
	}
	
	// Parse a semicolon-enclosed block of statements, handling `"use
	// strict"` declarations when `allowStrict` is true (used for
	// function bodies).
	function parseBlock(allowStrict) {
	    var node = startNode(),
	        first = true,
	        strict = false,
	        oldStrict = null;
	    node.body = [];
	    expect(_braceL);
	    while (!eat(_braceR)) {
	        var stmt = parseStatement();
	        node.body.push(stmt);
	        if (first && isUseStrict(stmt)) {
	            oldStrict = strict;
	            setStrict(strict = true);
	        }
	        first = false;
	    }
	    if (strict && !oldStrict) setStrict(false);
	    return finishNode(node, "D");
	}
	
	// Parse a regular `for` loop. The disambiguation code in
	// `parseStatement` will already have parsed the init statement or
	// expression.
	function parseFor(node, init) {
	    node.init = init;
	    expect(_semi);
	    node.test = tokType === _semi ? null : parseExpression();
	    expect(_semi);
	    node.update = tokType === _parenR ? null : parseExpression();
	    expect(_parenR);
	    node.body = parseStatement();
	    labels.pop();
	    return finishNode(node, "O");
	}
	
	// Parse a `for`/`in` loop.
	function parseForIn(node, init) {
	    node.left = init;
	    node.right = parseExpression();
	    expect(_parenR);
	    node.body = parseStatement();
	    labels.pop();
	    return finishNode(node, "N");
	}
	
	// Parse a list of variable declarations.
	function parseVar(node, noIn) {
	    node.declarations = [];
	    node.kind = "var";
	    for (;;) {
	        var decl = startNode();
	        decl.id = parseIdent();
	        if (strict && isStrictBadIdWord(decl.id.name)) raise(decl.id.start, "Binding " + decl.id.name + " in strict mode");
	        decl.init = eat(_eq) ? parseExpression(true, noIn) : null;
	        node.declarations.push(finishNode(decl, "k"));
	        if (!eat(_comma)) break;
	    }
	    return finishNode(node, "j");
	}
	
	// ### Expression parsing
	
	// These nest, from the most general expression type at the top to
	// 'atomic', nondivisible expression types at the bottom. Most of
	// the functions will simply let the function(s) below them parse,
	// and, *if* the syntactic construct they handle is present, wrap
	// the AST node that the inner parser gave them in another node.
	
	// Parse a full expression. The arguments are used to forbid comma
	// sequences (in argument lists, array literals, or object literals)
	// or the `in` operator (in for loops initalization expressions).
	function parseExpression(noComma, noIn) {
	    var expr = parseMaybeAssign(noIn);
	    if (!noComma && tokType === _comma) {
	        var node = startNodeFrom(expr);
	        node.expressions = [expr];
	        while (eat(_comma)) node.expressions.push(parseMaybeAssign(noIn));
	        return finishNode(node, "b");
	    }
	    return expr;
	}
	
	// Parse an assignment expression. This includes applications of
	// operators like `+=`.
	function parseMaybeAssign(noIn) {
	    var left = parseMaybeConditional(noIn);
	    if (tokType.isAssign) {
	        var node = startNodeFrom(left);
	        node.operator = tokVal;
	        node.left = left;
	        next();
	        node.right = parseMaybeAssign(noIn);
	        checkLVal(left);
	        return finishNode(node, "B");
	    }
	    return left;
	}
	
	// Parse a ternary conditional (`?:`) operator.
	function parseMaybeConditional(noIn) {
	    var expr = parseExprOps(noIn);
	    if (eat(_question)) {
	        var node = startNodeFrom(expr);
	        node.test = expr;
	        node.consequent = parseExpression(true);
	        expect(_colon);
	        node.alternate = parseExpression(true, noIn);
	        return finishNode(node, "H");
	    }
	    return expr;
	}
	
	// Start the precedence parser.
	function parseExprOps(noIn) {
	    return parseExprOp(parseMaybeUnary(noIn), -1, noIn);
	}
	
	// Parse binary operators with the operator precedence parsing
	// algorithm. `left` is the left-hand side of the operator.
	// `minPrec` provides context that allows the function to stop and
	// defer further parser to one of its callers when it encounters an
	// operator that has a lower precedence than the set it is parsing.
	function parseExprOp(left, minPrec, noIn) {
	    var prec = tokType.binop;
	    if (prec != null && (!noIn || tokType !== _in)) {
	        if (prec > minPrec) {
	            var node = startNodeFrom(left);
	            node.left = left;
	            node.operator = tokVal;
	            next();
	            node.right = parseExprOp(parseMaybeUnary(noIn), prec, noIn);
	            node = finishNode(node, /&&|\|\|/.test(node.operator) ? "V" : "C");
	            return parseExprOp(node, minPrec, noIn);
	        }
	    }
	    return left;
	}
	
	// Parse unary operators, both prefix and postfix.
	function parseMaybeUnary(noIn) {
	    if (tokType.prefix) {
	        var node = startNode(),
	            update = tokType.isUpdate;
	        node.operator = tokVal;
	        node.prefix = true;
	        next();
	        node.argument = parseMaybeUnary(noIn);
	        if (update) checkLVal(node.argument);
	        else if (strict && node.operator === "delete" && node.argument.type === "R") raise(node.start, "Deleting local variable in strict mode");
	        return finishNode(node, update ? "i" : "h");
	    }
	    var expr = parseExprSubscripts();
	    while (tokType.postfix && !canInsertSemicolon()) {
	        var node = startNodeFrom(expr);
	        node.operator = tokVal;
	        node.prefix = false;
	        node.argument = expr;
	        checkLVal(expr);
	        next();
	        expr = finishNode(node, "i");
	    }
	    return expr;
	}
	
	// Parse call, dot, and `[]`-subscript expressions.
	function parseExprSubscripts() {
	    return parseSubscripts(parseExprAtom());
	}
	
	function parseSubscripts(base, noCalls) {
	    if (eat(_dot)) {
	        var node = startNodeFrom(base);
	        node.object = base;
	        node.property = parseIdent(true);
	        node.computed = false;
	        return parseSubscripts(finishNode(node, "W"), noCalls);
	    } else if (eat(_bracketL)) {
	        var node = startNodeFrom(base);
	        node.object = base;
	        node.property = parseExpression();
	        node.computed = true;
	        expect(_bracketR);
	        return parseSubscripts(finishNode(node, "W"), noCalls);
	    } else if (!noCalls && eat(_parenL)) {
	        var node = startNodeFrom(base);
	        node.callee = base;
	        node.arguments = parseExprList(_parenR, false);
	        return parseSubscripts(finishNode(node, "F"), noCalls);
	    } else return base;
	}
	
	// Parse an atomic expression — either a single token that is an
	// expression, an expression started by a keyword like `function` or
	// `new`, or an expression wrapped in punctuation like `()`, `[]`,
	// or `{}`.
	function parseExprAtom() {
	    switch (tokType) {
	        case _this:
	            var node = startNode();
	            next();
	            return finishNode(node, "e");
	        case _name:
	            return parseIdent();
	        case _num:
	        case _string:
	        case _regexp:
	            var node = startNode();
	            node.value = tokVal;
	            next();
	            return finishNode(node, "U");
	
	        case _null:
	        case _true:
	        case _false:
	            var node = startNode();
	            node.value = tokType.atomValue;
	            next();
	            return finishNode(node, "U");
	
	        case _parenL:
	            next();
	            var val = parseExpression();
	            expect(_parenR);
	            return val;
	
	        case _bracketL:
	            var node = startNode();
	            next();
	            node.elements = parseExprList(_bracketR, true, true);
	            return finishNode(node, "A");
	
	        case _braceL:
	            return parseObj();
	
	        case _function:
	            var node = startNode();
	            next();
	            return parseFunction(node, false);
	
	        case _new:
	            return parseNew();
	
	        default:
	            unexpected();
	    }
	}
	
	// New's precedence is slightly tricky. It must allow its argument
	// to be a `[]` or dot subscript expression, but not a call — at
	// least, not without wrapping it in parentheses. Thus, it uses the 
	function parseNew() {
	    var node = startNode();
	    next();
	    node.callee = parseSubscripts(parseExprAtom(false), true);
	    if (eat(_parenL)) node.arguments = parseExprList(_parenR, false);
	    else node.arguments = [];
	    return finishNode(node, "X");
	}
	
	// Parse an object literal.
	function parseObj() {
	    var node = startNode(),
	        first = true,
	        sawGetSet = false;
	    node.properties = [];
	    next();
	    while (!eat(_braceR)) {
	        if (!first) {
	            expect(_comma);
	            if (eat(_braceR)) break;
	        } else first = false;
	
	        var prop = {
	            key: parsePropertyName()
	        }, isGetSet = false,
	            kind = null;
	        if (eat(_colon)) {
	            prop.value = parseExpression(true);
	            kind = prop.kind = "init";
	        } else if (prop.key.type === "R" && (prop.key.name === "get" || prop.key.name === "set")) {
	            isGetSet = sawGetSet = true;
	            kind = prop.kind = prop.key.name;
	            prop.key = parsePropertyName();
	            if (!tokType === _parenL) unexpected();
	            prop.value = parseFunction(startNode(), false);
	        } else unexpected();
	
	        // getters and setters are not allowed to clash — either with
	        // each other or with an init property — and in strict mode,
	        // init properties are also not allowed to be repeated.
	        if (prop.key.type === "R" && (strict || sawGetSet)) {
	            for (var i = 0; i < node.properties.length; ++i) {
	                var other = node.properties[i];
	                if (other.key.name === prop.key.name) {
	                    var conflict = kind == other.kind || isGetSet && other.kind === "init" || kind === "init" && (other.kind === "get" || other.kind === "set");
	                    if (conflict && !strict && kind === "init" && other.kind === "init") conflict = false;
	                    if (conflict) raise(prop.key.start, "Redefinition of property");
	                }
	            }
	        }
	        node.properties.push(prop);
	    }
	    return finishNode(node, "Y");
	}
	
	function parsePropertyName() {
	    if (tokType === _num || tokType === _string) return parseExprAtom();
	    return parseIdent(true);
	}
	
	// Parse a function declaration or literal (depending on the
	// `isStatement` parameter).
	function parseFunction(node, isStatement) {
	    if (tokType === _name) node.id = parseIdent();
	    else if (isStatement) unexpected();
	    else node.id = null;
	    node.params = [];
	    var first = true;
	    expect(_parenL);
	    while (!eat(_parenR)) {
	        if (!first) expect(_comma);
	        else first = false;
	        node.params.push(parseIdent());
	    }
	
	    // Start a new scope with regard to labels and the `inFunction`
	    // flag (restore them to their old value afterwards).
	    var oldInFunc = inFunction,
	        oldLabels = labels;
	    inFunction = true;
	    labels = [];
	    node.body = parseBlock(true);
	    inFunction = oldInFunc;
	    labels = oldLabels;
	
	    // If this is a strict mode function, verify that argument names
	    // are not repeated, and it does not try to bind the words `eval`
	    // or `arguments`.
	    if (strict || node.body.body.length && isUseStrict(node.body.body[0])) {
	        for (var i = node.id ? -1 : 0; i < node.params.length; ++i) {
	            var id = i < 0 ? node.id : node.params[i];
	            if (isStrictReservedWord(id.name) || isStrictBadIdWord(id.name)) raise(id.start, "Defining '" + id.name + "' in strict mode");
	            if (i >= 0) for (var j = 0; j < i; ++j) if (id.name === node.params[j].name) raise(id.start, "Argument name clash in strict mode");
	        }
	    }
	
	    return finishNode(node, isStatement ? "P" : "Q");
	}
	
	// Parses a comma-separated list of expressions, and returns them as
	// an array. `close` is the token type that ends the list, and
	// `allowEmpty` can be turned on to allow subsequent commas with
	// nothing in between them to be parsed as `null` (which is needed
	// for array literals).
	function parseExprList(close, allowTrailingComma, allowEmpty) {
	    var elts = [],
	        first = true;
	    while (!eat(close)) {
	        if (!first) {
	            expect(_comma);
	            if (allowTrailingComma && eat(close)) break;
	        } else first = false;
	
	        if (allowEmpty && tokType === _comma) elts.push(null);
	        else elts.push(parseExpression(true));
	    }
	    return elts;
	}
	
	// Parse the next token as an identifier. If `liberal` is true (used
	// when parsing properties), it will also convert keywords into
	// identifiers.
	function parseIdent(liberal) {
	    var node = startNode();
	    node.name = tokType === _name ? tokVal : (liberal && tokType.keyword) || unexpected();
	    next();
	    return finishNode(node, "R");
	}
	
	//XXX------------------------------------------------------[acorn-end]-------------------------------------------------------
	
	var analyzed = []; // list of already analyzed scripts
		
	/*
	 * true if the script has already been analyzed
	 */
/***	function analyzedBefore(string){
		var found = false;
		var hash = hex_md5(string);
		
		for(var i=0; i<analyzed.length; i++){
			if(hash == analyzed[i]){
				found = true;
				break;
			}
		}
		if(!found){
			analyzed.push(hash);
		}
		
		return found;
	}
	
	
	/*
	 * returns the innerHTML of the script that called
	 * the overriden function, but only if it's inline (remote
	 * scripts are analyzed in another section of the
	 * extension).
	 */
/***	function getScript(){
		var scripts = document.getElementsByTagName('script');
		var current = scripts[scripts.length-1];
		var ret = {analyzed:true};
		var code = current.innerHTML;
		if((code!='') && !(current.hasAttribute('analyzed'))){
			ret = {analyzed:false, code:code};
		}
		return ret;
	}
	
	// analyzes scripts that hasn't been analyzed yet
	function checkForNewScripts(){
		for(var i=0; i<document.scripts.length; i++){
			if(!(document.scripts[i].hasAttribute('analyzed')) && ((document.scripts[i].type==="")||(document.scripts[i].type==="text/javascript"))){
				if(document.scripts[i].hasAttribute("src")){
					var xmlhttp = new XMLHttpRequest();
					xmlhttp.open("GET",document.scripts[i].src,true);
					xmlhttp.onreadystatechange = function(){
						if(xmlhttp.readyState == 4){
							if(isMalicious(xmlhttp.responseText)){
								console.log('malicious');
								revolver_malicious = true;
								alert("This page contains malicious code!!");
								location.href = "about:blank";
							}
						}
					};
					xmlhttp.send();
					document.scripts[i].setAttribute('analyzed',true);
				}
				else{
					if(isMalicious(document.scripts[i].innerHTML)){
						console.log('malicious');
						revolver_malicious = true;
						alert("This page contains malicious code!!");
						location.href = "about:blank";
					}
					document.scripts[i].setAttribute('analyzed',true);
				}
			}
		}
	}
***/	
	//XXX------------------------------------------------------[DOMSnitch modules (function overrides)]-------------------------------------------------------

	var traces_type = new Array();
	var traces_code = new Array();
	var traces_href = new Array();

	//add the trace to the vector
	function makeMessage(type, code, href) {
		type = type.toString();
		traces_type.push(type);

		if((type != "escape") && (type != "unescape"));
			code = code.toString();
		traces_code.push(code);

		console.log("Type: " + traces_type[traces_type.length - 1] + " Code: " + traces_code[traces_code.length - 1].toString());
		href = href.toString();
		traces_href.push(href);
	};

	/*
	 * Module from "DOMSnitch" project overriding "dangerous" functions
	 * of the "Element" object
	 */
	/*DOMSnitch.Modules.array = function(parent) {
	  	this._parent = parent;
	  	this._targets = {
	    		"array.push": {
	      			capture: true,
	      			funcName: "push", 
	      			obj: array, 
			      	origPtr: array.push
	    		},
	    		"document.writeln": {
	      			obj: document, 
	      			funcName: "writeln", 
	      			origPtr: document.writeln,
	      			capture: true
	    		},
			"document.createElement": {
				obj: document,
				funcName: "createElement",
				origPtr: document.createElement,
				capture: true
			}
	  	};
	  	this._loaded = false;
	};
	
	DOMSnitch.Modules.array.prototype = new DOMSnitch.Modules.Base;
	
	DOMSnitch.Modules.array.prototype._generalElHandle = function(targetName, mex) {
	  	var target = this._targets[targetName];
	  	return function() {
			makeMessage(mex, arguments[0], window.location.href);

			console.log("arraypush" + " " + arguments.length + " " + arguments[0]);
	    		if(isMalicious(arguments[0])){ //FIXME: problems with mixed HTML and JS
				console.log('malicious argument');
				throw 'malicious!'; // don't execute the malicious code
				return null;
			}
			else{
				console.log('benign argument');
			}
			//checkForNewScripts();
	    	
			//return null;
			return target.origPtr.apply(this, arguments); // everything fine, calling the actual write or writeln
	  	};
	};

	DOMSnitch.Modules.Document.prototype._createElement = function(targetName) {
		var target = this._targets[targetName];
		return function(data){
			console.log("Create Element: " + arguments.length + arguments[0]);
			return target.origPtr.apply(this, arguments);
		};
	};
	
	DOMSnitch.Modules.array.prototype.load = function() {
	  	this.config = this._parent.config;
	  
	  	if(this._loaded) {
	    		return;
	  	}
	  
	  	this._overloadMethod("array.push", "array.push", this._generalElHandle("array.push", "push"));
	  	//this._overloadMethod("document.writeln", "doc.write", this._documentWrite("document.writeln"));
		//this._overloadMethod("document.createElement", "doc.write", this._createElement("document.createElement"));
	  	//this._overloadProperty("document.createElement", "doc.write");
		this._loaded = true;
	};
*/	
	
	/*
	/*
	 * Module from "DOMSnitch" project overriding "dangerous" functions
	 * of the "document" object (write and writeln)
	 */
	DOMSnitch.Modules.Document = function(parent) {
	  	this._parent = parent;
	  	this._targets = {
	    		"document.write": {
	      			capture: true,
	      			funcName: "write", 
	      			obj: document, 
			      	origPtr: document.write
	    		},
	    		"document.writeln": {
	      			obj: document, 
	      			funcName: "writeln", 
	      			origPtr: document.writeln,
	      			capture: true
	    		},
			"document.createElement": {
				obj: document,
				funcName: "createElement",
				origPtr: document.createElement,
				capture: true
			}
	  	};
	  	this._loaded = false;
	};
	
	DOMSnitch.Modules.Document.prototype = new DOMSnitch.Modules.Base;
	
	DOMSnitch.Modules.Document.prototype._documentWrite = function(targetName) {
	  	var target = this._targets[targetName];
	  	return function(data) {
			makeMessage("docwrite", arguments[0], window.location.href);

			//console.log("check DocumentWrite" + " " + arguments.length + " " + arguments[0]);
	    		/*if(isMalicious(arguments[0])){ //FIXME: problems with mixed HTML and JS
				console.log('malicious argument');
				throw 'malicious!'; // don't execute the malicious code
				return null;
			}
			else{
				console.log('benign argument');
			}*/
			//checkForNewScripts();
	    	
			//return null;
			return target.origPtr.apply(this, arguments); // everything fine, calling the actual write or writeln
	  	};
	};

	DOMSnitch.Modules.Document.prototype._createElement = function(targetName) {
		var target = this._targets[targetName];
		return function(data){
			console.log("Create Element: " + arguments.length + arguments[0]);
			return target.origPtr.apply(this, arguments);
		};
	};
	
	DOMSnitch.Modules.Document.prototype.load = function() {
	  	this.config = this._parent.config;
	  
	  	if(this._loaded) {
	    		return;
	  	}
	  
	  	this._overloadMethod("document.write", "doc.write", this._documentWrite("document.write"));
	  	this._overloadMethod("document.writeln", "doc.write", this._documentWrite("document.writeln"));
		this._overloadMethod("document.createElement", "doc.write", this._createElement("document.createElement"));
	  	//this._overloadProperty("document.createElement", "doc.write");
		this._loaded = true;
	};
	
	
	/*
	 * Module from "DOMSnitch" project overriding "dangerous" functions
	 * of the "window" object (eval, setInterval, setTimeout)
	 */
	DOMSnitch.Modules.Window = function(parent) {
	 	this._parent = parent;
	  	this._targets = {
	    		"window.eval": {
	      			capture: true,
		      		funcName: "eval", 
				obj: window, 
				origPtr: window.eval
	    		},
	    		"window.setTimeout": {
	      			capture: true,
	      			funcName: "setTimeout", 
	      			obj: window, 
	      			origPtr: window.setTimeout
	    		},
	    		"window.escape": {
	      			capture: true,
	      			funcName: "escape", 
	      			obj: window, 
	      			origPtr: window.escape
	    		},
	    		"window.unescape": {
	      			capture: true,
	      			funcName: "unescape", 
	      			obj: window, 
	      			origPtr: window.unescape
	    		},
	    		"window.decodeURI": {
	      			capture: true,
	      			funcName: "decodeURI", 
	      			obj: window, 
	      			origPtr: window.decodeURI
	    		},
	    		"window.decodeURIComponent": {
	      			capture: true,
	      			funcName: "decodeURIComponent", 
	      			obj: window, 
	      			origPtr: window.decodeURIComponent
	    		},
	    		"window.encodeURI": {
	      			capture: true,
	      			funcName: "encodeURI", 
	      			obj: window, 
	      			origPtr: window.encodeURI
	    		},
	    		"window.encodeURIComponent": {
	      			capture: true,
	      			funcName: "encodeURIComponent", 
	      			obj: window, 
	      			origPtr: window.encodeURIComponent
	    		},
	    		"window.atob": {
	      			capture: true,
	      			funcName: "atob", 
	      			obj: window, 
	      			origPtr: window.atob
	    		},
	    		"window.btoa": {
	      			capture: true,
	      			funcName: "btoa", 
	      			obj: window, 
	      			origPtr: window.btoa
	    		},
	    		"window.string": {
	      			capture: true,
	      			funcName: "string", 
	      			obj: window, 
	      			origPtr: window.string
	    		},
			"window.setInterval": {
		  		capture: true,
		  		funcName: "setInterval", 
		  		obj: window, 
		  		origPtr: window.setInterval
			}
	  	};
	  	this._loaded = false;
	};
	
	DOMSnitch.Modules.Window.prototype = new DOMSnitch.Modules.Base;
	
	DOMSnitch.Modules.Window.prototype._generalHandle = function(targ, mex) {
	  	var target = this._targets[targ];
	  	return function() {
			makeMessage(mex, arguments[0], window.location.href);
			
			return target.origPtr.apply(this, arguments); 
	  	};
	};
	
	
	DOMSnitch.Modules.Window.prototype.load = function() {
	  	this.config = this._parent.config;
	  	if(this._loaded) {
	    		return;
	  	}
	  	/* FIXME: there are scope problems when overriding eval.
	   	* The problem is reproducible uncommenting the next line of code and visiting
	   	* Google Maps (the map is stuck. Console reports "s is undefined")
		* [look at the documentation of DOMSnitch]
	   	*/
	  	this._overloadMethod("window.eval", "win.eval", this._generalHandle("window.eval", "eval"));//this._eval());
	  	this._overloadMethod("window.setTimeout", "win.setTimeout", this._generalHandle("window.setTimeout", "setTimeout"));
	  	this._overloadMethod("window.setInterval", "win.setInterval", this._generalHandle("window.setInterval", "setInterval"));
	  	this._overloadMethod("window.escape", "win.escape", this._generalHandle("window.escape", "escape"));
	  	this._overloadMethod("window.unescape", "win.unescape", this._generalHandle("window.unescape", "unescape"));
	  	this._overloadMethod("window.decodeURI", "win.decodeURI", this._generalHandle("window.decodeURI", "decodeURI"));
	  	this._overloadMethod("window.decodeURIComponent", "win.decodeURIComponent", this._generalHandle("window.decodeURIComponent", "decodeURIComponent"));
	  	this._overloadMethod("window.encodeURI", "win.encodeURI", this._generalHandle("window.encodeURI", "encodeURI"));
	  	this._overloadMethod("window.encodeURIComponent", "win.encodeURIComponent", this._generalHandle("window.encodeURIComponent", "encodeURIComponent"));
	  	this._overloadMethod("window.atob", "win.atob", this._generalHandle("window.atob", "atob"));
	  	this._overloadMethod("window.btoa", "win.btoa", this._generalHandle("window.btoa", "btoa"));
	  	this._overloadMethod("window.string", "win.string", this._generalHandle("window.string", "string"));
		this._loaded = true;
	};
//})();
	
	//when the page is completely loaded send the data collected to the content script
	window.addEventListener('load', function() {
		console.log("Page Completely Loaded");
		
		if(traces_type.length != 0){
			window.postMessage({type: "OVERRIDES", t_type: traces_type, t_code: traces_code, t_href: traces_href}, "*");
			//window.postMessage({type:"OVERRIDES", text:"Hello"}, "*");
			console.log("Data sent to the content script");
		}
		else
			console.log("Trace empty");
	});
	
	//if(window.addEventListener){
	//}
	/*else if(window.attachEvent){
		window.attachEvent('onload', function() {
			console.log("LOAD");
		});
	}*/

console.log("overrider.js")

