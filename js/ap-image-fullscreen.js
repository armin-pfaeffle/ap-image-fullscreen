/**
* @license ap-image-fullscreen.js v0.2
* Updated: 18.09.2014
* {DESCRIPTION}
* Copyright (c) 2014 armin pfaeffle
* Released under the MIT license
* http://armin-pfaeffle.de/licenses/mit
*/


/*

TODO/IDEAS:

- individual colors for each "page" -> read data-color="#fff" attribute
- individual zoom settings for each page
- SPACE key -> toggle zoom
- ESCAPCE key -> close
- LEFT key -> previous
- RIGHT key -> next
- PAGE UP -> next
- PAGE DOWN -> previous
- ENTER -> next
- double tap -> zoom
- New button: download image/open image
- POS1 -> first image
- END -> last image

BUGS:

- No instant fullscreen (screenfull) opening possible right know -> why?

*/



;(function($) {

	var datakey = '__apifs__';
	var cssPrefix = 'apifs-';
	var eventNamespace = 'apifs';

	/**
	 * Makes the first character of str uppercase and returns that string.
	 */
	function ucfirst(str) {
		str += ''; // ensure that str is a string
		var c = str[0].toUpperCase();
		return c + str.substr(1);
	}

	/**
	 * Adds ucfirst() method to String class. Makes the first character
	 * of str uppercase and returns that string.
	 */
	if (!String.prototype.ucfirst) {
		String.prototype.ucfirst = function() {
			return ucfirst(this);
		};
	}

	/**
	 * From: http://stackoverflow.com/a/5077091
	 */
	String.prototype.format = function () {
		var args = arguments;
		return this.replace(/\{\{|\}\}|\{(\d+)\}/g, function (m, n) {
			if (m == "{{") { return "{"; }
			if (m == "}}") { return "}"; }
			return args[n];
		});
	}

	/**
	 *
	 */
	jQuery.fn.tagName = function() {
		return this.prop("tagName").toLowerCase();
	}


	/**
	 * Constructor for ApImageFullscreen plugin.
	 */
	function ApImageFullscreen(elements, options) {
		var self = this;
		var settings = $.extend(true, {}, ApImageFullscreen.defaultSettings, options);

		// Do not remake the fullscreen plugin
		// Important: do NOT use jQuery's each() function here because we use return false
		var instance;
		for (index = 0; index < $(elements).length; index++) {
			if ((instance = $(elements).data(datakey)) !== undefined) {
				if (settings.autoReassign) {
					instance.remove($(elements));
				}
				else {
					return false;
				}
			}
		}

		this.$elements = elements;
		this.settings = settings;
		this._init();

		// Save the instance
		$(elements).each(function() {
			$(this).data(datakey, self);
		});
	}

	/**
	 * ApImageFullscreen class.
	 */
	ApImageFullscreen.prototype = {

		/**
		 *
		 */
		_init: function() {
			this.currentIndex = 0;

			this._addContainer();
			this._obtainAndAppendImages();
			this._addButtons();
			this._bind();

			if (this.settings.autoOpen) {
				this.open();
			}
		},

		/**
		 *
		 */
		_addContainer: function() {
			this.$container = $(ApImageFullscreen.template).appendTo($('body'));
			this.$fullscreenElement = this.$container.find('.' + cssPrefix + 'fullscreen-element').attr('tabIndex', -1);
			this.$wrapper = this.$container.find('.' + cssPrefix + 'wrapper');
			this.$images = this.$container.find('.' + cssPrefix + 'images');
		},

		/**
		 *
		 */
		_obtainAndAppendImages: function() {
			var self = this,
				imageUrl,
				$item,
				backgroundColor;

			this.$elements.each(function(index) {
				if ((imageUrl = self._obtainImageUrl(this)) !== undefined) {
					if (($item = self._addImage(imageUrl)) !== undefined) {
						// Apply background color if it is set
						if ((backgroundColor = $(this).data('background-color')) !== undefined) {
							$item.css('background-color', backgroundColor);
						}

						// Load image if necessary
						if (self.settings.lazyLoad === false || self.settings.lazyLoad == 'instant') {
							self._loadImages($item);
						}
					}
				}
			});
		},

		/**
		 *
		 */
		_obtainImageUrl: function(element) {
			switch ($(element).tagName()) {
				case 'img':
					return $(element).attr('src');

				case 'a':
					return $(element).attr('href');

				// TODO: Perhaps there are other elements to consider?
			}
			return undefined;
		},

		/**
		 *
		 */
		_addImage: function(element, index) {
			// Obtain image url and create item
			var imageUrl = (typeof element == 'string' ? element : this._obtainImageUrl(element));
			if (imageUrl) {
				var $item = $('<li></li>').data({imageUrl: imageUrl, loaded: false});

				var itemCount = this._getItemCount();
				if (itemCount > 0 && typeof index == 'number') {
					index = Math.min(Math.max(0, parseInt(index)), itemCount - 1);
					this._getItem(index).before($item);
				}
				else {
					this.$images.append($item);
				}
				return $item;
			}
			return undefined;
		},

		/**
		 *
		 */
		_loadImages: function($items) {
			var self = this;
			$items.each(function() {
				if ($(this).data('loaded') === false) {

					var options = $.extend({
						imageUrl: $(this).data('imageUrl'),
						onSwipeRight: function() {
							if (self.settings.enableSwipe) {
								self.previous();
							}
						},
						onSwipeLeft: function() {
							if (self.settings.enableSwipe) {
								self.next();
							}
						}
					}, self.settings.imageZoom);

					$(this)
						.data('loaded', true)
						.apImageZoom(options);

				}
			});
		},

		/**
		 *
		 */
		_addButtons: function() {
			this._addButtonContainers();

			// The correct order of the button names is important because of later usage of "append"!
			var buttonNames = ['previous', 'next', 'close', 'download'];
			for (index in buttonNames) {
				var buttonName = buttonNames[index];
				var options;

				// First we have to check if there is a correct position for this button before we add it...
				if (typeof this.settings.buttons == 'object' && (options = this.settings.buttons[buttonName]) != undefined) {
					var position = options.position.split(',').map(function(s) { return s.trim().toLowerCase(); });
					if (['left', 'right'].indexOf(position[0]) > -1 && ['top', 'center', 'bottom'].indexOf(position[1]) > -1) {
						// ... then we can create the button and add it to the correct container
						var $button = $('<a></a>')
								.html(buttonName.ucfirst())
								.attr('href', '#' + buttonName)
								.addClass('{0}button'.format(cssPrefix))
								.addClass('{0}{1}-button'.format(cssPrefix, buttonName));
						if (typeof options.text === 'string') {
							$button.attr('alt', options.text).attr('title', options.text)
						}
						var containerClass = '.{0}buttons-{1}-{2}'.format(cssPrefix, position[0], position[1]);
						this.$wrapper.find(containerClass).append($button);
						this['$' + buttonName + 'Button'] = $button;

						// Assign button click: buttonName == name of called method
						$button.data('clickMethodName', buttonName);

						if (options.visible === false) {
							$button.hide();
						}

						var themeName = (typeof options.theme === 'string' ? options.theme : this.settings.defaultTheme);
						$button.addClass('{0}button-theme-{1}'.format(cssPrefix, themeName));
					}
				}
			}
			this._updateButtons();
		},

		/**
		 *
		 */
		_addButtonContainers: function() {
			var horizontal = ['left', 'right'];
			var vertical = ['top', 'center', 'bottom'];
			for (hIndex in horizontal) {
				for (vIndex in vertical) {
					$('<div></div>')
						.addClass('{0}buttons'.format(cssPrefix))
						.addClass('{0}buttons-{1}-{2}'.format(cssPrefix, horizontal[hIndex], vertical[vIndex]))
						.appendTo(this.$wrapper);
				}
			}
		},

		/**
		 *
		 */
		_updateButtons: function() {
			var disabledButtonClassName = cssPrefix + 'button-disabled';

			if (this.currentIndex == 0) {
				this.$previousButton.addClass(disabledButtonClassName);
			}
			else if (this.$previousButton.hasClass(disabledButtonClassName)) {
				this.$previousButton.removeClass(disabledButtonClassName);
			}

			if (this.currentIndex == this._getAllItems().length - 1) {
				this.$nextButton.addClass(disabledButtonClassName);
			}
			else if (this.$nextButton.hasClass(disabledButtonClassName)) {
				this.$nextButton.removeClass(disabledButtonClassName);
			}
			// this.$closeButton.addClass(cssPrefix + 'button-top');
			// this.$previousButton.addClass(cssPrefix + 'button-bottom');
			// this.$nextButton.addClass(cssPrefix + 'button-bottom');
		},

		/**
		 *
		 */
		_bind: function() {
			var self = this;

			var buttonNames = ['previous', 'next', 'close', 'download'];
			for (index in buttonNames) {
				var $button = this['$' + buttonNames[index] + 'Button'];
				$button.on('click.' + eventNamespace, function() {
					if (!$(this).hasClass(cssPrefix + 'button-disabled')) {
						var f = self[$(this).data('clickMethodName')];
						if (typeof f == 'function') {
							f.apply(self);
						}
					}
					return false;
				});
			}

			this.$fullscreenElement
				.on('keydown', function(evt) {
					switch (evt.keyCode) {
						case 38: // keyup
							self._getCurrentItem().apImageZoom('zoomIn');
							evt.preventDefault();
							break;

						case 39: // keyright
						case 34: // page-down
							self.next();
							evt.preventDefault();
							break;

						case 40: // keydown
							self._getCurrentItem().apImageZoom('zoomOut');
							evt.preventDefault();
							break;

						case 37: // keyleft
						case 33: // page-up
							self.previous();
							evt.preventDefault();
							break;

						case 32: // space
							self._getCurrentItem().apImageZoom('zoomToggle');
							evt.preventDefault();
							break;

						case 27: // escape
							self.close();
							evt.preventDefault();
							break;

						case 36: // pos1
							self.first();
							evt.preventDefault();
							break;

						case 35: // end
							self.last();
							evt.preventDefault();
							break;

						case 9: // tab
							if (evt.shiftKey) {
								self.previous();
							}
							else {
								self.next();
							}
							evt.preventDefault();
							break;
					}
				});
		},

		/**
		 *
		 */
		_unbind: function() {
			var buttonNames = ['previous', 'next', 'close', 'download'];
			for (index in buttonNames) {
				var $button = this['$' + buttonNames[index] + 'Button'];
				$button.off('click.' + eventNamespace);
			}

			this.$fullscreenElement.off('keydown.' + eventNamespace);
		},

		/**
		 *
		 */
		_show: function(index, animate) {
			var self = this;

			// Make index valid
			index = Math.min(Math.max(index, 0), this._getAllItems().length);
			this.currentIndex = index;
			var $item = this._getItem(index);

			// Lazy load image method for after showing page
			var loadImage = function() {
				if (self.settings.lazyLoad == 'visible') {
					self._loadImages($item);
				}
			}

			// It's importan to reset image BEFORE it is shown
			if (this.settings.resetOnScroll) {
				this._resetItems($item);
			}

			// Move images container to the right position, so it shows image with given index
			var left = (-1 * index * 100) + '%';
			if (animate === true) {
				this.$images
					.stop(true, false)
					.animate({left: left}, this.settings.slideDuration, loadImage);
			}
			else {
				this.$images.css('left', left);
				loadImage();
			}

			this.$fullscreenElement.focus();
			this._updateButtons();
		},

		/**
		 *
		 */
		_getItem: function(index) {
			var $item = this.$images.children(':eq(' + index + ')');
			return $item;
		},

		/**
		 *
		 */
		_getCurrentItem: function() {
			var $item = this._getItem(this.currentIndex);
			return $item;
		},

		/**
		 *
		 */
		_getAllItems: function() {
			var $items = this.$images.children();
			return $items;
		},

		/**
		 *
		 */
		_getItemCount: function() {
			var count = this.$images.children().length;
			return count;
		},

		/**
		 *
		 */
		_resetItems: function($items) {
			var self = this;
			if ($items == undefined) {
				$items = this._getAllItems();
			}
			else if (typeof $items == 'number') {
				$items = this._getItem($items);
			}

			$items.each(function() {
				if ($(this).data('loaded') === true) {
					$(this).apImageZoom('reset');
					self._trigger('reset', [$(this)]);
				}
			});
		},

		/**
		 *
		 */
		_trigger: function(eventType, args, $context) {
			var optionName = 'on' + eventType.ucfirst(),
				f = this.settings[optionName];
			if (typeof f == 'function') {
				$context = ($context ? $context : this._getCurrentItem());
				f.apply($context, args);
			}
			eventType = eventNamespace + eventType.ucfirst();
			this._getCurrentItem().trigger(eventType, args);
		},

		/**
		 *
		 */
		_triggerHandler: function(eventType, args, $context) {
			var optionName = 'on' + eventType.ucfirst(),
				f = this.settings[optionName],
				callbackResult = undefined,
				result;
			$context = ($context ? $context : this._getCurrentItem());
			if (typeof f == 'function') {
				callbackResult = f.apply($context, args);
			}
			eventType = eventNamespace + eventType.ucfirst();
			result = ((result = $context.triggerHandler(eventType, args)) !== undefined ? result : callbackResult);
			return result;
		},

		/**
		 *
		 */
		_showError: function(message) {
			// TODO
			/*
			if (!this.$errorMessage) {
				this.$errorMessage = $('<div></div>').addClass(cssPrefix + 'error');
				this.$wrapper.append(this.$errorMessage);
			}
			if (this.$loadingAnimation) {
				this.$loadingAnimation.remove();
			}
			this.$errorMessage.html(message);
			*/
		},

		/**
		 *
		 */
		open: function(index) {
			// Load all images if necessary
			if (this.settings.lazyLoad !== false && this.settings.lazyLoad != 'instant' && this.settings.lazyLoad !== 'visible') {
				this._loadImages(this._getAllItems());
			}


			var cssClass;
			if (this.settings.enableScreenfull && typeof screenfull == 'object' && screenfull.enabled) {
				cssClass = 'screenfull';
				screenfull.request( this.$fullscreenElement[0] );
			}
			else {
				cssClass = 'pseudo-fullscreen';

				// Save scroll position, so we can use overflow: hidden for <html> and <body>
				// When we close the fullscreen, the scroll position is restored
				this.scrollPosition = $(window).scrollTop();
			}
			$('html').addClass(cssPrefix + cssClass);

			if (this.settings.resetOnOpen) {
				this._resetItems();
			}

			index = index || 0;
			this._show(index, false);
		},

		/**
		 *
		 */
		close: function() {
			if ($('html').hasClass(cssPrefix + 'screenfull')) {
				screenfull.exit();
				$('html').removeClass(cssPrefix + 'screenfull');
			}
			else {
				$('html').removeClass(cssPrefix + 'pseudo-fullscreen');
				$(window).scrollTop(this.scrollPosition);
			}
		},

		/**
		 *
		 */
		isOpen: function() {
			return $('html').hasClass(cssPrefix + 'pseudo-fullscreen') || $('html').hasClass('cssPrefix' + screenfull);
		},

		/**
		 *
		 */
		next: function() {
			if (this.currentIndex < this._getItemCount() - 1) {
				this._show(this.currentIndex + 1, true);
			}
		},

		/**
		 *
		 */
		previous: function() {
			if (this.currentIndex > 0) {
				this._show(this.currentIndex - 1, true);
			}
		},

		/**
		 *
		 */
		first: function() {
			this._show(0, true);
		},

		/**
		 *
		 */
		last: function() {
			this._show(this._getItemCount() - 1, true);
		},

		/**
		 *
		 */
		add:function() {

			// TODO

			this._trigger('add');
		},

		/**
		 *
		 */
		remove: function($image) {

			// TODO
			this._trigger('remove');
		},

		/**
		 *
		 */
		download: function() {
			var url = this._getCurrentItem().find('img').attr('src');
			window.open(url);
			this._trigger('download');
		},

		/**
		 *
		 */
		option: function(key, value) {
			if (!key) {
				// Return copy of current settings
				return $.extend({}, this.settings);
			}
			else {
				var options;
				if (typeof key == 'string') {
					if (arguments.length === 1) {
						// Return specific value of settings
						return (this.settings[key] !== undefined ? this.settings[key] : null);
					}
					options = {};
					options[key] = value;
				} else {
					options = key;
				}
				this._setOptions(options);
			}
		},

		/**
		 *
		 */
		_setOptions: function(options) {
			for (key in options) {
				var value = options[key];

				// Disable/modify plugin before we apply new settings

				// Apply option
				this.settings[key] = value;

				// Disable/modify plugin before we apply new settings
			}
		},

		/**
		 *
		 */
		destroy: function() {
			this._trigger('destroy');

			this._unbind();

			// this.$target.removeData(datakey);
			// if (this.mode == 'container') {
			// 	this.$image.removeData(datakey);
			// }
		}



		,_log: function(message) {
			if (!this.$log) {
				this.$log = $('<div></div>').addClass(cssPrefix + 'log').appendTo(this.$wrapper);
			}
			this.$log.append( $('<p></p>').html(message) );
		}


	};

	/**
	 *
	 */
	$.fn.apImageFullscreen = function( options ) {
		if (typeof options === 'string') {
			var instance, method, result, returnValues = [];
			var params = Array.prototype.slice.call(arguments, 1);
			this.each(function() {
				instance = $(this).data(datakey);
				if (!instance) {
					returnValues.push(undefined);
				}
				// Ignore private methods
				else if ((typeof (method = instance[options]) === 'function') && (options.charAt(0) !== '_')) {
					var result = method.apply(instance, params);
					if (result !== undefined) {
						returnValues.push(result);
					}
				}
			});
			// Return an array of values for the jQuery instances
			// Or the value itself if there is only one
			// Or keep chaining
			return returnValues.length ? (returnValues.length === 1 ? returnValues[0] : returnValues) : this;
		}
		else {
			var instance = new ApImageFullscreen(this, options);
			return (instance ? this : false);
		}
	};

	/**
	 * Default settings for ApImageFullscreen plugin.
	 */
	ApImageFullscreen.defaultSettings = {
		autoReassign: true,

		autoOpen: false,
		imageZoom : {
			loadingAnimation: 'throbber',
			loadingAnimationFadeOutDuration: 500,
			doubleTap: 'zoomToggle'
		},
		lazyLoad: 'open',				// Options: false, 'instant', 'open', 'visible'
		slideDuration: 300,
		resetOnOpen: true,
		resetOnScroll: true,

		defaultTheme: 'gray',			// Themes: 'gray', 'contrast', 'light', 'dark'
		buttons: {						// Options for position: left|right, top|center|bottom
			close:    { visible: true, position: 'right, top', text: 'Close', theme: undefined },
			next:     { visible: true, position: 'right, bottom', text: 'Next', theme: undefined },
			previous: { visible: true, position: 'right, bottom', text: 'Previous', theme: undefined },
			download: { visible: true, position: 'left, bottom', text: 'Download', theme: undefined }
		},

		enableScreenfull: true,
		enableSwipe: true
	};

	/**
	 *
	 */
	ApImageFullscreen.template =
		'<div class="' + cssPrefix + 'container">' +
			'<div class="' + cssPrefix + 'fullscreen-element">' +
				'<div class="' + cssPrefix + 'wrapper ' + cssPrefix +'clearfix">' +
					'<ul class="' + cssPrefix + 'images">' +
					'</ul>' +
				'</div>' +
			'</div>' +
		'</div>';

}(jQuery));
