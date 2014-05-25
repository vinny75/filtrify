/**
 * jQuery Filtrify v0.2
 * Beautiful advanced tag filtering with HTML5 and jQuery
 * http://luis-almeida.github.com/filtrify
 *
 * Licensed under the MIT license.
 * Copyright 2012 Luís Almeida
 * https://github.com/luis-almeida
 */

;(function ( $, window, document, undefined ) {

	$.widget('af.accordionFiltrify', $.ui.accordion, {
	
		options: {
			noresults : "No results match",
			hide      : true,
			block     : [],
			/*close     : false,*/
			query     : undefined, // { category : [tags] } }
			callback  : undefined, // function ( query, match, mismatch ) {}
			container : '#container'
		},	
		
		_create: function() {
			
			this._container = $(this.options.container);
			this._holder = this.element;
			this._items = this._container.children();
			this._matrix = [];
			this._fields = {};
			this._order = []; // helper to get the right field order
			this._menu = {};
			
			this._query = {};
			this._match = [];
			this._mismatch = [];
			this._z = 9999;
			
			this._load();
			this._set();

			if ( this.options.query !== undefined ) { 
				this._triggerQuery( this.options.query );
			};
			
			this.element = this._menu.list; // make div.ft-menu the accordion
			this._super();
		}, 
		_bind: function ( fn, me ) { 
			return function () { 
				return fn.apply( me, arguments ); 
			}; 
		},
		
		_load: function () {
			var attr, i, name, field, tags, data, t;

			this._items.each( this._bind( function( index, element ) {

				attr = element.attributes;
				data = {};

				for ( i = 0 ; i < attr.length; i++ ) {
					name = attr[i].name;
					if ( name.indexOf( "data-" ) === 0 && $.inArray( name, this.options.block ) === -1 ) {
						field = name.replace(/data-/gi, "").replace(/-/gi, " ");
						tags = element.getAttribute( name ).split(", ");
						data[field] = tags;

						if ( this._fields[field] === undefined ) {
							this._order.push(field);
							this._fields[field] = {};
						};

						for ( t = 0; t < tags.length; t++ ) {
							if ( tags[t].length ) {
								tags[t] = tags[t].replace(/\\/g, "");
								this._fields[field][tags[t]] = this._fields[field][tags[t]] === undefined ?
									1 : this._fields[field][tags[t]] + 1;
							};
						};
					};
				};

				this._matrix.push( data );

			}, this ) );
		},
		
		_set: function () {
			var f = 0, field,
				browser = $.browser;

			this._menu.list = $("<div class='ft-menu' />");

			for ( f; f < this._order.length; f++ ) {
				field = browser.webkit || browser.opera ? 
					this._order[f] : this._order[ this._order.length - f - 1 ];
				this._menu[ field ] = {};
				this._build( field );
				this._cache( field );
				this._events( field );
				this._menu.list.append( this._menu[field].item );
				this._query[field] = [];
			};

			this._holder.html( this._menu.list );
		},
		
		_build: function ( f ) {
			var html, t, tag, tags = [];
				
			html = "<h3><span class='ft-label'>" + f + "</span>" +
			"<span title='Clear filters' class='ft-reset ui-icon ui-icon-circle-close'></span></h3>" + 
			"<div class='ft-field'>" +
			"<div class='ft-panel'>" +
			"<ul class='ft-selected' style='display:none;'></ul>" +
			"<fieldset class='ft-search'><input type='text' placeholder='Search' /></fieldset>" +
			"<ul class='ft-tags'>";

			for ( tag in this._fields[f] ) {
				tags.push( tag );
			};

			tags.sort();

			for ( t = 0; t < tags.length; t++ ) {
				tag = tags[t];
				html += "<li data-count='" + this._fields[f][tag] + "' >" + tag + "</li>";
			};

			html += "</ul><div class='ft-mismatch ft-hidden'></div></div></div>";

			this._menu[f].item = $(html);
		},
		
		_cache: function ( f ) {
			this._menu[f].label = this._menu[f].item.find("span.ft-label");
			this._menu[f].panel = this._menu[f].item.find("div.ft-panel");
			this._menu[f].selected = this._menu[f].item.find("ul.ft-selected");
			this._menu[f].search = this._menu[f].item.find("fieldset.ft-search");
			this._menu[f].tags = this._menu[f].item.find("ul.ft-tags");
			this._menu[f].mismatch = this._menu[f].item.find("div.ft-mismatch");
			this._menu[f].reset = this._menu[f].item.find("span.ft-reset");

			this._menu[f].highlight = $([]);
			this._menu[f].active = $([]);
		},
		
		/*_append: function ( f ) {
			this._menu.list.append( this._menu[f].item );
		}, 
		
		_query: function ( f ) {
			this._query[f] = [];
		},*/
		
		_events: function ( f ) {
			this._menu[f].search.on( "keyup", "input", this._bind(function(event){

				if ( event.which === 38 || event.which === 40 ) { 
					return false; 
				} else if ( event.which === 13 ) {
					if ( this._menu[f].highlight.length ) {
						this._select( f );
						this._filter();
					};
				} else {
					this._search( f, event.target.value );
				};

			}, this) );

			this._menu[f].search.on( "keydown", "input", this._bind(function(event){

				if( event.which === 40 ) {
					this._moveHighlight( f, "down" );
					event.preventDefault();
				} else if ( event.which === 38 ) {
					this._moveHighlight( f, "up" );
					event.preventDefault();
				};

			}, this) );

			this._menu[f].tags.on( "mouseenter", "li", this._bind(function(event){
				this._highlight( f, $( event.target ) );
			}, this) );

			this._menu[f].tags.on( "mouseleave", "li", this._bind(function(){
				this._clearHighlight( f );
			}, this ) );

			this._menu[f].tags.on( "click", "li", this._bind(function(){
				this._select( f );
				this._filter();
			}, this) );

			this._menu[f].selected.on( "click", "li", this._bind(function(event){
				this._unselect( f, $( event.target ).text() );
				this._filter();
			}, this) );
			
			this._menu[f].reset.on( "click", this._bind(function(event){
				this._clearSelected( f );
				this._updateQueryField( f, {} );
				this._filter();
			}, this) );			

		},
		
		/*_openPanel: function ( f ) {
			this._menu[f].search.find("input").focus();
		},
		
		_closePanel: function ( f ) {
			this._resetSearch( f );
		},*/

		_preventOverflow: function ( f ) {
			var high_bottom, high_top, maxHeight, visible_bottom, visible_top;

			maxHeight = parseInt(this._menu[f].tags.css("maxHeight"), 10);
			visible_top = this._menu[f].tags.scrollTop();
			visible_bottom = maxHeight + visible_top;
			high_top = this._menu[f].highlight.position().top + this._menu[f].tags.scrollTop();
			high_bottom = high_top + this._menu[f].highlight.outerHeight();
			if (high_bottom >= visible_bottom) {
				return this._menu[f].tags.scrollTop((high_bottom - maxHeight) > 0 ? high_bottom - maxHeight : 0);
			} else if (high_top < visible_top) {
				return this._menu[f].tags.scrollTop(high_top);
			}
		},

		_moveHighlight: function ( f, direction ) {
			if ( this._menu[f].highlight.length ) {
				var method = direction === "down" ? "nextAll" : "prevAll",
					next = this._menu[f].highlight[method](":visible:first");
				if ( next.length ) {
					this._clearHighlight( f );
					this._highlight( f, next );
					this._preventOverflow( f );
				};
			} else {
				this_.highlight( f, this._menu[f].tags.children(":visible:first") );
				this._preventOverflow( f );
			};
		},

		_highlight: function ( f, elem ) {
			this._menu[f].highlight = elem;
			this._menu[f].highlight.addClass("ft-highlight");
		},

		_removeHighlight: function ( f ) {
			this._menu[f].highlight.removeClass("ft-highlight");
		},

		_hideHighlight: function ( f ) {
			this._menu[f].highlight.addClass("ft-hidden");
		},

		_resetHighlight: function ( f ) {
			this._menu[f].highlight = $([]);
		},

		_clearHighlight: function ( f ) {
			this._removeHighlight( f );
			this._resetHighlight( f );
		},

		_showMismatch: function ( f, txt ) {
			this._menu[f].mismatch
				.html( this.options.noresults + " \"<b>" + txt + "</b>\"")
				.removeClass("ft-hidden");
		},

		_hideMismatch: function ( f ) {
			this._menu[f].mismatch.addClass("ft-hidden");
		},

		_search: function ( f, txt ) {
			this._clearHighlight( f );
			this._showResults( f, txt );
			this._highlight( f, this._menu[f].tags.children(":visible:first") );
		},

		_resetSearch: function ( f ) {
			this._menu[f].search.find("input").val("");
			this._menu[f].tags.children()
				.not(this._menu[f].active)
				.removeClass("ft-hidden");

			this._hideMismatch( f );
		},

		_showResults: function ( f, txt ) {
			var results = 0;

			this.hideMismatch( f );

			this._menu[f].tags
				.children()
				.not(this._menu[f].active)
				.each(function() {
					if ( ( this.textContent || this.innerText ).toUpperCase().indexOf( txt.toUpperCase() ) >= 0 ) {
						$(this).removeClass("ft-hidden");
						results = results + 1;
					} else {
						$(this).addClass("ft-hidden");
					};
				});

			if ( !results ) {
				this._showMismatch( f, txt );
			};
		},

		_select: function ( f ) {
			this._updateQueryTags( f, this._menu[f].highlight.text() );
			this._updateActiveClass( f );
			this._removeHighlight( f );
			this._appendToSelected( f );
			this._addToActive( f );
			this._hideHighlight( f );
			this._resetHighlight( f );
			this._resetSearch( f );
		},

		_updateQueryTags: function ( f, tag ) {
			var index = $.inArray( tag, this._query[f] );

			if ( index === -1 ) {
				this._query[f].push( tag );
			} else {
				this._query[f].splice( index, 1 );
			};
		},

		_updateActiveClass: function ( f ) {
			if ( this._query[f].length ) {
				this._menu[f].label.addClass("ft-active");
			} else {
				this._menu[f].label.removeClass("ft-active");
			};
		},

		_appendToSelected: function ( f ) {
			this._menu[f].selected.append( this._menu[f].highlight.clone() );
			this._slideSelected( f );
		},

		_addToActive: function ( f ) {
			this._menu[f].active = this._menu[f].active.add( this._menu[f].highlight );
		},

		_unselect: function ( f, tag ) {
			this._updateQueryTags( f, tag );
			this._removeFromSelected( f, tag );
			this._removeFromActive( f, tag );
			this._updateActiveClass( f );
			this._resetSearch( f );
		},

		_removeFromSelected: function ( f, tag ) {
			this._menu[f].selected
				.children()
				.filter(function() { 
					return ( this.textContent || this.innerText ) === tag; 
				})
				.remove();

			this._slideSelected( f );
		},

		_removeFromActive: function ( f, tag ) {
			this._menu[f].active = this._menu[f].active.filter(function() { 
				return ( this.textContent || this.innerText ) !== tag; 
			});
		},

		_slideSelected: function ( f ) {
			if ( this._menu[f].selected.children().length ) {
				this._menu[f].selected.slideDown("fast");
			} else {
				this._menu[f].selected.slideUp("fast");
			};
		},

		_filter: function () {
			var f, r, t, c, m;

			this._resetCachedMatch();

			for ( r = this._matrix.length - 1; r >= 0; r-- ) {

				m = true;

				for ( f in this._query ) {

					c = 0;
					
					for ( t = this._query[f].length - 1; t >= 0; t-- ) {
						if ( $.inArray( this._query[f][t], this._matrix[r][f] ) !== -1 ) {
							c = c + 1;
						};
					};

					if ( !this._query[f].length  || c >= this._query[f].length ) {
						// match!
					} else { 
						m = false; 
					};

				};

				this._updateFields( r, m );
				this._cacheMatch( r, m );
				this._showMatch( r, m );

			};

			this._rewriteFields();

			this._callback();

		},

		_updateFields: function ( row, match ) {
			var field, tags, t;
			
			for ( field in this._fields ) {
				if ( row === this._matrix.length - 1 ) {
					this._fields[field] = {};
				};

				tags = this._matrix[row][field];

				if( match && tags ) {

					for ( t = 0; t < tags.length; t++ ) {
						if ( tags[t].length ) {
							this._fields[field][tags[t]] = this._fields[field][tags[t]] === undefined ?
								1 : this._fields[field][tags[t]] + 1;
						};
					};

				};
			};

		},

		_rewriteFields: function () {
			var field;
			for ( field in this._fields ) {
				this._menu[field].tags
					.children()
					.each( this._bind( function( index, element ) {
						var tag = ( element.textContent || element.innerText ),
							count = this._fields[field][tag] === undefined ? 0 : this._fields[field][tag];

						element.setAttribute("data-count", count );
							
						if ( count === 0 ) {
							$(element).addClass("ft-no-items-hidden");
						} else {
							$(element).removeClass("ft-no-items-hidden");
						};							
						
					}, this ) );
			};
		},

		_resetCachedMatch: function () {
			this._match = [];
			this._mismatch = [];
		},

		_cacheMatch: function ( row, match ) {
			if ( match ) {
				this._match.unshift( this._items[row] );
			} else {
				this._mismatch.unshift( this._items[row] );
			};
		},

		_showMatch: function ( row, match ) {
			if ( this.options.hide ) {

				var hidden = this._items[row].className.indexOf("ft-hidden") !== -1;

				if ( match ) {
					if ( hidden ) this._items[row].className = this._items[row].className.replace(/ft-hidden/g, "");
				} else {
					if ( !hidden ) this._items[row].className = this._items[row].className + " ft-hidden";
				};
				
			};
		},
		
		_callback: function () {
			if ( this.options.callback !== undefined && $.isFunction( this.options.callback ) ) {
				this.options.callback( this._query, this._match, this._mismatch );
			};
		},

		_triggerQuery: function ( query ) {
			var f;

			for ( f in this._fields ) {
				this._clearSearch( f );
				this._updateQueryField( f, query );
				this._updateActiveClass( f );
				this._updatePanel( f );
				this._toggleSelected( f );
			}; 

			this._filter();
		},

		_clearSearch: function ( f ) {
			this._clearHighlight( f );
			this._resetSearch( f );
			this._clearSelected( f );
		},

		_clearSelected: function ( f ) {
			this._menu[f].selected.empty();
			this._menu[f].active = $([]);
		},

		_updateQueryField: function ( f, query ) {
			this._query[f] = query[f] !== undefined ? query[f] : [];
		},

		_updatePanel: function ( f ) {
			var t = 0, tag,
				tags = this._menu[f].tags.children().removeClass("ft-hidden");

			for ( t; t < this._query[f].length; t++ ) {
				
				tag = tags.filter( this._bind( function( index ) {
					return ( tags[index].textContent || tags[index].innerText ) === this._query[f][t]; 
				}, this ));

				this._menu[f].selected.append( tag.clone() );
				this._menu[f].active = this._menu[f].active.add( tag );
				tag.addClass("ft-hidden");
			};
		},

		_toggleSelected: function ( f ) {
			if ( this._menu[f].selected.children().length ) {
				this._menu[f].selected.show();
			} else {
				this._menu[f].selected.hide();
			};
		},

		_reset: function() {
			this._triggerQuery({});
		}
	});

	
})(jQuery, window, document);