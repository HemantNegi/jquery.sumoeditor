/*
 * jquery.sumoeditor - v1.0.0
 * Copyright 2017, Hemant Negi (hemant.frnz@gmail.com)
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 *
 * Math plugin, provides support for maths input and rendering.
 * Uses KaTex - https://khan.github.io/KaTeX/
 */

;(function(Editor){

    Editor.prototype.buttons.equation = function(){
        console.log('Called from editor', this);

        return {
            ico: 'equation',
        }
    }

})(window.SumoEditor);