/*
 * jquery.sumoeditor - v1.0.0
 * Copyright 2017, Hemant Negi (hemant.frnz@gmail.com)
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 *
 * Maths plugin, provides support for maths input and rendering.
 */

;(function (Editor) {

    Editor.prototype.plugins.math = {

        active: false,

        /*
         * Initializes the plugin
         * @param {!Editor} instance current instance.
         */
        init: function (O) {
            this.O = O;
            this.setup();
            this.toggle();

        },

        setup: function () {
            var M = this;
            M.$toolbar = $('<div style="display: none;" class="maths toolbar">');
            M.O.$toolbar.after(M.$toolbar);

            M.$toolbar.append('hello world from maths!');

            M.bindEvents();
        },

        toggle: function () {
            var M = this;
            M.$toolbar.toggle(!M.active);
            M.O.$toolbar.toggle(M.active);
            M.active = !M.active;
        },


        bindEvents: function () {
            var M = this;

            // toggle the toolbar on content type.
            M.O.$editor.on('click keydown', function (e) {
                //if(!M.active) return;

                var f = 0;
                console.log(e.target)
                $(e.target).parentsUntil(M.O.$editor).each(function(i, x){
                    if($(x).hasClass('math')) {
                        f = 1;
                        return;
                    }
                });

                M.active = !f
                M.toggle();
            });
            
            
        }
    }

})(window.SumoEditor);