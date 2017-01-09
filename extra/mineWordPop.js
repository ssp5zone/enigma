/** 
* The follwoing program will extract popular words from: http://www.wordcount.org/main.php
* Usage - run the start function in console: start([numberOfWords]);
* The result is in popularity order.
*/

String.prototype.matchAll2 = function(regexp) {
  var matches = [];
  this.replace(regexp, function() {
    var arr = ([]).slice.call(arguments, 0);
    matches.push(arr[1]);
  });
  return matches.length ? matches : null;
};

var regex = /&word[0-9]+=([^&]*)/g;
var wordPop = new Array();

// version 2.1
function extract(lastCall, str) {
	var list = str.matchAll2(regex), index=this;
	wordPop.splice(index, list.length, ...list);
	if(lastCall) {
		console.info('Got all responses!!!');
		console.info('Rendering results...');
		renderResult();
	}
}

function start(count) {
	count = count || 50000; // default 1st 50,000 words
	wordPop = new Array(count);	
	for(var i = 1; i<=count; i+=300) {
		$.get('/dbquery.php?toFind=' + i + '&method=SEARCH_BY_INDEX', extract.bind(i, (i+300>=count)));
	}
	console.info('Finised sending requests. Waiting for all responses.');
}

function renderResult() {
	$('body').html('');
	wordPop.forEach(function(val, index) {
		$('body').append('<p>'+val+'</p>');
	});
	console.info("Rendering Completed.");
}

// version 2.0
// function extract(str) {
// 	var list = str.matchAll2(regex), index=this;
// 	wordPop.splice(index, list.length, ...list);
// }

// function start(count) {
// 	wordPop = new Array(count);
// 	count = count || 50000; // default 1st 50,000 words
// 	for(var i = 1; i<=count; i+=300) {
// 		$.get('/dbquery.php?toFind=' + i + '&method=SEARCH_BY_INDEX', extract.bind(i));
// 	}
// 	console.info('Completed loop');
// }

// version 1.0
// function extract(str) {
// 	var list = str.matchAll2(regex);
// 	wordPop.push(...list);
// }
// function start(count) {
// 	count = count || 50000; // default 1st 50,000 words
// 	for(var i = 1; i<=count; i+=300) {
// 		$.get('/dbquery.php?toFind=' + i + '&method=SEARCH_BY_INDEX', extract);
// 	}
// 	console.info('Completed loop');
// }