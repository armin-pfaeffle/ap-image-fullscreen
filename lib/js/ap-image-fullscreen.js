/**
* @license ap-image-fullscreen.js v0.6 (alpha)
* Updated: 16.12.2014
* {DESCRIPTION}
* Copyright (c) 2014 armin pfaeffle
* Released under the MIT license
* http://armin-pfaeffle.de/licenses/mit
*/

;(function($) {

	var datakey = '__apifs__';
	var cssPrefix = 'apifs-';
	var eventNamespace = 'apifs';
	var triggerEventPrefix = 'apifs';


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
	 *
	 */
	jQuery.fn.tagName = function() {
		return this.prop('tagName').toLowerCase();
	}


	/**
	 * Constructor for ApImageFullscreen plugin.
	 */
	function ApImageFullscreen(elements, options) {
		var self = this;
		var settings = $.extend(true, {}, ApImageFullscreen.defaultSettings, options);

		// Do not remake the fullscreen plugin
		// BUT if autoReassign = true, we remove the element from it's previous fullscreen instance,
		// so we can use it within this instance-
		// IMPORTANT: do NOT use jQuery's each() function here because we use return false
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

		this.$elements = $(elements);
		this.settings = settings;
		this._init();

		// Save the instance
		this.$elements.each(function() {
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
			this.currentIndex = -1;
			this.opened = false;
			this.usePseudeoFullscreenFallback = false;

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
		_removeContainer: function() {
			this.$container.remove();
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
								.addClass(cssPrefix + 'button')
								.addClass(cssPrefix + buttonName + '-button');
						if (typeof options.text === 'string') {
							$button.attr('alt', options.text).attr('title', options.text)
						}
						var containerClass = '.' + cssPrefix + 'buttons-' + position[0] + '-' + position[1];
						this.$wrapper.find(containerClass).append($button);
						this['$' + buttonName + 'Button'] = $button;

						// Assign button click: buttonName == name of called method
						$button.data('clickMethodName', buttonName);

						if (options.visible === false) {
							$button.hide();
						}

						var themeName = (typeof options.theme === 'string' ? options.theme : this.settings.defaultTheme);
						$button.addClass(cssPrefix + 'button-theme-' + themeName);
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
						.addClass(cssPrefix + 'buttons')
						.addClass(cssPrefix + 'buttons-' + horizontal[hIndex] + '-' + vertical[vIndex])
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

			if (this.currentIndex == this._getItemCount() - 1) {
				this.$nextButton.addClass(disabledButtonClassName);
			}
			else if (this.$nextButton.hasClass(disabledButtonClassName)) {
				this.$nextButton.removeClass(disabledButtonClassName);
			}
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

			var keyMap = {
				 9 : 'tab',
				'9+s' : 'shiftTab',
				27 : 'escape',
				32 : 'space',
				33 : 'pageUp',
				34 : 'pageDown',
				35 : 'end',
				36 : 'pos1',
				37 : 'left',
				38 : 'up',
				39 : 'right',
				40 : 'down'
			};
			this.$fullscreenElement
				.on('keydown.' + eventNamespace, function(evt) {

					if (evt.keyCode == 8 && self.opened) {
						self.close();
					}
					else if (evt.keyCode >= 48 && evt.keyCode <= 57 && self.settings.shortcuts.paging) {
						// If key is a number and paging is enabled then scroll to the corresponding page
						var index = evt.keyCode - 48;
						if (self.settings.shortcuts.zeroHandling != 'first') {
							index--;
							if (self.settings.shortcuts.zeroHandling == 'tenth' && index == -1) {
								index = 9;
							}
						}
						if (index >= 0 && index < self._getItemCount()) {
							self._show(index, true);
						}
						evt.preventDefault();
					}
					else {
						// .. else check if there is a action for the entered key
						var keyCode = evt.keyCode + (evt.shiftKey ? '+s' : '');
						var action;
						if (keyCode in self.settings.shortcuts) {
							action = self.settings.shortcuts[keyCode];
						}
						else if (keyCode in keyMap) {
							var key = keyMap[keyCode];
							action = self.settings.shortcuts[key];
						}
						if (action && self._handleKeyAction(action, evt)) {
							evt.preventDefault();
						}
					}
				});
		},

		/**
		 *
		 */
		_handleKeyAction: function(action, evt) {
			if (typeof action == 'function') {
				var context = this._getCurrentItem();
				action.apply(context, evt);
			}
			else {
				switch (action) {
					case 'zoomIn':
						this._getCurrentItem().apImageZoom('zoomIn');
						return true;

					case 'zoomOut':
						this._getCurrentItem().apImageZoom('zoomOut');
						return true;

					case 'zoomToggle':
						this._getCurrentItem().apImageZoom('zoomToggle');
						return true;

					case 'next':
						this.next();
						return true;

					case 'previous':
						this.previous();
						return true;

					case 'first':
						this.first();
						return true;

					case 'last':
						this.last();
						return true;

					case 'close':
						this.close();
						return true;
				}
			}
			return false;
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
			index = Math.min(Math.max(index, 0), this._getItemCount() - 1);
			if (this.currentIndex != index) {
				this.currentIndex = index;
				var $item = this._getItem(index);

				// Lazy load image method for after showing page
				var loadImage = function() {
					if (self.settings.lazyLoad == 'visible') {
						self._loadImages($item);
					}
				}

				// It's important to reset image BEFORE it is shown
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
			}
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
			eventType = triggerEventPrefix + eventType.ucfirst();
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
			eventType = triggerEventPrefix + eventType.ucfirst();
			result = ((result = $context.triggerHandler(eventType, args)) !== undefined ? result : callbackResult);
			return result;
		},

		/**
		 *
		 */
		open: function(index) {
			// Do not allow calling open twice or open the fullscreen mode if there is no image
			if (this.opened || this._getItemCount() == 0) {
				return;
			}
			this.opened = true;

			// Load all images if necessary
			if (this.settings.lazyLoad !== false && this.settings.lazyLoad != 'instant' && this.settings.lazyLoad !== 'visible') {
				this._loadImages(this._getAllItems());
			}

			if (this.settings.enableScreenfull && typeof screenfull == 'object' && screenfull.enabled) {
				screenfull.request( this.$fullscreenElement[0] );
				$('html').removeClass(cssPrefix + 'pseudo-fullscreen').addClass(cssPrefix + 'screenfull');

				// Check if fullscreen is visible, because if not, we can do a fallback to pseudo fullscreen
				// see this why we need this check: https://github.com/sindresorhus/screenfull.js/issues/56
				this._validateVisibleFullscreen();
			}
			else {
				$('html').removeClass(cssPrefix + 'screenfull').addClass(cssPrefix + 'pseudo-fullscreen');
			}

			if (this.settings.resetOnOpen) {
				this._resetItems();
			}

			if (!index) {
				index = (this.currentIndex > -1 ? this.currentIndex : 0);
			}
			this._show(index, false);
		},

		/**
		 *
		 */
		_validateVisibleFullscreen: function() {
			var self = this;
			setTimeout(function() {
				if (!self.$fullscreenElement.is(':visible')) {
					self.opened = false;
					$('html').removeClass(cssPrefix + 'screenfull');
					if (self._triggerHandler('pseudoFullscreenFallback') !== false) {
						self.opened = true;
						self.usePseudeoFullscreenFallback = true;
						$('html').addClass(cssPrefix + 'pseudo-fullscreen');
					}
				}
			}, this.settings.fullscreenVisibleCheckDuration)
		},

		/**
		 *
		 */
		close: function() {
			if (this.opened) {
				this.opened = false;
				if ($('html').hasClass(cssPrefix + 'screenfull')) {
					screenfull.exit();
					$('html').removeClass(cssPrefix + 'screenfull');
				}
				else {
					$('html').removeClass(cssPrefix + 'pseudo-fullscreen');
				}
			}
		},

		/**
		 *
		 */
		isOpen: function() {
			return this.opened;
		},

		/**
		 *
		 */
		next: function() {
			if (this.currentIndex < this._getItemCount() - 1) {
				this._show(this.currentIndex + 1, this.opened);
			}
		},

		/**
		 *
		 */
		previous: function() {
			if (this.currentIndex > 0) {
				this._show(this.currentIndex - 1, this.opened);
			}
		},

		/**
		 *
		 */
		first: function() {
			this._show(0, this.opened);
		},

		/**
		 *
		 */
		last: function() {
			this._show(this._getItemCount() - 1, this.opened);
		},

		/**
		 *
		 */
		add: function(element, index) {

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
				// TODO

				// Apply option
				this.settings[key] = value;

				// Disable/modify plugin before we apply new settings
				// TODO
			}
		},

		/**
		 *
		 */
		destroy: function() {
			this._trigger('destroy');

			if (this.opened) {
				this.close();
			}
			this._unbind();
			this._removeContainer();

			this.$elements.each(function() {
				$(this).removeData(datakey);
			});
		}



		// TODO: Remove in final version
		,_log: function(message) {
			if (!this.$log) {
				this.$log = $('<div></div>').addClass(cssPrefix + 'log').appendTo( $('body') );//this.$wrapper);
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
		 // TODO images: [],
		imageZoom : {
			minZoom: 'contain',
			maxZoom: 1.0,
			loadingAnimation: 'throbber',
			loadingAnimationFadeOutDuration: 500,
			doubleTap: 'zoomToggle'
		},
		lazyLoad: 'visible',			// Options: false, 'instant', 'open', 'visible'
		slideDuration: 250,
		resetOnOpen: true,
		resetOnScroll: true,

		defaultTheme: 'dark',			// Themes: 'gray', 'contrast', 'light', 'dark'
		buttons: {						// Options for position: left|right, top|center|bottom
			close:    { visible: true, position: 'right, top', text: 'Close', theme: undefined },
			next:     { visible: true, position: 'right, bottom', text: 'Next', theme: undefined },
			previous: { visible: true, position: 'right, bottom', text: 'Previous', theme: undefined },
			download: { visible: true, position: 'left, bottom', text: 'Download', theme: undefined }
		},

		shortcuts: {					// Possible actions: zoomIn, zoomOut, zoomToggle, next, previous, first, last, close
			escape: 'close',
			space: 'zoomToggle',

			tab: 'next',
			shiftTab: 'previous',

			up: 'zoomIn',
			right: 'next',
			down: 'zoomOut',
			left: 'previous',

			pageDown: 'next',
			pageUp: 'previous',
			pos1: 'first',
			end: 'last',

			paging: true,
			zeroHandling: 'first'		// Options: first, tenth, none/false
		},

		enableScreenfull: true,
		fullscreenVisibleCheckDuration: 20, // in ms
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
