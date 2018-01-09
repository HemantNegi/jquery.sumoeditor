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
      M.$toolbarW = $('<div style="display: none;" class="maths toolbar">');
      M.$toolbar = $('<div class="tb-maths">');
      M.$toolbarW.append(M.$toolbar);
      M.O.$toolbar.after(M.$toolbarW);

      M.setToolbar();
      // M.$toolbar.append('hello world from maths!');

      M.bindEvents();
    },

    setToolbar: function () {
      var M = this;
      M.$structures = $('<div class="structures">');

      M.structs.forEach(function (struct) {
        var m = $('<span class="math">').append(struct.ico());
        M.$structures.append(m);
      })

      M.$toolbar.append(M.$structures)
    },

    toggle: function () {
      var M = this;
      M.$toolbarW.toggle(!M.active);
      M.O.$toolbar.toggle(M.active);
      M.active = !M.active;
    },

    bindEvents: function () {
      var M = this;

      // TODO: see for alternatives of this.d
      M.O.$editor.on('caretMoved', function (e, curE) {
        var f = 0;
        $(curE).parentsUntil(M.O.$editor).each(function (i, x) {
          if ($(x).hasClass('math')) {
            f = 1;
            return;
          }
        });

        M.active = !f
        M.toggle();
      });

    },

    structs: [
      {
        nam: 'Fraction',
        ico: function () {
          return '<span class="mfrac"><span class="vlist-t"><span class="vlist-r"><span class="vlist bbtm">x</span></span><span class="vlist-r"><span class="vlist">y</span></span></span></span>';
        },
        grps: [
          {
            nam: 'Fraction',
            btns: [
              {
                html: '<span class="mfrac"><span class="vlist-t"><span class="vlist-r"><span class="vlist bbtm">x</span></span><span class="vlist-r"><span class="vlist">y</span></span></span></span>',
                tex: 'frac{}{}'
              },

            ]
          },
          {
            nam: 'Common Fraction'
          }
        ]
      },
        
        
    ],

    symbols: {}
  }

})(window.SumoEditor);