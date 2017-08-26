/*
 * jquery.sumoeditor - v1.0.0
 * Copyright 2017, Hemant Negi (hemant.frnz@gmail.com)
 * Compressor http://refresh-sf.com/
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */


;(function( $, window, document, undefined ){

  // our plugin constructor
  var Plugin = function( elem, options ){
      this.elem = elem;
      this.$elem = $(elem);
      this.options = options;

      // This next line takes advantage of HTML5 data attributes
      // to support customization of the plugin on a per-element
      // basis. For example,
      // <div class=item' data-plugin-options='{"message":"Goodbye World!"}'></div>
      this.metadata = this.$elem.data( "plugin-options" );
    };

  // the plugin prototype
  Plugin.prototype = {
    defaults: {
      message: "Hello world!"
    },

    init: function() {
      // Introduce defaults that can be extended either
      // globally or using an object literal.
      this.config = $.extend({}, this.defaults, this.options,
      this.metadata);

      // Sample usage:
      // Set the message per instance:
      // $('#elem').plugin({ message: 'Goodbye World!'});
      // or
      // var p = new Plugin(document.getElementById('elem'),
      // { message: 'Goodbye World!'}).init()
      // or, set the global default message:
      // Plugin.defaults.message = 'Goodbye World!'

      this.sampleMethod();
      return this;
    },

    sampleMethod: function() {
      // eg. show the currently configured message
      // console.log(this.config.message);
    }
  }

  Plugin.defaults = Plugin.prototype.defaults;

  $.fn.plugin = function(options) {
    return this.each(function() {
      new Plugin(this, options).init();
    });
  };

  //optional: window.Plugin = Plugin;

})( jQuery, window , document );
