var app = {
				imageBlob: undefined,
				squares: undefined,
				grid: undefined,
				editBrick: undefined,
				wordBucket: new Array(),
				wordBucketBackup: undefined,
				minWordLength: 3,
				gridlyConfig: {
					base: 42,
					gutter: 2,
					columns: undefined,					
				},
				checkWord: undefined,
				filterRange: undefined,
				tesseractOffline: false,
				isTesseractUsed: undefined,
				tesseractConfig: undefined,
				tesseractResult: undefined,

				init: function() {
					this.bindEvents();
					this.initSquares();
					this.initGrid();
					this.progressCircle.init();
					this.initSlider();
					this.initDropZone();	
					this.initTesseract();				
				},

		 		bindEvents: function() {
		 			$('#skip-1').click($.proxy(this.goToStep2, this));
		 			$('#recognize').click($.proxy(this.recognize, this));
		 			$('#back-1').click($.proxy(this.backToStep1, this));
	     			$('#gridify').click($.proxy(this.processOcr, this));
	     			$('#test').click($.proxy(this.fillSampleText, this));
	     			$('.new').click($.proxy(this.refresh, this));
	     			$('.theme-button').click(this.switchTheme);
	     			$('.sort-popularity').click($.proxy(this.sortByPopularity, this));
	     			$('.sort-length').click($.proxy(this.sortByLength, this));
	     			$('.sort-alphabet').click($.proxy(this.sortAlphabetically, this));
	     			$('.filter-redundant').click($.proxy(this.filterRedundant, this));
	     			$('.filter-length').click($.proxy(this.filterByLength, this));	     			
				},

				initTesseract: function() {
					this.tesseractConfig = {
						lang: "eng",
					 	tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"	// (TO DO) change to support lower case as well.
					};
					if (this.tesseractOffline) {
						window.URL = undefined; // very dirty fix...
						window.Tesseract = Tesseract.create({
						    workerPath: './assets/bower_components/tesseract.js/dist/worker.js',
						    langPath: '/assets/tesseract-data/',
						    corePath: '/assets/bower_components/tesseract-core/index.js',
						});
					}
					this.bindOfflineToggle();				
				},

				initSquares: function() {
					// max 30x30 supported
					this.squares = Array.apply(null, {length: 31}).map(Function.call, function(a){return a*a;})
				},

				initGrid: function() {
					this.eventGridEdit();
					this.eventGridDelete();
					this.eventGridAdd();
					this.eventGridReset();
					this.eventGridProcess();
					this.bindGlobalKeyPress();
				},

				initSlider: function() {
					this.filterRange = $('#filter-range').slider({}).data('slider');
					$("#hide-range").on("slide", this.hideRange);
				},

				initDropZone: function() {
					$("#dropped-image-container").hide();
					$("#dropped-image").hide();
					this.bindUploadEvents();
				},

				bindOfflineToggle: function() {
					var _this = this;
					$("#offline-toggle").change(function(){
						if ($(this).is(":checked")) {
							_this.tesseractOffline = true;
							_this.warningModal("Enabling this can make the whole app run offline without an internet connection.\n\n" +
								"However, this is an experimental feature and might not work properly.");
						} else {
							_this.tesseractOffline = false;
						}
					});
				},

				bindUploadEvents: function() {
					this.bindFileClickEvent();
					this.bindDropEvent();
					this.bindPasteEvent();
					this.bindImageClose();
				},

				bindFileClickEvent: function() {
					$('.drop-zone').on('click', function() {
						$("#file-input").click();
					});
					$("#file-input").on("change", (event) => {
						var files = event.target.files;
						// find image among all dropped files
				        for (var i=0, file; file=files[i]; i++) {
				            if (file.type.match(/image.*/)) {
				            	this.imageBlob = file;
				            }
				        }				    
				        // load image if there is a dropped image
						this.renderInputImage();
					});
				},

				bindDropEvent: function() {
					$('.drop-zone').on('dragover', (event) => {
						event.stopPropagation();
				        event.preventDefault();
				        event.originalEvent.dataTransfer.dropEffect = 'copy';
					});

					$('.drop-zone').on('drop', (event) => {
						event.stopPropagation();
				        event.preventDefault();
				        var files = event.originalEvent.dataTransfer.files; 
				        // find image among all dropped files
				        for (var i=0, file; file=files[i]; i++) {
				            if (file.type.match(/image.*/)) {
				            	this.imageBlob = file;
				            }
				        }				    
				        // load image if there is a dropped image
						this.renderInputImage();
					});

				},

				bindPasteEvent: function() {
					$(document).on('paste', (event) => {
						var items = (event.clipboardData  || event.originalEvent.clipboardData).items;
						// find pasted image among pasted items
						for (var i = 0; i < items.length; i++) {
							if (items[i].type.indexOf("image") === 0) {
							  this.imageBlob = items[i].getAsFile();
							}
						}
						// load image if there is a pasted image
						this.renderInputImage();
					});
				},

				unbindPasteEvent: function() {
					$(document).off('paste');		
				},

				bindImageClose: function() {
					$('#close-dropped-image').click(this.closeInputImage);
				},

				renderInputImage: function() {
					$(".drop-zone-container").slideUp();
					var reader = new FileReader();
					if (this.imageBlob !== null) {						
						reader.onload = function(event) {
						  $("#dropped-image").attr("src", event.target.result);
						  $("#dropped-image-container").slideDown();
						  $("#dropped-image").slideDown();
						  $(".input-image").removeClass("extra-padding");
						};
						reader.readAsDataURL(this.imageBlob);
					}
				},

				closeInputImage: function() {
					$("#dropped-image-container").slideUp();
					$("#dropped-image").slideUp();
					$(".input-image").addClass("extra-padding");
					this.imageBlob = undefined;
					$(".drop-zone-container").slideDown();
				},

				goToStep2: function(ocrResult) {
					$(".input-image").slideUp();
					$(".input").slideDown();
					if (ocrResult) {
						this.isTesseractUsed = true;
						this.tesseractResult = ocrResult;
						$('#ocr-text').val(ocrResult.text);
					} else {
						this.isTesseractUsed = false;
					}
				},

				backToStep1: function() {
					$(".input").slideUp();
					$(".input-image").slideDown();	
				},

				recognize: function() {
					var _this = this;
					if (this.imageBlob) {
						Tesseract.recognize(this.imageBlob, this.tesseractConfig)
						.progress(function(message){
		                    _this.progressCircle.update(message.progress, message.status);
		                })
		                .then(function(result){
		                	_this.progressCircle.completed(()=>{
		                		_this.goToStep2(result);
		                	});		                    
		                })
		                .catch(function(err){
		                    _this.warningModal("A random error has appeared:\n\n" + err);
		                    _this.progressCircle.hide();
		                });
		                this.progressCircle.show();
					} else {
						this.warningModal("Invalid or no image detected.");
					}
				},

				processOcr: function() {
					var data, M, N;
					if (this.isTesseractUsed) {
						if (this.tesseractResult.text.length>8) {
							M = this.tesseractResult.lines.length;
							N = (this.tesseractResult.symbols.length)/M;
							this.text2Grid_Advanced(M, N);
							this.promptModal("This looks like a " + M + "x" + N + " grid.", () => {
								keyhole.init(".gridly", this.imageBlob || "capture.png");
								$('.input').slideUp();
								$('.output').slideDown();
							});
						} else {
							this.warningModal("Too little or invalid data.");
						}
					} else {
						data = $('#ocr-text').val().trim();
						if (data && data.length>3) {
							data = data.split('\n').join('');
							data = data.split(' ').join('');
							N = this.squares.findIndex(function(val) {
								return Math.abs(data.length-val)<5;
							});
							if (N !== -1) {
								this.text2Grid_Manual(data, N);
								this.promptModal("This looks like a " + N + "x" + N + " grid.", () => {
									keyhole.init(".gridly", this.imageBlob || "capture.png");
									$('.input').slideUp();
									$('.output').slideDown();
								});
							} else {
								this.warningModal("Unable to deduce any matrix. Re-OCR.");
							}
						} else {
							this.warningModal("Invalid data.");
						}
					}																				
				},

				text2Grid_Manual: function(data, N) {
					data = data.split('');	
					data.forEach((element, index) => {
						if (element.match(/([^a-zA-Z])/)) {
							if (element==="8") {
								this.addBrick("B", "warn");
							} else if (element==="0") {
								this.addBrick("O", "warn");
							} else if (element==="5") {
								this.addBrick("S", "warn");
							} else if (element==="6") {
								this.addBrick("b", "warn");
							} else if (element.match(/(!|1|\|)/)) {
								this.addBrick("I", "warn");
							} else {
								this.addBrick(element, "danger");
							}
						} else {
							if (element==="O") {
								this.addBrick(element, "warn");
							} else {
								this.addBrick(element);
							}							
						}
					});	

					this.gridlyConfig.columns = N;
					// if (N < 10) {
					// 	this.gridlyConfig.gutter = N;
					// } else {
					// 	this.gridlyConfig.gutter = N/10;
					// }
					$('.gridly').gridly(this.gridlyConfig);
					var width = (this.gridlyConfig.base * N) + (this.gridlyConfig.gutter * N);
					return $('.gridly').width(width).gridly('layout');
				},

				text2Grid_Advanced: function(M, N) {
					var label;
					this.tesseractResult.symbols.forEach((element, index)=>{
						label  = "";
						if (element.text.match(/([^a-zA-Z])/) || element.confidence<=50) {
							label = "danger";
						} else if (element.confidence<=70) {
							label = "warn"
						} else if (element.confidence<=80 && element.text.match("Y|T|X|O|Q|I|B|E")) {
							label = "warn";
						}
						this.addBrick(element.text, label);
					});
					this.gridlyConfig.columns = N;
					$('.gridly').gridly(this.gridlyConfig);
					var width = (this.gridlyConfig.base * N) + (this.gridlyConfig.gutter * N);
					return $('.gridly').width(width).gridly('layout');		
				},

				process: function() {
					var matrix = this.gatherData();
					if (matrix) {
						console.info("Data gathered");
						this.progressCircle.show();
						setTimeout(() => {this.enigma(matrix)}, 2000);
						//this.progressCircle.hide();
					} else {
						return;
					}					
				},

				gatherData: function() {
					var data = $('.gridly .brick .text').text().split('');
					if (this.isTesseractUsed) {
						var M, N;
						M = this.tesseractResult.lines.length;
						N = (this.tesseractResult.symbols.length)/M;
						if (data.length === M*N) {
							var newArr = [];
							while(data.length) newArr.push(data.splice(0,N));
							return this.padMatrix(newArr, M, N);		
						} else {
							this.warningModal("Total letters ≠ " + M + "x" + N);
							return undefined;
						}
					}
					else {						
						var N = Math.sqrt(data.length);
						if(N !== Math.ceil(N)) {
							this.warningModal("Not a square matrix.");
							return undefined;
						} else {
							var newArr = [];
							while(data.length) newArr.push(data.splice(0,N));
							return newArr;
						}
					}					
				},

				padMatrix: function(matrix, M, N) {
					var diff = M - N;
					if (diff !== 0) {		
						console.info("Padding to make a square matrix.");
						var arr;
						  if (diff > 0) { 	// more rows than columns
							arr = Array.apply(null, Array(diff)).map(String.prototype.valueOf,"");
							matrix.forEach(function(element) {
								element.concat(arr);
							});
						} else {		    	// more columns than rows
							diff = -diff;
							arr = Array.apply(null, Array(N)).map(String.prototype.valueOf,"");
							while(diff--) {
								matrix.push(arr);
							}
						}
					}
					return matrix;
				},

				renderResult: function() {
					$('.output').slideUp();
					$('.result').slideDown();
					$('.words>li').remove();
					$('.word-count span').text(this.wordBucket.length);
					$("#hide-range").slider({ id: "hide-range-slide", min: 1, max: this.wordBucket.length, range: true, value: [1, this.wordBucket.length] });
					$(".hide-min").text(1);
					$(".hide-max").text(this.wordBucket.length);
					$('#hide-range').slider('refresh')
					this.wordBucket.forEach(function(word, index) {
						$('.words').append('<li data-length="' + word.length + '" data-rank="' + (index+1) + '">'+String(word)+'</li>');
					});
				},

				enigma: function(matrix) {
					var N,temp,mat=matrix;
					N=mat.length;

					// cloning not required for older(sync) chopper function
					var clone1 = $.extend(true, [], matrix);
					var clone2 = $.extend(true, [], matrix);

					var diagonallify = function(matrix, limiter=1) {
						var diamondMatrix = new Array(), tempArr;
						var N = matrix.length;
						for (var i = limiter-1; i < N; i++) {
							tempArr = new Array();
							for (var j = 0; j <= i; j++) {
								tempArr.push(matrix[i-j][j]);
							}
							diamondMatrix.push(tempArr);
						}
						for (var i = 1; i <= N-limiter; i++) {
							tempArr = new Array();
							for (var j = N-1; j >= i; j--) {
								tempArr.push(matrix[j][i+(N-j-1)]);
							}
							diamondMatrix.push(tempArr);
						}
						return diamondMatrix;
					};
					
					// direct
					this.chopper(matrix);
					

					// diagonal
					var diamondMatrix = diagonallify(matrix, this.minWordLength);
					this.chopper(diamondMatrix);

					// transpose
					for(var i = 0; i < N; i++) {
						for (var j = i+1; j < N; j++) {
							temp = clone1[i][j];
							clone1[i][j] = clone1[j][i];
							clone1[j][i] = temp;
						}
					}
					this.chopper(clone1);

					// reverse diagonal
					clone2.forEach(function(value){return value.reverse();});
					diamondMatrix = diagonallify(clone2, this.minWordLength);
					this.chopper(diamondMatrix).then(() => {
						this.wordBucketBackup = this.wordBucket.slice(0);
						this.progressCircle.completed(()=>{
							this.renderResult();
						});
					});			
				},

				// version 2.1 - Updated for defer
				chopper: function(matrix) {
					var line, N=matrix.length, step=1/(N*4);
					var deferred = $.Deferred();					
					recurseChop = (matrix, i, self) => {
						if (i===N) { 
							console.log("landed");
							deferred.resolve(i);						
						}
						else {
							line = matrix[i].join('').toLowerCase();
							this.sweepLine(line);
							this.progressCircle.increment(step);

							// request next frame
							var next = self.bind(this, matrix, i + 1, self);
						    window.requestAnimationFrame(next);
						}
					};
					recurseChop(matrix, 0, recurseChop);
					return deferred.promise(); 
				},

				// version 2.0 - Recursive for request animation frame
				// chopper: function(matrix, i=0) {
				// 	var line, N=matrix.length, step=1/(N*4);
				// 	if (i===N) { 
				// 		console.log("landed");
				// 	}
				// 	else {
				// 		line = matrix[i].join('').toLowerCase();
				// 		this.sweepLine(line);
				// 		this.progressCircle.increment(step);

				// 		// request next frame
				// 		var next = this.chopper.bind(this, matrix, i + 1);
				// 	    window.requestAnimationFrame(next);
				// 	}					
				// },

				// version 1.0
				// chopper: function(matrix) {
				// 	var line, N=matrix.length, step=1/(N*4);
				// 	for (var i = 0; i < matrix.length; i++) {
				// 		line = matrix[i].join('').toLowerCase();
				// 		this.sweepLine(line);
				// 		this.progressCircle.increment(step);
				// 	}
				// },

				sweepLine: function(line, _reverse) {
					var word;
					for(var i=this.minWordLength; i<=line.length; i++)
					{
						for (var j = 0; j <= line.length-i; j++) {
							word = line.substr(j,i);
							word = this.checkWord(word);
							if(word)
								this.wordBucket.push(word);
						}
					}
					if(!_reverse) 
						this.sweepLine(line.split('').reverse().join(''), true);
				},

				checkPopular: function(word) {
					var popularity = popularWord.indexOf(word);
					return (popularity!==-1) ? (new Word(word, popularity)) : undefined;
				},

				checkDictionary: function(word) {
					return (dictionary.indexOf(word)!==-1) ? (new Word(word)) : undefined;
				},

				sortByPopularity: function() {
					if (!this.wordBucket[0].popularity) {
						$.modal.close();
						this.warningModal("Unknown popularity of words. Can't sort.");
					} else {
						this.wordBucket.sort(Word.comparePopularity);
						$.modal.close();
						this.renderResult();
					}					
				},

				sortByLength: function() {
					this.wordBucket.sort(Word.compareLength);
					$.modal.close();
					this.renderResult();
				},

				sortAlphabetically: function() {
					this.wordBucket.sort();
					$.modal.close();
					this.renderResult();
				},

				filterRedundant: function() {
					this.wordBucket.sort();
					this.wordBucket =  this.wordBucket.filter(function(word, index, arr) { return (arr[index+1]) ? (word.value != arr[index+1].value) : true});
					$.modal.close();
					this.renderResult();
				},

				filterByLength: function() {
					var min = this.filterRange.getValue()[0];
					var max = this.filterRange.getValue()[1];
					this.wordBucket =  this.wordBucketBackup.filter(function(word) { return (word.length>=min && word.length<=max)});
					$.modal.close();
					this.renderResult();
				},

				hideRange: function(event) {
					var min = event.value[0],
						max = event.value[1];
					$(".hide-min").text(min);
					$(".hide-max").text(max);
					list = $('.words>li').filter(function(){
						var rank = $(this).attr('data-rank');
						return (rank < min || rank > max);
					});
					$(".words>li").not(list).removeClass('conceal');
					$(list).addClass('conceal');
				},

				eventGridEdit: function() {
				    $(".output").on("click touchend", ".gridly .brick", function(event) {
				      var $this, size;
				      $this = $(this);
				      $this.toggleClass('small');
				      $this.toggleClass('large');
				      // if ($this.hasClass('small')) {
				      //   size = 42;
				      // }
				      // if ($this.hasClass('large')) {
				      //   size = 71;
				      // }
				      $this.data('width', size);
				      $this.data('height', size);
				      return $('.gridly').gridly('layout');
				    });
				},

				eventGridDelete: function() {
					$(".output").on("click", ".gridly .delete", function(event) {
				      var $this;
				      event.preventDefault();
				      event.stopPropagation();
				      $this = $(this);
				      $this.closest('.brick').remove();
				      return $('.gridly').gridly('layout');
				    });
				},

				eventGridAdd: function() {
					$(document).on("click", ".add", (event) => {
				      event.preventDefault();
				      event.stopPropagation();
				      this.addBrick('');
				      return $('.gridly').gridly();
				    });
				},

				eventGridReset: function() {
					$(document).on("click", ".reset", (event) => {
				      event.preventDefault();
				      event.stopPropagation();
				      this.recreateGrid();
				      $('.output').slideUp();
				      $('.input').slideDown();
				    });
				},

				eventGridProcess: function() {
					$(document).on("click", ".process-popular", (event) => {
				      event.preventDefault();
				      event.stopPropagation();
				      this.promptModal("This will be faster, but some uncommon words might miss.", () => {
				      			this.checkWord = this.checkPopular;
								this.process();
							}, () => {
								$('#modal-dict-type').modal();
							});
				    });
				    $(document).on("click", ".process-dictonary", (event) => {
				      event.preventDefault();
				      event.stopPropagation();
				      this.promptModal("This might take some time.", () => {
				      			this.checkWord = this.checkDictionary;
								this.process();
							}, () => {
								$('#modal-dict-type').modal();
							});				      
				    });
				},

				bindGlobalKeyPress: function() {
					$(document).keyup((event) => {
						if ($('.gridly .large').length!==0) {
							if (event.keyCode === 27) {
								$('.gridly .large').removeClass('large').addClass('small');
						    } else if (event.keyCode >= 65 && event.keyCode <= 122){
						    	$('.gridly .large .bubble').removeClass("warn warning danger info");
								$('.gridly .large .text').text(event.key);							
						    }							
						} else {
							return;
						}					  
					});
				},

				recreateGrid: function() {
					  this.wordBucket = new Array();
					  keyhole.reset();
				      $('.gridly').remove();
				      $('.output').prepend('<div class="gridly"></div>');
				},

				addBrick: function(element, status) {
					var brick = '<div class="brick small"><div class="bubble ' + status + '"><span class="text">' + element + '</span></div><div class="delete">&times;</div></div>';
					//var brick = '<div class="brick small"><div class="bubble ' + status + '"><input type="text" maxlength="1" style="background: transparent;border: none;width: 11px;font-weight:bold;" id="foo" value="' + element + '"></div><div class="delete">&times;</div></div>';
					$('.gridly').append(brick);
				},

				progressCircle: {
					progress: undefined,
					viewCallback: undefined,
					show: function() {
						$('body').addClass('hidescroll');
	     				$('.overlay').fadeIn();
					},
					hide: function() {						
						$('.overlay').fadeOut();
						$('body').removeClass('hidescroll');
						this.reset();					
					},
					update: function(value, message) {
						if (message) {
							$('.progress-status').text(message);
						}
						$('.progress').circleProgress('value', value);						
					},
					increment: function(value, message) {
						if (message) {
							$('.progress-status').text(message);
						}
						this.progress+=value;
						$('.progress').circleProgress('value', this.progress);
					},
					reset: function() {
						this.progress = 0;
						$('.progress-status').text('');
					},
					completed: function(callback) {
						$('.progress-status').text("completed");
						$('.progress strong').addClass('blink_me');
						$('.view-result').fadeIn();
						this.viewCallback = callback;
					},
					viewResult: function() {
						$('.progress strong').removeClass('blink_me');
						$('.view-result').hide();
						this.hide();
						this.viewCallback();
					},
					init: function() {
						this.progress = 0;
						$('.progress').circleProgress({
						  value: 0,
						  lineCap: 'round',
						}).on('circle-animation-progress', function(event, progress,step) {
						  $(this).find('strong').html(Math.round(100 * step) + '<i>%</i>');
						});
						$('.view-result').click($.proxy(this.viewResult, this));
					},
				},				

				getTestMatrix: function() {
					var mat = new Array();
					for (var i = 0; i < 10; i++) {
						mat.push(new Array(10))
						for (var j = 0; j < 10; j++) {
							mat[i][j] = ""+i+""+j;
						}
						console.log(mat[i].join(' '));	
					}
					return mat;
				},

				refresh: function() {
					$('.words').html('');
					$('#ocr-text').val('');
					$('.result').slideUp();
					this.progressCircle.reset();
					$('.input-image').slideDown();
					this.recreateGrid();
				},

				viewResult: function() {
					$('.progress strong').removeClass('blink_me');
					$('.view-result').hide();
					this.progressCircle.hide();
					this.renderResult();
				},

				triggerComplete: function() {
					$('.progress strong').addClass('blink_me');
					this.wordBucketBackup = this.wordBucket.slice(0);
					$('.view-result').fadeIn();					
				},

				fillSampleText: function() {
					this.isTesseractUsed = false;
					$('#ocr-text').val(this.getSampleText());
				},

				getSampleText: function() {
					return "WSENT IMENTANA LYS IS IC AHHHAXNCVDKDFNBAPGN I RBPKCFJOKOJCXSLDJR TY RUHVXNGDDNOYRNCALREN AO I NVESTORCONNECTYRH NYMS I OPDVOS I TKF A L PNX TUCGGKQSDNNWVUMIUZEG YJPOUJJOEONRHAOVRSTS OG I XNMUSMCHTOEDKJEOG NJCKRSNOWGGXWDUTRZF I DBMBIOUNTWIRTDMIRCTO EAZWI T IMMTC/DPNW I EYHS M H Z T K X U M E Z P A P C K 0 V Z I X AO0CVSGOTR I LSZZNFSNC N M D J 8 I A G J M O V A A P A W H G X DDGRLZUXVOA I STDADASL F I NCONNECTVPRJFSKAEO WKZ LZUUFECDPGEVOJRBP UHEFWROBOTLWCXCPRWRF TESTAUTOMAT I ONDTZMDT ";
				},

				switchTheme: function(event) {
					$('.theme-button.active').removeClass('active');
					var theme = $(event.target).addClass('active').attr('data');
					$('body').removeClass().addClass(theme);
				},

				promptModal: function(text, continueCallback, cancelCallback) {
					$('.modal-prompt-text').text(text);
					$('#modal-prompt .continue').one("click", $.modal.close);
					$('#modal-prompt .cancel').one("click", $.modal.close);
					if (continueCallback) {
						$('#modal-prompt .continue').one("click", continueCallback);
					}
					if (cancelCallback) {
						$('#modal-prompt .cancel').one("click", cancelCallback);
					}
					$('#modal-prompt').modal();
				},

				warningModal: function(text) {
					$('.modal-warning-text').text(text);
					$('#modal-warning').modal();
				},
		};

$(function() {
	app.init();
});

function Word(value, popularity) {
	this.value = value;
	this.popularity = popularity;
	this.length = value.length;
}
Word.prototype.toString = function(){
 return this.value;
}
Word.comparePopularity = function(a, b) {
	return a.popularity - b.popularity;
}
Word.compareLength = function(a, b) {
	return b.length - a.length;
}

// Kehole code is the modded version of:
// http://thecodeplayer.com/walkthrough/magnifying-glass-for-images-using-jquery-and-css3
keyhole = {
	native_width: 0,
	native_height: 0,
	image: undefined,
	selector: undefined,		
	init: function(selector, image) {
		if (image) {
			this.image = image;
		}
		this.selector = selector;
		$(selector).mousemove($.proxy(this.peek, this));
		$(selector).mouseleave(this.disappear);
	},
	reset: function() {
		this.native_width = 0;
		this.native_height = 0;
		this.image = undefined;
	},
	disappear: function() {
		$(".keyhole").fadeOut(100);
	},
	peek: function(event) {
		if(!this.native_width && !this.native_height)
		{
			// To get the actual dimensions we have created this image object.
			var image_object = new Image();			
			if (typeof this.image === "string") {
				if (this.image.length<20 || this.image.indexOf("/")==-1) {
					$('.keyhole').css('background', "url('assets/images/" + this.image + "') no-repeat");
					image_object.src = "assets/images/" + this.image;
				} else {
					$('.keyhole').css('background', "url('" + this.image + "') no-repeat");
					image_object.src = this.image;
				}							
				this.native_width = image_object.width;
				this.native_height = image_object.height;
			} else {
				var reader = new FileReader(),
					_this = this;
				reader.onload = function(event) {
				   $('.keyhole').css('background', "url(" + event.target.result + ") no-repeat");
				   image_object.src = event.target.result;
				   _this.native_width = image_object.width;
				   _this.native_height = image_object.height;
				};
				reader.readAsDataURL(this.image);				
			}
		}
		else
		{
			//x/y coordinates of the mouse
			//This is the position of container with respect to the document.
			var magnify_offset = $(this.selector).offset();
			//We will deduct the positions of selector from the mouse positions with
			//respect to the document to get the mouse positions with respect to the 
			//container
			var mx = event.pageX - magnify_offset.left;
			var my = event.pageY - magnify_offset.top;
			
			//Finally the code to fade out the glass if the mouse is outside the container
			if(mx < $(this.selector).width() && my < $(this.selector).height() && mx > 0 && my > 0)
			{
				$(".keyhole").fadeIn(100);
			}
			else
			{
				$(".keyhole").fadeOut(100);
			}
			if($(".keyhole").is(":visible"))
			{
				//The background position of .keyhole will be changed according to the position
				//of the mouse over the .small image. So we will get the ratio of the pixel
				//under the mouse pointer with respect to the image and use that to position the 
				//large image inside the magnifying glass
				var rx = Math.round(mx/$(this.selector).width()*this.native_width - $(".keyhole").width()/2)*-1;
				var ry = Math.round(my/$(this.selector).height()*this.native_height - $(".keyhole").height()/2)*-1;
				var bgp = rx + "px " + ry + "px";
				
				//Time to move the magnifying glass with the mouse
				var px = event.pageX + 20;
				var py = event.pageY + 20;
				//Now the glass moves with the mouse
				//The logic is to deduct half of the glass's width and height from the 
				//mouse coordinates to place it with its center at the mouse coordinates
				
				//If you hover on the image now, you should see the magnifying glass in action
				$(".keyhole").css({left: px, top: py, backgroundPosition: bgp});
			}
		}
	}
};