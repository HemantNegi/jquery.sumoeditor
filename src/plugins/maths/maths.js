/*
 * jquery.sumoeditor - v1.0.0
 * Copyright 2017, Hemant Negi (hemant.frnz@gmail.com)
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 *
 * Maths plugin, provides support for maths input and rendering.
 */

;(function(Editor){

Editor.prototype.plugins.math = {

    /*
    * Initializes the plugin
    * @param {!Editor} instance current instance.
    */
    init: function(O){
        this.O = O;
        this.active();
    },

    active: function(){
        console.log(this.O);
    }
}

})(window.SumoEditor);