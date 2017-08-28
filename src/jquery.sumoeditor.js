/*
 * jquery.sumoeditor - v1.0.0
 * Copyright 2017, Hemant Negi (hemant.frnz@gmail.com)
 * Compressor http://refresh-sf.com/
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

;(function ($, window, document, undefined) {
    'use strict';

    var Editor = function (elem, opts) {
        var O = this;

        O.$e = $(elem);
        O.opts = opts;
        O.$wrapper = O.$e.wrap('<div class="sumoeditor">')
            .parent()
            .addClass(O.$e.attr('name'));
        O.$toolbar = $('<div class="toolbar">');
        O.$editor = $('<div class="editor" contenteditable="true" tab-index="1">');
        O.editor = O.$editor;

        O.$wrapper.append([O.$toolbar, O.$editor]);

        /*TODO: Remove this block*/
        O.$wrapper.after(O.$e);
    }

    Editor.prototype = {
        defaults: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
                ['quote', 'code-block'],

                [{'header': 1}, {'header': 2}],               // custom button values
                ['ol', 'ul', 'indent', 'unindent', 'sub', 'sup'],
                [{'direction': 'rtl'}],                         // text direction

                [{'size': ['small', false, 'large', 'huge']}],  // custom dropdown
                [{'header': [1, 2, 3, 4, 5, 6, false]}],

                [{'color': []}, {'background': []}],          // dropdown with defaults from theme
                [{'font': []}],
                [{'align': []}],

                ['clean']                                         // remove formatting button
            ]
        },

        init: function () {
            // Introduce defaults that can be extended either
            // globally or using an object literal.
            this.config = $.extend(this.defaults, this.opts);


            this.setToolbar();

            return this
        },

        /*
         * Parse config.toolbar options and populate buttons in toolbar.
         * */
        setToolbar: function () {
            var O = this,
                parseBtns = function (tools, $bar) {
                    tools.forEach(function (obj) {
                        if (typeof(obj) == 'string' && O.buttons[obj] /*TODO: Remove this check*/) {
                            var def = O.buttons[obj].call(O),
                                btn = O.createButton(def);
                            $bar.append(btn);
                        }
                        else if (Array.isArray(obj)) {
                            var $grp = $('<span class="grp">');
                            $bar.append($grp);
                            parseBtns(obj, $grp);
                        }
                        else if (obj && typeof obj === 'object') {

                        }
                        else {
                            console.error('undefined toolbar object: ', obj);
                        }
                    })
                }
            parseBtns(O.config.toolbar, O.$toolbar);
        },

        createButton: function (def) {
            return $('<button>').addClass('sumo-' + def.ico);
        }

    }

    Editor.prototype.buttons = {
        quote: function () {
            return {
                ico: 'quote',
                buttonIdentifier: 'quote',  // selector
                buttonHtml: 'Quote',        // caption value
                // type: 'block',
                // breakOnEnter: False,
                blockName: 'blockquote',    // these will always be the first child of editor.
                removeOnBackSpace: true,    // force remove this tag on backspace and wrap in P.
                clickHandler: function () {
                }
            }
        },
        bold:function () {
            return {
                ico:'bold'
            }
        },
        italic:function () {
            return {
                ico:'italic'
            }
        },
        underline:function () {
            return {
                ico:'underline'
            }
        },
        strike:function () {
            return {
                ico:'strike'
            }
        },
        ol:function () {
            return {ico:'ol' }
        },
        ul:function () {
            return {ico:'ul' }
        },
        indent:function () {
            return {ico:'indent' }
        },
        unindent:function () {
            return {ico:'unindent' }
        },
        sub:function () {
            return {ico:'sub' }
        },
        sup:function () {
            return {ico:'sup' }
        },



    }

    // Editor.defaults = Editor.prototype.defaults

    /*
     * Binds editor to matched set of nodes.
     * @return {Object.<Editor> || Array.<Object.<Editor>>}
     * */
    $.fn.sumoeditor = function (opts) {
        var instance = [];
        this.each(function () {
            if (!this.sumoeditor)
                this.sumoeditor = new Editor(this, opts).init()
            instance.push(this.sumoeditor);
        });
        return instance.length == 1 ? instance[0] : instance;
    }

    //window.Editor = Editor;
})(jQuery, window, document)

