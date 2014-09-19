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

*/



;(function($) {

	var datakey = '__apifs__';
	var cssPrefix = 'apifs-';
	var eventPrefix = 'apifs';

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
		var settings = $.extend({}, ApImageFullscreen.defaultSettings, options);

		// Do not remake the fullscreen plugin
		var instance;
		for (index in elements) {
			if ((instance = $(elements).data(datakey)) !== undefined) {
				if (settings.autoReassign) {
					instance.remove($(elements));
				}
				else {
					// TODO: Show error message?
					return false;
				}
			}
		}

		this.$elements = elements;
		this.settings = settings;
		this._init();

		if (this.settings.autoOpen) {
			this.open();
		}

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
			var self = this;

			this.currentIndex = 0;

			this._addContainer();
			this._obtainAndAppendImages();
			this._addButtons();
		},

		/**
		 *
		 */
		_addContainer: function() {
			this.$container = $(ApImageFullscreen.template);
			this.$container.appendTo($('body'));

			this.$fullscreenElement = this.$container.find('.' + cssPrefix + 'fullscreen-element');
			this.$wrapper = this.$container.find('.' + cssPrefix + 'wrapper');
			this.$images = this.$container.find('.' + cssPrefix + 'images');
		},

		/**
		 *
		 */
		_obtainAndAppendImages: function() {
			var self = this,
				imageUrl,
				$item;

			this.$elements.each(function(index) {
				if ((imageUrl = self._obtainImageUrl(this)) !== undefined) {
					if (($item = self._addImage(imageUrl)) !== undefined) {
						// Add references for better access
						$(this).data(datakey + '.item', $item);
						$item.data('target', $(this));

						// Load image
						if (self.settings.lazyLoad === false || self.settings.lazyLoad == 'instant') {
							self._loadImage($item);
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

				// TODO: Perhaps there are other to consider?
			}
			return undefined;
		},

		/**
		 *
		 */
		_addImage: function(element, position) {
			// Obtain image url and create item
			var imageUrl = (typeof element == 'string' ? element : this._obtainImageUrl(element));
			if (imageUrl) {
				var $item = $('<li></li>');
				$item.data('imageUrl', imageUrl);
				$item.data('loaded', false);

				// Prepare item insert position
				var childrenCount = this.$images.children().length;
				var position = Math.max(0, position);

				if (childrenCount > 0 && position < childrenCount && typeof position == 'number') {
					this.$images.children(':eq(' + position + ')').before($item);
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
		_loadImage: function($item) {
			console.debug('_loadImage');
			var self = this;
			if ($item && $item.data('loaded') === false) {
				$item.apImageZoom({
					imageUrl: $item.data('imageUrl'),
					loadingAnimation: 'throbber',
					onSwipeRight: function() {
						self.previous();
					},
					onSwipeLeft: function() {
						self.next();
					},
				});
			}
		},

		/**
		 *
		 */
		_addButtons: function() {
			var self = this;

			this._addButtonContainers();

			// The correct order of the button names is important because of later usage of "append"!
			var buttonNames = ['previous', 'next', 'close'];
			for (index in buttonNames) {
				// First we have to check if there is a correct position for this button before we add it...
				var buttonName = buttonNames[index];
				var options;
				if (typeof this.settings.buttons == 'object' && (options = this.settings.buttons[buttonName]) != undefined) {
					var position = options.position.split(',').map(function(s) { return s.trim().toLowerCase(); });
					if (['left', 'right'].indexOf(position[0]) > -1 && ['top', 'center', 'bottom'].indexOf(position[1]) > -1) {
						// Create button and add it to the correct container
						var $button = $('<a href="#{0}">{1}</a>'.format(buttonName, buttonName.ucfirst()))
								.addClass('{0}button'.format(cssPrefix))
								.addClass('{0}{1}-button'.format(cssPrefix, buttonName));
						var containerClass = '.{0}buttons-{1}-{2}'.format(cssPrefix, position[0], position[1]);
						this.$wrapper.find(containerClass).append($button);
						this['$' + buttonName + 'Button'] = $button;

						// Assign button click: buttonName == name of called method
						$button.data('clickMethodName', buttonName);
						$button.click(function() {
							var f = self[$(this).data('clickMethodName')];
							if (typeof f == 'function') {
								f.apply(self);
							}
							return false;
						});

						if (options.visible === false) {
							$button.hide();
						}
						if (typeof options.theme == 'string') {
							$button.addClass('{0}button-theme-{1}'.format(cssPrefix, options.theme));
						}
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
					var $container = $('<div></div>')
							.addClass('{0}buttons'.format(cssPrefix))
							.addClass('{0}buttons-{1}-{2}'.format(cssPrefix, horizontal[hIndex], vertical[vIndex]));
					this.$wrapper.append($container);
				}
			}
		},

		/**
		 *
		 */
		_updateButtons: function() {
			// this.$closeButton.addClass(cssPrefix + 'button-top');
			// this.$previousButton.addClass(cssPrefix + 'button-bottom');
			// this.$nextButton.addClass(cssPrefix + 'button-bottom');
		},

		/**
		 *
		 */
		_bind: function() {
			var self = this;

		},

		/**
		 *
		 */
		_unbind: function() {

		},

		/**
		 *
		 */
		_show: function(index, animate) {
			// Make index valid
			var index = Math.min(Math.max(index, 0), this.$images.children().length);
			this.currentIndex = index;

			// Load image if it should be loaded when getting visible
			if (this.settings.lazyLoad == 'visible') {
				this._loadImage(this.$images.children(':eq(' + index + ')'));
			}

			// Move images container to the right position, so it shows image with given index
			var left = (-1 * index * 100) + '%';
			if (animate) {
				this.$images.animate({left: left});
			}
			else {
				this.$images.css('left', left);
			}
		},

		/**
		 *
		 */
		_trigger: function(eventType, args) {
			var optionName = 'on' + eventType.ucfirst();
			var f = this.settings[optionName];
			if (typeof f == 'function') {
				f.apply(this.$target, args);
			}
			eventType = eventPrefix + eventType.ucfirst();
			this.$target.trigger(eventType, args);
		},

		/**
		 *
		 */
		_triggerHandler: function(eventType, args) {
			var optionName = 'on' + eventType.ucfirst(),
				callbackResult = undefined,
				result,
				f = this.settings[optionName];
			if (typeof f == 'function') {
				callbackResult = f.apply(this.$target, args);
			}
			eventType = eventPrefix + eventType.ucfirst();
			result = ((result = this.$target.triggerHandler(eventType, args)) !== undefined ? result : callbackResult);
			return result;
		},

		/**
		 *
		 */
		_showError: function(message) {
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
		isOpen: function() {
		},

		/**
		 *
		 */
		open: function(index) {
			var self = this;

			if (this.settings.lazyLoad !== false && this.settings.lazyLoad != 'instant' && this.settings.lazyLoad !== 'visible') {
				this.$images.children().each(function() {
					self._loadImage($(this));
				});
			}

			if (!this.settings.disableScreenfull && typeof screenfull == 'object' && screenfull.enabled) {
				$('html').addClass(cssPrefix + 'screenfull');
				var element = this.$fullscreenElement[0];
				screenfull.request(element);
			}
			else {
				$('html').addClass(cssPrefix + 'pseudo-fullscreen');
			}

			index = index || 0;
			this._show(index, false);
		},

		/**
		 *
		 */
		close: function() {
			if (!this.settings.disableScreenfull && typeof screenfull == 'object' && screenfull.enabled) {
				$('html').removeClass(cssPrefix + 'screenfull');
				screenfull.exit();
			}
			else {
				$('html').removeClass(cssPrefix + 'pseudo-fullscreen');
			}
		},

		/**
		 *
		 */
		next: function() {
			if (this.currentIndex < this.$images.children().length - 1) {
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
		remove: function($image) {
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
				this._setCssClasses();
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
			return this;
		}
	};

	/**
	 * Default settings for ApImageFullscreen plugin.
	 */
	ApImageFullscreen.defaultSettings = {
		autoReassign: true,
		autoOpen: false,
		lazyLoad: 'open',				// Options: false, 'instant', 'open', 'visible'
		buttons: {						// Options for position: left|right, top|center|bottom
			close:    { visible: true, position: 'right, top', theme: 'white' },
			next:     { visible: true, position: 'right, bottom', theme: 'white' },
			previous: { visible: true, position: 'right, bottom', theme: 'white' }
		},

		disableScreenfull: false
	};

	ApImageFullscreen.template =
		'<div class="' + cssPrefix + 'container">' +
			'<div class="' + cssPrefix + 'fullscreen-element">' +
				'<div class="' + cssPrefix + 'wrapper ' + cssPrefix +'">' +
					'<ul class="' + cssPrefix + 'images">' +
					'</ul>' +
				'</div>' +
			'</div>' +
		'</div>';

}(jQuery));
