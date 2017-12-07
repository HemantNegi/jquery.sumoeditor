/*
 * jquery.sumoeditor - v1.0.0
 * Copyright 2017, Hemant Negi (hemant.frnz@gmail.com)
 * Compressor http://refresh-sf.com/
 *
 * Licensed under the MIT license:
 * http://www.opensource.org/licenses/MIT
 */

/*
 TODO: these are builtin functions that can be used.
 - https://developer.mozilla.org/en-US/docs/Web/API/Range/insertNode
 - https://developer.mozilla.org/en-US/docs/Web/API/Node/normalize
 - https://developer.mozilla.org/en-US/docs/Web/API/Text/splitText
 - add attribute to link tags rel="noopener noreferrer"
 */

;(function ($, window, document, undefined) {
    'use strict';
    'namespace se';

    var Editor = function (elem, opts) {
        var O = this;

        O.$e = $(elem);
        O.opts = opts;
        O.$wrapper = O.$e.wrap('<div class="sumoeditor">')
            .parent()
            .addClass(O.$e.attr('name'));
        O.$toolbar = $('<div class="toolbar">');
        O.$editor = $('<div class="editor" contenteditable="true" tab-index="1">');
        O.editor = O.$editor[0];

        O.$wrapper.append([O.$toolbar, O.$editor]);
    }

    Editor.prototype = {
        defaults: {
            placeholder: 'Start writing here...',
            toolbar: [
                [{'size': [{'Small': '10px'}, {'Default': false}, {'Large':'22px'}, {'Huge': '32px'}]}],
                [{'format': [{'Heading 1': 'h1'}, {'Heading 2': 'h2'}, {'Heading 3': 'h3'}, {'Normal': false}, {'Pre': 'pre'}]}],
                ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
                ['quote', 'code'],

//                [{'header': 1}, {'header': 2}],               // custom button values
                ['ol', 'ul', {'align': [false, 'right', 'center', 'justify']},
                    'indent', 'unindent', 'sub', 'sup'],
                ['undo', 'redo'],
                ['link', 'img'],
//                [{'direction': 'rtl'}],                         // text direction

//                [{'size': ['small', false, 'large', 'huge']}],  // custom dropdown

//                [{'color': []}, {'background': []}],          // dropdown with defaults from theme
//                [{'font': []}],
//                [{'align': []}],

                ['clean']                                         // remove formatting button
            ]
        },

        /*
        * A list of elements which we want to consider block elements (wtf :p)
        * */
        BLOCK_ELEMENTS: {P:1, LI:1, BLOCKQUOTE:1, CODE:1, H1:1, H2:1, H3:1, H4:1, H5:1, UL:1, OL:1, PRE:1},

        /* An object to keep reference to created buttons */
        REG_BUTTONS: {},

        /* A list of currently highlighted buttons on the toolbar.*/
        HIGH_BUTTONS: [],

        /*
        * The default tag that will be used to create paragraphs (Not tested yet).
        */
        P_TAG: 'p',

        /* Array holds the tag names of elements to be removed forcefully on backspace.*/
        bkArr: ['li'],

        /*
        * initializes settings and module instance.
        * */
        init: function () {
            // Introduce defaults that can be extended either
            // globally or using an object literal.
            this.config = $.extend(this.defaults, this.opts);

            // initialize modules.
            this.history.O = this.selection.O = this.caret.O = this.utils.O = this;

            this.setUp();
            this.setToolbar();
            this.bindEvents();
            this.history.add();

            return this
        },

        /*
        * Setup and sanitize initial content into the editor.
        * */
        setUp: function () {
            var O = this;
            O.$editor.attr('placeholder', O.config.placeholder || O.$e.attr('placeholder'));

            O.$editor.html(O.$e.text());
            !!O.$editor.text().trim()? O.utils.sanitizeContent(O.$editor): O.$editor.empty();
            
            if (!O.$editor.children().length ) {
                O.utils.addLine(O.$editor);
            }

            O.getContent();

            // set initial caret position.
            //var nods = O.utils.textNodes(O.editor);
            //O.caret.setPos($(nods[0]), 0);
            O.caret.setPos(O.$editor, 0);

            /*TODO: Remove this block*/
            O.$wrapper.after(O.$e);
        },

        /*
         * Parse config.toolbar options and populate buttons in toolbar.
         * */
        setToolbar: function () {
            var O = this, btn,
                /*
                * @param: {string} key the unique property of button
                * @param: {!string} val the additional params for buttons
                * @param: {!jQuery Element} $dis The element ref to buttons header( for button type "style").
                * */
                create = function(key, val, LST){
                    if(key in O.buttons){
                        var def = O.buttons[key].call(O, val);
                        def.key = key;
                        if(LST){
                            def.setMnu = function (d) {
                                if(d){ // reset to default value
                                    LST.$dis.empty().append(LST.caption.btn.clone());
                                }
                                else{
                                    LST.$dis.empty().append(def.btn.clone());
                                }
                            }
                        }
                        // adds a button Element reference ("btn") to created the "def".
                        O.createButton(def);
                        return def
                    }
                    else{
                        console.error('Toolbar Button "' + key + '" is not defined.');
                        return !1;
                    }
                },

                /*
                * create lists and drop-downs.
                * @param: {jquery Element} $bar the parent element for list.
                * @param: {string} key the button name eg. "align"
                * @param: {Array} list array of options.
                */
                createLists = function($bar, key, list){
                    var def,
                        $lst = $('<span class="sumo-lst '+ key +'">'),
                        $dis = $('<span class="sumo-dis">'),
                        $drp = $('<span class="sumo-drp">'),
                        /*
                        * typedef: {Object}
                        * A parent object for menu items.
                        */
                        LST = {$dis: $dis},
                        open = function() {
                            $lst.addClass('open');

                            $('body').on('click.se', function(e){
                                if(!$.contains($lst[0], e.target)){
                                    $lst.removeClass('open');
                                }
                            });

                        },
                        close = function(){
                            $lst.removeClass('open');
                            $('body').off('click.se');
                        };

                    $lst.append([$dis, $drp]);
                    $bar.append($lst);

                    list.forEach(function(val){
                        def = create(key, val, LST);
                        $drp.append(def.btn);

                        if (def.mnu){
                            LST.caption = def; // set the default button.
                        }
                        // store a back ref to parent list.
                        def.LST = LST;
                    });
                    if(def){
                        def.setMnu(1);         // set the default option.
                        if(def.txt)$dis.addClass('sico-down-arrow')
                    }

                    $dis.on('click', function(){
                        $lst.hasClass('open')?close():open();
                    });
                    $drp.on('click', function(){
                        close();
                    })
                },

                /*
                * start parsing the configuration for buttons.
                */
                parseBtns = function (tools, $bar) {
                    tools.forEach(function (obj) {
                        if (typeof(obj) == 'string' && O.buttons[obj] /*TODO: Remove this check*/) {
                            btn = create(obj).btn;
                            (btn)?$bar.append(btn):0;
                        }
                        else if (Array.isArray(obj)) {
                            var $grp = $('<span class="sumo-grp">');
                            $bar.append($grp);
                            parseBtns(obj, $grp);
                        }
                        else if (obj && typeof obj === 'object') {
                            for (var key in obj){
                                if(Array.isArray(obj[key])){
                                    createLists($bar, key, obj[key]);
                                }
                                else{
                                    console.error('Improperly formatted button "' + key + '". Not an array');
                                }
                            }
                        }
                        else {
                            console.error('undefined toolbar object: ', obj);
                        }
                    })
                }

            parseBtns(O.config.toolbar, O.$toolbar);
        },

        /*
        * create buttons for the toolbar, also binds events and there handlers.
        * @param {Object} def A button definition object (returned form the button object)
        * @return {jQuery Element} the newly created button.
        * */
        createButton: function (def) {
            var O = this,
                btn = $('<button>');
            if(def.ico)btn.addClass('sico-' + def.ico);
            if(def.txt)btn.text(def.txt);

            if(def.rmOnBkSpace) this.bkArr.push(def.tag);

            btn.on('click', function (evt) {
                evt.preventDefault();
                //evt.stopPropagation();

                if(typeof def.onclick === 'function')
                    def.onclick.call(this, def);

                switch (def.typ) {
                case 'block':
                    // self.currentElement = self.addRemoveBlock(self, settings.blockName);
                    O.toggleBlock.call(O, def.tag);
                    break;
                case 'inline':
                    O.toggleInline.call(O, def.tag);
                    break;

                }


                O.editor.normalize();
                O.highlighter();
                O.history.add();
            })

            def.btn = btn;
            if(def.tag) {
                O.REG_BUTTONS[def.tag.toUpperCase()] = def;
            }
            return btn;
        },

        /*
        * Binds all the required necessary events to editor.
        * */
        bindEvents: function () {
            var O = this;

            // listen to dom changes inside editor.
            O.utils.domObserver(O.editor, function () {
                console.log('dom changed');

                // CASE: remove div elements, as we never want them.
                O.$editor.find('div').each(function () {
                    $(this).contents().unwrap('div');
                });

                // CASE: There must always be a p element present in the editor if its empty.
                if (!O.$editor.children(':not(br)').length) {
                    O.$editor.find('br').remove();
                    var $p = O.utils.addLine(O.$editor);
                    O.caret.setPos($p, 0);
                }

                // wrap any orphan text nodes in <p>
               /* $('#editor').contents().each(function(i, e){
                    if($(e).is('br')) $(e).remove();
                    if(e.nodeType == 3 && $(e).text() != ""){
                        var p = $('<p></p>');
                        p.insertBefore(e);
                        p.append(e)
                    }
                });
               */

            });

            // toolbar click handler.
            O.$toolbar.on('click', function () {
                //O.utils.modal();
            })

            // handle key presses.
            O.$editor.on('keydown', function (e) {
                // flag to e.preventDefault();
                var pd = !1;

                if (e.ctrlKey) {
                    pd = O.ctrlKeyPress(e);
                }
                else if (e.keyCode === 8) {
                    pd = O.backSpacePress();
                }
                else if (e.keyCode === 13 && e.shiftKey !== true) {
                    pd = O.breakLine();
                }
                else if (e.keyCode == 27){ // escape key
                    //O.utils.modal();
                }

                if(pd) {
                    e.preventDefault();
                    return !1;
                }

            });

            // input is triggered when actually some text is written to textbox.
            O.$editor.on('input', function (e) {
                O.history.add();
            })

            // caret position update.
            O.$editor.on('keyup click', function (evt) {

                // close any existing open modals if any.
                O.utils.modal();

                O.highlighter();
            });

/*            // keypress event is triggered only when some content changes (not for special keys).
            O.$editor.on('keypress', function(){
                //O.history.add();
                //O.getContent();
            });*/

            // handle text pasting.
            O.$editor.on('paste', function (e) {
                e.preventDefault();
                var text = e.originalEvent.clipboardData.getData('text/plain').replace(/\n/ig, '<br>');
                // TODO: Replace with insert text atCaretPosition.
                document.execCommand('insertHTML', false, text);
            });
        },

        /*
        * Handle ctrl Key press inside editor.
        * @param {Event} evt the event object passed as argument to handler.
        * @return {boolean} to preventDefault or not.
        * */
        ctrlKeyPress: function (evt) {
            var O = this,
                key = evt.keyCode;
            switch (key) {
            // CASE: handle ctrl + a to fix selection issue.

            case 65:                                    // 'A'
            case 97:                                    // 'a'
                O.selection.selectAll();
                return !0;

            case 90:                                    // 'Z'
            case 122:                                   // 'z'
                O.history.undo();
                evt.stopImmediatePropagation();
                return !0;

            case 89:                                    // 'Y'
            case 121:                                   // 'y'
                O.history.redo();
                evt.stopImmediatePropagation();
                return !0;
            }

            /*if (key == 65 || key == 97) { // 'A' or 'a'
             O.selection.selectAll();
             return !0;
             }*/
        },

        /*
        * Handles keypress for backspace key.
        * @return {boolean} to preventDefault or not.
        * */
        backSpacePress: function () {
            var O = this,
                blk = O.caret.getBlock(1),
                $n = $(blk.node),
                pos = blk.pos,
                pd = !1; // flag to e.preventDefault();
            // handle list concatenation when pressing backspace in between two lists.
            if($n.text() === '' && pos === 0){
            // if(pos === 0){
                if($n.is('li')){
                    // CASE: backspace pressed at the beginning of list item.
                    var n = O.utils.unList($n);
                    O.caret.setPos(n, 0);
                    pd = 1;
                }
                else if (O.utils.joinList($n)){
                    // CASE: Join lists on removal of blank line between two lists.
                    pd = 1;
                }
            }

            // handle removal of elements for which rmOnBkSpace is set.
            if (pos == 0) {
                for (var i = 0; i < O.bkArr.length; i++) {
                    if ($n.is(O.bkArr[i])) {
                        pd=1;
                        var ne = O.utils.replaceTag($n, O.P_TAG);
                        O.caret.setPos(ne, 0);
                    }
                }

            }
            console.log('== backspace pressed == pos: ', pos, '  Node: ', $n.prop('tagName'));
            return pd;
        },

        /*
        * Breaks line at cursor position also handles many scenarios.
        * @return {boolean} to preventDefault or not.
        * */
        breakLine: function () {
            var O = this,
                rng = O.selection.getRange(),
                $curElm = $(rng.end),
                pos = rng.eo,
                $curBElm = $(O.utils.getBlockNode(rng.end)),
                $pivot,
                fPivot = 0, // first $pivot.
                D;

            // Case: Exit from a block (i.e stop recreation on enter).
            // Exception: when, $curBElm is immediate children of editor and is 'p'.
            if($curBElm.text() === '' &&
                !($curBElm.is(O.P_TAG) && $curBElm.parent().is(O.editor))){

                // Case: when there is an empty p inside a li. we need to create a new li.
                if($curBElm.is(O.P_TAG) && $curBElm.parent().is('li')) {
                    var li_ = $curBElm.parent();
                    $curBElm.remove();
                    $curElm = $curBElm = li_;
                    fPivot = {};
                    pos = $curBElm.contents().length - 1;

                } else {
                    // Case: Stop recreation of elements, this time we will skip enter press.
                    var n = O.utils.replaceTag($curBElm, O.P_TAG);
                    O.caret.setPos(n, 0);
                    return !0;
                }
            }

            // split content on caret position.
            if ($curElm[0].nodeType === 3) {
                var txt = $curElm.text(),
                    tb = txt.substring(0, pos),          // text before caret.
                    ta = txt.substring(pos, txt.length); // text after caret.

                if (tb != '' && ta != '') {
                    $curElm.before(document.createTextNode(tb));
                    fPivot = document.createTextNode(ta);
                    D = $curElm;
                }

                if(tb != '' && ta == '') {
                    fPivot = {};  // this serves the purpose of an empty element
                }

            } else {
                /*
                * TODO: Handle case: "if no childNodes exists"
                * - Hopefully this will never occur, but if do just insert a blank textNode.
                * */
                $curElm = $curElm.contents().eq(pos);
            }

            $pivot = $curElm;
            var $n, prevE,
                pars = $curElm.parentsUntil($curBElm);
            pars.push($curBElm[0]);

            // move siblings and parents siblings.
            pars.each(function(i, e){
                $n = $(e).clone().empty();

                var next = (prevE ? prevE : $pivot[0]).nextSibling;
                $n.append(fPivot ? fPivot : $pivot);

                while (next) {
                    var t = next.nextSibling;
                    $n.append(next);
                    next = t;
                }

                $pivot = $n;
                prevE = e;
                fPivot = 0;
            });

            // it will be good to remove obsolete nodes at last.
            D?D.remove():0;
            $curBElm.after($n);

            O.utils.setBlank($curBElm);
            O.utils.setBlank($n);

            //Case: if there is a similar list after this li, then merge it.
            if($n.is('li') && $n.is(':last-child')){
                var x, $l = $n.parent().next();
                if($l.is('ol') || $l.is('ul')){
                    // creating a temp node for sake of calling joinList.
                    x = $('<' + O.P_TAG +'>');
                    $l.before(x);
                    O.utils.joinList(x);
                }
            }

            O.caret.setPos($n, 0); 

            return !0;
        },

        /*
        * handles the highlighting of buttons on the toolbar. Can be called
        * anytime to set the states of buttons on toolbar.
        * Triggers a callback high() with element that button corresponds to.
        * */
        highlighter: function() {
            var O = this,
                rng = O.selection.getRange(),
                /*
                * highlight the button corresponding to given key.
                * @param {string} k the tagName/cssProperty.
                * @param {Element} e the element of selection.
                * */
                highFn = function (k, e) {
                    var def = O.REG_BUTTONS[k.toUpperCase()];
                    if(def){
                        // add highlighting.
                        def.btn.addClass('high')
                        O.HIGH_BUTTONS.push(def);
                        if(def.high)def.high.call(O, e);
                        if(def.setMnu)def.setMnu();
                    }
                };

            // remove highlighting.
            O.HIGH_BUTTONS.forEach(function(def){
                def.btn.removeClass('high');
                if(def.setMnu)def.setMnu(1);
            });

            $(rng.end).parents().each(function(_, e) {
                // matching on base of applied css styles
                var s = $(e).attr('style');
                if(s){
                    s.replace(/ /g , '').split(';').forEach(function (x) {
                        highFn(x, e);
                    })
                }

                highFn(e.tagName, e);
            })
        },

        /*
         * block: {string} valid name of tag to create
         */
        toggleBlock: function (block) {
            // there may be discrepancy in selected nodes. as some of them may already be
            // wrapped and some may not. So we use the state of first element to change
            // the state of selection.
            var O = this, r = null;

            // set default value if not supplied.
            block = block || O.P_TAG;

            O.selection.eachBlock(function (mE) {
                mE = $(mE);
                r = r == null ? mE.is(block) : r;
                var elem;
                if (r) {
                    // begin removing the block.
                    elem = O.utils.replaceTag(mE, O.P_TAG);
                    O.utils.setBlank(elem);
                }
                else {
                    console.log('inserting element');

                    // # NESTING
                    if (mE.is('li')) {
                        elem = $('<' + block + '>');
                        elem.append(mE.contents());
                        mE.append(elem);
                    }
                    else {
                        elem = O.utils.replaceTag(mE, block);
                    }
                }

                return elem[0];
            });
            // O.setCursorAtPos(elem, pos);

            // return newly created element.
            return null;
        },

        /*
         * @param: {string} valid name of an inline tag to create.
         * @param: {Array} style an array with css attribute and its value as two items.
         */
        toggleInline: function (tag, style) {
            var O = this,
                an = null, // flag to apply uniform operation on the selection.
                Tag = '<' + tag + '>',
                addStyle = function (n) {
                    O.utils.css($(n),style[0], style[1]);
                };
                // Tag = '<a href="http://good.com">';

            O.selection.eachInline(function (n) {
                var first = n[0],
                    last = n[n.length - 1],
                    m = O.utils.ancestorIs(first, tag),
                    _m = m,
                    css = !1;

                // whether wrap or unwrap is decided by "m".
                if(style){
                    if(m){
                        var c = style[0].toUpperCase();
                        css = O.utils.getStyle(m);
                        // if given element does not exists exactly after matching css rules.
                        if(style[1] && !(c in css && css[c] === style[1].toUpperCase())){
                            m = false
                        }
                    }
                    else{
                        // if not already wrapped and value is false(default value) do nothing.
                        if(!style[1]) return n;
                    }
                }

                an = an == null ? m : an;

                // unwrap selection.
                if (an && m) {
                    var tN = O.utils.textNodes(m),
                        end = tN.indexOf(first) - 1;

                    // for left side.
                    if (end >= 0) {
                        var nods = O.utils.textNodesWithin(tN[0], tN[end]);
                        nods.forEach(function (x) {$(x).wrapAll(m.cloneNode());})
                    }

                    // now for right side.
                    var start = tN.indexOf(last) + 1;
                    if (start <= tN.length - 1) { // both start and end are equal and no need to wrap.
                        nods = O.utils.textNodesWithin(tN[start], tN[tN.length - 1]);
                        nods.forEach(function (x) {$(x).wrapAll(m.cloneNode());})
                    }

                    // handle multiple styles scenario here.
                    // do not directly remove the tag. first check if some of the styles are required there.
                    if(css){
                        var _s = '';
                        delete css[style[0].toUpperCase()];
                        for(var k in css){
                            _s += k + ':' + css[k] + ';'
                        }
                        if(_s){
                            $(n).wrapAll(m.cloneNode());
                            n[0].parentNode.setAttribute('style', _s.toLowerCase());
                        }
                    }

                    $(m.childNodes[0]).unwrap();
                }

                // wrap or update style of selection.
                if (!an && !m) {
                    //this check provides the update of styles.
                    if(!(_m && n.length === _m.childNodes.length))
                        $(n).wrapAll(Tag);
                    if(style)addStyle(n[0].parentNode);
                }

                return n;
            });
        },

        /*
        * Toggles a css property on selected block elements.
        * @param {string} key a css property to apply.
        * @param {!string} val a css property value to apply.
        **/
        toggleStyle: function(key, val){
            var O = this;

            O.selection.eachBlock(function (mE) {
                mE = $(mE);
                // debugger;

                if (!val) {
                    // remove the style
                    O.utils.css(mE, key, '');
                }
                else {
                    O.utils.css(mE, key, val);
                }

                return mE[0];
            });

        },

        /*
        * Toggles indentation of contents. also takes care of indentation in lists.
        * @param {number} val the value of margin to increase or decrease.
        * */
        toggleIndent: function(val){
            var O = this,
                sel = O.selection.getBlocks(),
                rng = sel.rng,
                /*
                * A boolean to tell if selection starts or ends on a non list node.
                * we do not nest lists until selection is strictly inside a list(ul/ol).
                * */
                tb = $(sel.nodes[0]).is('li') && $(sel.nodes[sel.nodes.length - 1]).is('li');

            // indent on first list item should add margin to selection.
            if (tb) tb = $(sel.nodes[0]).is('li') && sel.nodes[0].previousSibling;

            sel.nodes.forEach(function (E) {
                var $E = $(E),
                    key = 'margin-left',
                    margin = O.utils.getStyle($E[0])[key.toUpperCase()];
                margin = margin? parseInt(margin.substr(0, margin.length-2)):0;
                margin += val;

                if (margin >= 0) {
                    if(tb && $E.is('li')){
                        // indent list. make this li a sub-list of previous li.
                        var l = $E.prev().children().last(),
                            lst = (l.is('ul') || l.is('ol'))? l:0;
                        lst = lst || $E.parent().clone().empty();
                        $E.prev().append(lst.append($E));
                    }
                    else {
                        O.utils.css($E, key, margin + 'px');
                    }
                }
                else {
                    if($E.is('li')){
                        // unindent list if its nested in a li
                        var $l = $E.parent(), // ul or ol
                            el = $l.parent(),
                            fc = function(){
                                el.after($E);
                                $E.append($l);
                            };

                        if(el.is('li')){
                            if($E.is(':first-child')){
                                fc()
                            }
                            else if($E.is(':last-child')){
                                el.after($E);
                            }
                            else{
                                // create a new list for previous $li's before l
                                $l.before($l.clone().empty().append($E.prevAll().get().reverse()));
                                // now run the logic for first-node
                                fc()
                            }
                            $l.children().length?0:$l.remove();
                        }
                    }
                    else{
                        O.utils.css($E, key, '');
                    }
                }
            });

            O.selection.setRange(rng);
        },

        /*
        * Handles add/removal of lists
        * @param {string('ul'| 'ol')} list the list node.
        * */
        listHandler: function (lst){
            var r = null, O = this;

            O.selection.eachBlock(function(el){

                // el is the closest block element.
                // first try to pick closest li if exists else take el
                var $elm,
                    $el = $(O.utils.ancestorIs(el, 'li') || el);
                r = r == null ? $el.parent().is(lst) : r;

                if(r){
                    // removing lst
                    $elm = O.utils.unList($el);
                }
                else{
                    // adding lst.
                    $elm = O.wrapList(lst, $el);
                }

                return $elm[0];
            });
        },

        /*
        * handles links
        * */
        linkHandler: function () {
            var O = this,
                R = O.selection.getRange(),
                isPoint = R.start === R.end,

                // modal markup.
                txt = '<p><label for="sumo_lnk_txt">Text</label><span><input name="sumo_lnk_txt" id="sumo_lnk_txt" placeholder="Display text" type="text"/></span></p>',
                $c = $((isPoint ? txt : '') +
                    '<p><label for="sumo_lnk">Link</label><span><input name="sumo_lnk" id="sumo_lnk" placeholder="http://quesapp.com" type="text"/></span></p>' +
                    '<p><span class="_lst"><label class="sumo-chbox"><input id="sumo_chkbx" name="sumo_chkbx" type="checkbox"/><span></span>New tab</label></span>' +
                    '<input id="sumo_submit" type="submit" value="Apply"/></p>'),

                _submit = $c.find('#sumo_submit'),
                _lnk_txt = $c.find('#sumo_lnk_txt'),
                _lnk = $c.find('#sumo_lnk'),
                _chkbx = $c.find('#sumo_chkbx'),

                setA = function ($a, D) {
                    $a.attr('href', D.sumo_lnk);
                    if (D.sumo_chkbx) {
                        $a.attr('target', '_blank')
                    }
                    else {
                        $a.removeAttr('target')
                    }
                },
                btnV = function(){
                    _submit[0].disabled = (!_lnk_txt.length)? !_lnk.val() : !(_lnk_txt.val() && _lnk.val());
                };

            // if already in <a> but point selection.
            var _a = O.utils.ancestorIs(R.end, 'a')
            if(R.start === R.end && _a){
                _a = $(_a);
                O.utils.modal($c, function (D) {
                    _a.text(D.sumo_lnk_txt);
                    setA(_a, D);
                });
                _lnk_txt.val(_a.text());
                _lnk.val(_a.attr('href'));
                _chkbx[0].checked= _a.attr('target');
            }
            else {
                if (isPoint) {
                    _lnk_txt.val(R.start.textContent.substr(R.so, R.eo - R.so));
                }
                O.utils.modal($c, function (D) {
                    var an = null,   // flag to apply uniform operation on the selection.
                        obj = O.selection.textNodes(R), // preserve the selection.
                        $tag = $('<a>');

                    O.selection.eachInline(function (n) {
                        var first = n[0],
                            a = O.utils.ancestorIs(first, 'a');
                        an = an == null ? a : an;

                        // wrap selection.
                        var $a = $(a);
                        if (!an && !a) {
                            $(n).wrapAll($tag);
                            $a = $(n).parent();
                            if (isPoint) {
                                $a.text(D.sumo_lnk_txt);
                                n = $a.contents();
                            }
                        }

                        setA($a, D);
                        return n;
                    }, obj);
                });
            }

            // validation on links, empty links are not allowed.
            _lnk.on('input', btnV);
            _lnk_txt.on('input', btnV);
            btnV();
        },

        /*
        * hover of link tag
        * */
        linkOver: function (e) {
            var O = this,
                $e = $(e),
                lnk = $e.attr('href'),
                $c = $(
                    '<p class="sumo_link_hover">Link<i>|</i>' +
                    '<a target="_blank" href="'+lnk+'">'+ lnk +'</a><i>|</i></p>'
                ).append([
                    // edit button
                    $('<a>Edit</a>').on('click', function(){
                        O.utils.modal();
                        O.linkHandler();
                    }),
                    '<i>|</i>',
                    // remove link button
                    $('<a>Remove</a>').on('click', function(){
                        O.utils.modal();
                        $e.contents().unwrap();
                    })
                ]);

            O.utils.modal($c, function (D) {
                console.log('submited.')
            });
        },

        imgHandler: function () {
            var O = this,
                $c = $('<p><label for="sumo_img_url">URL</label><span><input name="sumo_img_url" id="sumo_img_url" placeholder="Image url here..." type="text"/></span></p>' +
                    '<p><label for="sumo_title">Title</label><span><input name="sumo_title" id="sumo_title" placeholder="Description for image" type="text"/></span></p>' +
                    '<p><input id="sumo_submit" type="submit" value="Insert"/></p>'),
                _img_url = $c.find('#sumo_img_url'),
                _submit = $c.find('#sumo_submit');

            O.utils.modal($c, function (D) {
                var $img = $('<img>');
                $img.attr('src', D.sumo_img_url);
                D.sumo_title?$img.attr('alt', D.sumo_title):0;
                O.selection.insertNode($img);
            });

            // validation on url, empty images are not allowed.
            var btnV = function(){
                _submit[0].disabled = !_img_url.val();
            };
            _img_url.on('input', btnV);
            btnV();
        },

        /*
        * Wraps/replace an element($el) to list.
        * @param {string} lst the list element can be 'ol' or 'ul'
        * @param {jQuery Element} $el the node to wrap/replace.
        * @return {jQuery Element} the newly crated list element
        * */
        wrapList: function(lst, $el) {

            // if there is already a list of different type. then just change the type.
            if ($el.is('li')){
                this.utils.replaceTag($el.parent(), lst);
                return $el;
            }

            var $li = $('<li>').append($el.contents());

            // if there is a ul/ol already before/after append to existing list.
            // Set priority accordingly.
            if ($el.prev().is(lst)) {
                $el.prev().append($li);
                this.utils.joinList($el); // :P just fits here.
            }
            else if ($el.next().is(lst)) {
                $el.next().prepend($li);
            }
            else {
                $el.before(
                    $('<' + lst + '>').append($li)
                );
            }
            
            this.utils.copyStyle($el, $li);
            $el.remove();
            return $li
        },

        /*
        * Gets the markup inside editor.
        * Also sets the class blank to editor.
        * @return {string}
        * */
        getContent: function () {
            var $e = this.$editor,
                x = $e.text(),
                txt = x === '' ? '' : $e.html();

            this.$e.text(txt);

            // handle placeholder.
            $e.toggleClass('blank', !x);
            return txt;
        },

    }

    /*
    * Selection module - contains all selection related methods.
    * */
    Editor.prototype.selection = {
        /*
        * Keeps history of selection, useful when for situations like handling selection outside editor.
        * */
        prevRng: null,

        /*
        * Gets the block nodes in the selection.
        * these nodes will be more close to the content.
        * @returns {{nodes: Array.<Element>, range: Object.<Range Object>}}
        * */
        getBlocks: function () {
            var o = this,
                rng = o.getRange(),
                start = o.O.utils.getBlockNode(rng.start),
                end = o.O.utils.getBlockNode(rng.end),
                stNode = o.O.utils.getRootNode(start),
                enNode = o.O.utils.getRootNode(end),

                // checks if given node is block or not.
                isB = function (n) {
                    return n.tagName && o.O.BLOCK_ELEMENTS[n.tagName.toUpperCase()]
                },

                srr = [],
                /*
                * recursively collect all block nodes after start, until end is not found.
                * @param {Element} n the starting node.
                * @return {Boolean} whether end is found or not.
                */
                startF = function(n){
                    if(isB(n)) {
                        srr.push(n);
                    } else{
                        // if next node is not a block node then take the parent directly.
                        srr = [];
                        return startF(n.parentNode);
                    }
                    if(n === end) return 1;
                    if(n === stNode) return 0;

                    while(!n.nextSibling){
                        n = n.parentNode;
                        if(n === end) return 1;
                        if(n === stNode) return 0;
                    }
                    n = n.nextSibling;

                    return startF(n);
                },

                err = [],
                endF = function(n){
                    if(isB(n)){
                        err.push(n);
                    } else{
                        err = [];
                        return endF(n.parentNode);
                    }
                    if(n === start) return 1;
                    if(n === enNode) return 0;

                    while(!n.previousSibling){
                        n = n.parentNode;
                        if(n === start) return 1;
                        if(n === enNode) return 0;
                    }
                    n = n.previousSibling;

                    return endF(n);
                };

            // if end is not found.
            if(!startF(start)){
                // if start was found while traversing from end.
                if(endF(end)){
                    srr = err.reverse();
                }
                else{
                    var piv = stNode.nextSibling;
                    while (piv != enNode) {
                        if(['OL', 'UL'].indexOf(piv.tagName.toUpperCase())>=0){
                            srr = srr.concat(piv.children);
                        }
                        else{
                            srr.push(piv);
                        }
                        piv = piv.nextSibling;
                    }
                    srr = srr.concat(err)
                }

            }

            return {
                nodes: srr,
                rng: rng
            };
        },

        /*
        * gets the text nodes within selection, this splits the intersecting nodes.
        * @param {Object<rng>} rng object.
        * @return {Array<Array<Element>>} the array of textNodes within the selection.
        * */
        textNodes: function(rng){
            var o = this,
                ep = 0,
                nods = o.O.utils.textNodesWithin(rng.start, rng.end),
                R = rng,
                start = nods[0][0],
                n = nods[nods.length - 1],
                end = n[n.length - 1],
                sl = R.start === R.end; // single line selection
            if(sl && start.nodeType === 3 /* it can be <br> tag (handle insertion in a blank <p>)*/
                && R.so === R.eo && $(R.start).text().length === R.eo){
                ep = 1;
            }

            // only <br> tags can appear here but it will be handled by splitTextNode.
            R.start = nods[0][0] = o.O.utils.splitTextNode($(start), R.so)[1];
            if (sl) {
                end = R.start;
                R.eo = R.eo - R.so;
            }
            R.end = n[n.length - 1] = o.O.utils.splitTextNode($(end), R.eo)[0];
            R.so = 0;
            if (sl) {
                R.start = R.end
            }

            // if selection is collapsed we need a blank text node for manipulation.
            // REF: https://stackoverflow.com/questions/4063144/setting-the-caret-position-to-an-empty-node-inside-a-contenteditable-element
            if(sl && R.so == R.eo){
                var t = document.createTextNode('\u200B');
                ep ? $(R.end).after(t): $(R.end).before(t);
                nods = [[t]];
                R.start = R.end = t;
                // we will keep that empty text selected, so when user starts typing it will be removed.
                R.eo = 1;
            }

            return {
                nods: nods,
                rng: R
            }
        },

        /*
        * Get selection.
        * @return {Object} the selection object.
        */
        obj: function () {
            var s = window.getSelection;
            if (s) {
                return s();
            } else {
                //TODO: handle fallback.
                alert('Shitty browser! does not support window.getSelection');
            }
        },


        /*
        * Aliased for range
        * @returns Object.<rng> a custom range object.
        * */
        getRange: function(){

            var sel = this.obj(), rng, r;
            if (sel.rangeCount) {
                r = sel.getRangeAt(0).cloneRange(),
                /*
                 * @type {{
                 *   start: Object.<DOM Node>, so: number,
                 *   end: Object.<DOM Node>, eo: number,
                 *   r: Object.<Range object>
                 *  }}
                 *  a custom interpretation of range object
                 * */
                rng = {
                    start: r.startContainer,
                    end: r.endContainer,
                    so: r.startOffset,
                    eo: r.endOffset,
                    r : r
                };
            }
            else{
                rng = this.prevRng;
            }

            // if any of the ends are outside of editor container use previous rng.
            if(!this.isInside(rng.start) || !this.isInside(rng.end)){
                console.log('Selection was outside! Rng restored');
                rng = this.prevRng;
                /*var cn = this.O.editor.childNodes;
                rng.start = rng.end = cn[cn.length-1];
                // usually rng.end should not be a text node but just a sanity check,
                rng.so = rng.eo = rng.end.nodeType == 3 ? rng.end.length : rng.end.childNodes.length;
                */
            }

            this.prevRng = rng;
            return rng;
        },

        /*
        * sets a selection in editor specified by given range.
        * @param Object.<rng>
        * */
        setRange: function(rng){
            var sel = this.obj(),
                range = document.createRange();
            range.setStart(rng.start, rng.so);
            range.setEnd(rng.end, rng.eo);
            sel.removeAllRanges();
            sel.addRange(range);
        },

        /*
        * Iterates over block elements, while preserving the selection.
        * @param {Callback} modify A callback function. it will be called for each
        *     Block element with Element as param. this callback function will have to return
        *     the newly created Element if any, or the same element passed as an argument.
        * */
        eachBlock: function (modify) {
            var sel = this.getBlocks(),
                rng = sel.rng;

            $.each(sel.nodes, function (i, n) {
                var created = modify(n);

                // if we have modified selection containers update them.
                if(n == rng.start)
                    rng.start = created;
                if(n == rng.end)
                    rng.end = created;
            });

            this.setRange(rng);
        },

        /*
        * Iterates over selected text nodes, while preserving the selection.
        * @param {Callback} modify A callback function. it will be called for each
        *     line with line as array of nodes(text and BR mostly) as param.
        *     this callback function will have to return the newly created Element
        *     if any, or the same element passed as an argument.
        * @param {Object=} obj the textNodes object
        * @return {Array{Array[Elements]}} an array of text nodes in the selection.
        * */
        eachInline: function (modify, obj) {
            var o = this, R;
            if(!obj) {
                R = o.getRange();
                obj = o.textNodes(R);
            }

            if(modify) {
                R = obj.rng
                // var isPoint = R.start === R.end && R.so === R.eo;

                $.each(obj.nods, function (i, n) {
                    // must return the nodes whether modified or not.
                    var cr = modify(n);

                    // if we have modified selection containers update them.
                    if (n[0] == R.start)
                        R.start = cr[0];
                    if (n[n.length - 1] == R.end) {
                        R.end = cr[cr.length - 1];
                        R.eo = R.end.textContent.length
                    }
                });
                o.setRange(R);
            }

            return obj.nods;
        },

        /*
        * Checks if given node is inside the editor or not
        * */
        isInside: function (node) {
            return this.O.editor == node || $.contains(this.O.editor, node);
        },

        /*
        * Selects all text inside editor.
        * */
        selectAll: function () {
            var txts = this.O.utils.textNodes(this.O.editor);
            if (txts.length > 0) {
                var last = txts[txts.length - 1];
                this.setRange({
                    start: txts[0],
                    end: last,
                    so: 0,
                    eo: last.length
                });
            }
        },

        /*
        * Returns the coordinates for current caret position.
        */
        getCoords: function () {
            var o = this,
                r = o.getRange().r,
                ed = o.O.$wrapper.offset(),

                rect,
                el = $('<span>'),
                sc = r.startContainer;
                // $(r.startContainer.childNodes[0]).offset()
            if (r.getBoundingClientRect){
                rect = r.getBoundingClientRect();

                // handle case when getBoundingClientRect returns invalid values for empty lines (assuming there
                // will be a <br> tag present in every empty line.)
                rect = (rect.top === 0 && sc.childNodes[0]) ? $(sc.childNodes[0]).offset(): {
                    top: rect.top + pageYOffset,
                    left: rect.left + pageXOffset
                }
            }
            else {
                /*TODO: remove this fallback and set to center using css. */
                // fallback to element creation.
                if(r.startOffset) {
                    el.append('\u200b');
                    r.insertNode(el[0]);
                    rect = el.offset();
                    var p = el.parent()[0];
                    el.remove();

                    // Glue any broken text nodes back together
                    p.normalize();
                }
                else{ // avoid node change on corners.
                    el = sc.childNodes[0] || sc.previousSibling || sc.parentNode;
                    rect = $(el).offset();
                }
            }

            return {x: rect.left - ed.left, y: rect.top - ed.top};
        },

        /*
        * Inserts a node at the caret position, also removes the selected nodes if any.
        * @param {jQuery Element} $e the element to insert.
        * */
        insertNode: function ($e) {
            var o = this,
                nods = o.eachInline();

            $(nods[0][0]).before($e);

            // remove the selected nodes.
            nods.forEach(function (n) {
                o.O.utils.removeNodes(n);
            });

            // o.O.caret.setPos($e,0);
            o.obj().selectAllChildren($e[0]);

            // we should also create history here.
            o.O.history.add();
        }

    },

    /*
    * Module contains Caret related methods.
    * */
    Editor.prototype.caret = {

        /*
        * @param {boolean=} pos whether to return position of caret wrt block node. default is false.
        * @returns {Object} the closest block node to cursor.
        * */
        getBlock: function (pos) {
            var rng = this.O.selection.getRange(),
                n = this.O.utils.getBlockNode(rng.start);
            if (pos) {
                var p = this.getPos(n, rng);
                /*
                * @typedef {object.<node: <DOM Node>, pos: number>} blk
                * represents a block node and cursor position inside it.
                * */
                return {
                    node: n,
                    pos: p
                }
            }
            else{
                return n;
            }
        },

        /*
        * gets the caret position w.r.t. given node.
        * @param {Object.<DOM Node>} node
        * @param {Object.<>=} rng
        * @returns {number} caret position.
        * */
        getPos: function (node, rng) {
            rng = rng || this.O.selection.getRange();
            var c = rng.so,
                s = rng.start;

            if (node == s || $(node).find(s).length > 0) {
                while (s) {
                    if (node == s) break;

                    if (s.previousSibling) {
                        s = s.previousSibling;
                        c += s.textContent.length;
                    } else {
                        s = s.parentNode;
                        // just a fail safe if anything unpredictable happens to avoid infinite loop.
                        if (s === null) break;
                    }
                }
            }
            return c;
        },

        /*
        * Sets the caret position wrt to a given element and at given offset.
        * @param {jQuery Element} $E
        * @param {number} pos The position offset.
        * */
        setPos: function ($E, pos) {
            var o = this;

            // special case: when setting position wrt to editor container, set at the first text node.
            if($E[0] === o.O.editor && pos === 0){
                var nods = o.O.utils.textNodes($E[0]);
                $E = $(nods[0]);
            }

            var rngObj = function(e, p){
                    return {start: e, so:p, end: e, eo: p}
                },
                createRange = function (node, c) {
                    var rng;

                    if (c.p === 0) {
                        rng = rngObj(node, c.p);
                    } else if (node && c.p > 0) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            if (node.textContent.length < c.p) {
                                c.p -= node.textContent.length;
                            } else {
                                rng = rngObj(node, c.p);
                                c.p = 0;
                            }
                        } else {
                            for (var lp = 0; lp < node.childNodes.length; lp++) {
                                rng = createRange(node.childNodes[lp], c);

                                if (c.p === 0) {
                                    break;
                                }
                            }
                        }
                    }
                    return rng;
            };

            if (pos >= 0) {
                var rng = createRange($E[0], {p:pos}, {});
                if(!rng)debugger;
                o.O.selection.setRange(rng); 
            }
        }
    };

    /*
    * Utility function goes here.
    * */
    Editor.prototype.utils = {

        /*
        * Sets the empty character(<br>) in a blank line.
        * @param {jQuery Element} row element
        * */
        setBlank: function ($e) {
            if ($e.text() === '') {
                while($e.children().length > 0){
                    $e = $e.children().first();
                }

                $e.html('<br/>');
            }
        },

        /*
        * replace the tag name of node.
        * @param {jQuery Element} n jQuery dom node.
        * @param {string} t the new node name.
        * @returns {jQuery Element} then new DOM node.
        * */
        replaceTag: function ($n, t) {
            if($n.is(t)) return $n;
            if($n.is('li')) {
                return this.unList($n);
            }

            var $m = $('<'+ t + '>');
            $m.html($n.contents());
            $n.after($m);
            this.copyStyle($n, $m);
            $n.remove();
            return $m;
        },

        /*
        * copy style attribute form source to destination.
        * @param: {jQuery Element} $s the source node
        * @param: {jQuery Element} $s the target node
        */
        copyStyle: function($s, $d){
            var s = $s.attr('style');
            if(s && s.trim()){
                $d.attr('style', s);
            }
        },

        /*
        * Removes given list item from list and put its content in an appropriate container.
        * @param {jQuery Element} li the jQuery instance of list item.
        * @param {string} t new tag to move content to.
        * @returns {jQuery Element} The newly created DOM Element.
        * */
        unList: function ($li) {

            var elem = this.extractContent($li),
                $lst = $li.parent();

            // handling list split when cursor is on non edge $li.
            if ($li.is(':first-child')) {
                $lst.before(elem);
            }
            else if ($li.is(':last-child')) {
                $lst.after(elem);
            }
            else {
                // create a new list for previous $li's
                $lst.before(
                    $lst.clone().empty().append($li.prevAll().get().reverse())  // :D Love jQuery.
                );
                $lst.before(elem);
            }

            $li.remove();
            if (!$lst.children().length) {
                $lst.remove();
            }

            // just pass last node, hopefully.
            return $(elem[elem.length - 1]);
        },

        /*
        * Join two same type of lists that are separated by a blank line.
        * @param {jQuery Element} $n the node between two lists.
        * @returns {boolean} status if lists joined or not
        * */
        joinList: function ($n) {
            if (($n.prev().is('ol') && $n.next().is('ol')) ||
                    ($n.prev().is('ul') && $n.next().is('ul'))) {
                var $prv = $n.prev(),
                    $nxt = $n.next(),
                    $li = $prv.children().last();

                $prv.append($nxt.children());
                $nxt.remove();
                $n.remove();

                this.O.caret.setPos($li, $li.text().length);
                return !0;
            }
            return !1;
        },

        /*
        * gets a parent block element(elements in object BLOCK_ELEMENTS) OR
        * immediate children of editor containing node.
        * @param {Object=} node parent DOM block node.
        * @returns {Object.<DOM Element>}
        * */
        getBlockNode: function(node) {
            var o = this,
                _node = null,
                parents = $.merge([node], $(node).parentsUntil(this.O.editor));

            $.each(parents, function (i, e) {
                // ignore text nodes.
                if(e.nodeType == 3) return;
                if (o.O.BLOCK_ELEMENTS[e.tagName.toUpperCase()]) {
                    _node = e;
                    return false;
                }
            });
            return _node || parents[0];
        },

        /*
        * gets immediate children of editor containing node.
        * @returns {Element}
        * */
        getRootNode: function(node) {
            return $(node).parentsUntil(this.O.editor).andSelf()[0];
        },

        /*
        * Gets all text nodes inside the given Element `E`
        * @param {Element} E
        * @returns {Array.<Element>} text nodes in in-order traversal.
        * */
        textNodes: function (E) {
            function tNodes(piv, arr){
                var c = piv.childNodes;
                for (var i=0; i<c.length; i++){
                    if (c[i].nodeType === 3) {
                        arr.push(c[i]);
                    } else {
                        arr = tNodes(c[i], arr);
                    }
                }
                return arr
            }
            return tNodes(E, []);
            // TODO: this function can be rewritten using textNodesWithin()
        },

        /*
        * gets textNodes within the given start and end textNodes.
        * @param {Element} start
        * @param {Element} end
        * @return {Array<Array<Element>>} textNodes within start and selection.
        **/
        textNodesWithin: function (start, end) {
            var o = this,
                nodes = [],
                rStart = o.getRootNode(start),
                rEnd = o.getRootNode(end),
                f = 0, // false, a flag to add only elements within the rng.
                gbe = function (nod) {
                    var arr = [], m = 0, C = nod.childNodes;
                    for (var i = 0; i < C.length; i++) {
                        var n = C[i];
                        if (!f && n == start)f = 1; // start adding.

                        if (n.nodeType === 3 || $(n).is('BR')) {
                            if (m == 1) {
                                if (f)arr[arr.length - 1].push(n)
                            }
                            else {
                                if (f) {
                                    arr.push([n]);
                                    m = 1
                                }
                            }
                        } else {
                            m = 0;
                            var arr_ = gbe(n);
                            if (arr_.length) arr = arr.concat(arr_);
                        }

                        if (f && n == end)f = 0; // stop adding.
                    }
                    return arr
                };

            // if its a single textNode.
            if (start === end) {
                // this is to handle the case when there is no textNode inside. push the <br> tag.
                if(start === rStart){
                    nodes.push(start.children)
                } else {
                    nodes.push([start]);
                }
            }
            else {
                while (rStart) {
                    nodes = nodes.concat(gbe(rStart));
                    if (rStart === rEnd) break;
                    rStart = rStart.nextSibling;
                }
            }

            return nodes
        },

        /*
        * Recursively removes a node and its empty parents if any.
        * @param {Array<Element>} n array of nodes to be removed.
        * */
        removeNodes: function (n) {
            var o = this,
                f = function (n) {
                    if(n[0].parentNode != o.O.editor && n[0].parentNode.childNodes.length === n.length){
                        f([n[0].parentNode]);
                    }
                    else {
                        $(n).remove();
                    }
                };
            f(n);
        },

/*        /!*
        * For now only text nodes are supported and they should be in line.
        * @param {Element} start
        * @param {Element} end
        * @param {staring} tag
        * @return <jQuery Element> the newly wrapped element.
        * *!/
        wrapNodes: function (start, end, tag) {
            var $e = $('<' + tag + '>'),
                n = start === end ? start : this.textNodesWithin(start, end)[0];
            $(n).wrapAll($e);
            return $e;
        },*/

        /*
        * checks if `tag` is `e` or is an ancestor of `e`
        * @param {Element} e
        * @param {string} tag
        * @returns {boolean||Object.<Element>} false if ancestor not found else returns ancestor.
        * */
        ancestorIs: function (e, tag) {
            while(e && e != this.O.editor){
                if(e.nodeType !==3 && e.tagName.toUpperCase() === tag.toUpperCase()){
                    return e;
                }
                e = e.parentElement;
            }
            return !1;
        },

        /*
        * Make content safe inside the given tag, so it can be unwrapped.
        * Mainly it wraps textNodes in a <p> element.
        * @param {Object.<jQuery DOM element>} $n
        * @returns {Array.<elements>}
        * */
        extractContent: function ($n) {
            var o=this, elms = [], p=0;
            $n.contents().each(function(_, e){
                if((e.nodeType === 3 && e.textContent) || !o.O.BLOCK_ELEMENTS[e.tagName.toUpperCase()]){
                    p = p || $('<p>');
                    p.append(e);
                } else {
                    if(p) elms.push(p[0]);
                    p = 0;
                    elms.push(e);
                }
            });
            if(p) elms.push(p[0]);
            return elms;
        },

        /*
        * Basic markup sanity over the content of given element.
        * @param {jQuery Element} $e the element to sanitize.
        * */
        sanitizeContent: function ($e) {
            var c = this.extractContent($e);
            $e.empty().append(c);
        },

        /*
        * Observes a dom element for changes.
        * @param {Element} elm the DOM node to watch
        * @param {function} cb A callback function.
        * */
        domObserver: function (elm, cb) {
            // REF: https://stackoverflow.com/questions/3219758/detect-changes-in-the-dom#answer-14570614
            var muO, isEvt = window.addEventListener;

            if(this.O.muO)
                muO = this.O.muO;
            else
                muO = this.O.muO = window.MutationObserver || window.WebKitMutationObserver;

            if (muO) {
                // define a new observer
                var obs = new muO(function (mj) {
                    if (mj[0].addedNodes.length || mj[0].removedNodes.length) cb();
                });
                // have the observer observe foo for changes in children
                obs.observe(elm, {
                    childList: true,
                    subtree: true
                });
            }
            // fallback to back to the deprecated Mutation events
            else if (isEvt) {
                elm.addEventListener('DOMNodeInserted', cb, false);
                elm.addEventListener('DOMNodeRemoved', cb, false);
            }
        },

        /*
        * Insert a new empty line inside the given node
        * @param {jQuery Element} $e
        * @return {jQuery Element} the newly created element.
        * */
        addLine: function ($e) {
            var n = $('<p><br/></p>');
            n.prepend(document.createTextNode(''));
            // n.prepend(document.createTextNode('\u200B'));
            $e.append(n);
            return n;
        },

        /*
        * Splits a text node at given position. Does not splits if p is on edges.
        * @param {jQuery textNode} $t the text node to split.
        * @param {number} p the position to split at.
        * @return {Array<textNode, textNode>} the pair of nodes splited.
        * */
        splitTextNode : function ($t, p) {
            var txt = $t.text();
            if(txt.length === p || p === 0){
                // no need to create text nodes if selection is on the edge.
                return [$t[0], $t[0]]
            }
            var tb = document.createTextNode(txt.substring(0, p)),          // text before caret.
                ta = document.createTextNode(txt.substring(p, txt.length)); // text after caret.

            $t.before(tb);
            $t.before(ta);
            $t.remove()
            return [tb, ta]
        },

        /*
        * Toggles the modal pop up eg. insert link.
        * @params {jQuery Element} $c the dom subtree to display in popup.
        * @param {Callback} cb triggers when form is submitted. passed form data as object.
        * */
        modal: function ($c, cb) {
            var o = this,
                rm = function (m) {
                    m.remove();
                    o.O.$wrapper.off('click.se');
                },
                $m = o.O.$wrapper.find('.sumo-modal');
            if($m.length) {
                rm($m);
                return
            }
            if(!$c)return;

            var $f = $('<form>').on('submit', function (e) {
                e.stopPropagation();
                var D = {};
                $(this).serializeArray().forEach(function(x){
	                D[x.name] = x.value
                })
                if(cb && !cb(D)) rm($m);
                return false;
            });

            $m = $('<div class="sumo-modal">');
            $m.append($f);
            o.O.$wrapper.append($m);
            $f.append($c);
            $f.find('input').first().focus();

            // handle closing of the modal.
            $m.on('keydown', function (e) {
                if (e.keyCode == 27){ // escape key
                    rm($m);
                }
            });
            // disconnect from main thread as, this event will bubble up and in turn call this handler.
            setTimeout(function(){
                o.O.$wrapper.on('click.se', function(e){
                    if(!$.contains($m[0], e.target)) rm($m);
                });
            }, 10)

            // position in center.
            var cord = o.O.selection.getCoords(),
                L = cord.x - $m.outerWidth()/2,
                T = cord.y,
                w = $m.outerWidth(),
                h = $m.outerHeight(),
                ew = o.O.$editor.outerWidth(),
                eh = o.O.$editor.outerHeight(),
                pd = 10,                        // padding Left/right
                tp = T - h - 4;                 // top position.
            if(L < pd){
                L = pd;
            }
            if(L + w > ew - pd){
                L = ew - w - pd;
            }

            // also check if there is no space on top, its better to display modal at the bottom.
            T = (T + h > eh && tp > 1)? tp: T + 22; // 22 is spacing from text

            $m.css({left: L, top: T});
        },

        /*
        * Gets an object of css properties applied on a node
        * @param: {Element} n The element to get styles from.
        * @return: {object} the Object containing applied styles to the node.
        * */
        getStyle: function (n) {
            var S={},
                r,
                styles = n.getAttribute('style');
            if(!styles) return S;
            styles.toUpperCase().split(';').forEach(function(x){
                if(!x.trim()) return;
                r = x.split(':')
                S[r[0].trim()] = r[1].trim();
            });
            return S
        },

        /*
        * Sets a css property.
        * @param: {jQuery Element} $e the element to apply style to.
        * @param: {string} k the css property.
        * @param: {!string} v the value for css property.
        * */
        css: function ($e, k, v) {
            $e.css(k, v);
            !$e.attr('style')?$e.removeAttr('style'):0;
        }
/*        hasStyle: function ($e, key, val) {
            var s = $e.attr('style');
            if(s){

            }
            else{
                return !1;
            }
        }*/
    };

    /*
    * History module provides features like undo/redo on the editor content.
    * */
    Editor.prototype.history = {

        size: 100,
        deb: 100,        // de-bounce time.
        stack: [],       // contains the history.
        ptr: -1,         // holds index of current state.
        T: 0,

        add : function(){
            var o = this,
                c = o.O.getContent(),
                p = o.O.caret.getPos(o.O.editor);
            if(o.ptr >= o.size){
                o.stack.shift();
                o.ptr--;
            }

            clearTimeout(o.T);
            o.T = setTimeout(function(){
                // if(o.stack[o.ptr] != c){ // avoid if content is same as previous.
                if(!o.stack[o.ptr] || o.stack[o.ptr].c != c){ // avoid if content is same as previous.
                    o.stack[++o.ptr] = {c:c, p:p};
                }
            }, o.deb);
        },

        undo: function(){
            var o = this;
            if(o.ptr > 0 ){
                o._set(o.stack[--o.ptr]);
            }
        },

        redo: function(){
            var o = this;
            if(o.ptr < o.stack.length-1) {
                o._set(o.stack[++o.ptr]);
            }
        },

        _set: function (h) {
            var o = this;
            o.O.$editor.html(h.c);
            o.O.caret.setPos(o.O.$editor, h.p);
        }
    };

    /*
    * All the toolbar button definition goes here.
    * */
    Editor.prototype.buttons = {
        quote: function () {
            return {
                ico: 'quote',
                typ: 'block',
                tag: 'blockquote',
                rmOnBkSpace: true,    // force remove this tag on backspace.
                onclick: function () {
                }
            }
        },
        code:function () {
            return {
                ico: 'code',
                typ: 'block',
                tag: 'code',
            }
        },
        ol: function () {
            var O = this;
            return {
                ico: 'ol',
                tag: 'ol',
                onclick: function () {
                    O.listHandler('ol');
                }
            }
        },
        ul: function () {
            var O = this;
            return {
                ico: 'ul',
                tag: 'ul',
                onclick: function () {
                    O.listHandler('ul');
                }
            }
        },
        bold: function () {
            return {
                ico: 'bold',
                typ: 'inline',
                tag: 'strong'
            }
        },
        italic: function () {
            return {
                ico: 'italic',
                typ: 'inline',
                tag: 'em'
            }
        },
        underline: function () {
            return {
                ico: 'underline',
                typ: 'inline',
                tag: 'u'
            }
        },
        strike: function () {
            return {
                ico: 'strike',
                typ: 'inline',
                tag: 's'
            }
        },
        link: function () {
            var O = this;
            return {
                ico: 'link',
                tag: 'a',
                onclick: function () {
                    O.linkHandler();
                },
                high: function (e) {
                    console.log('highlighted a');
                    O.linkOver(e);
                }
                // typ: 'inline',
            }
        },
        img: function () {
            var O = this;
            return {
                ico: 'image',
                tag: 'img',
                onclick: function () {
                    O.imgHandler();

                },
                // high: function (e) {
                //     console.log('highlighted a');
                //     O.linkOver(e);
                // }
                // typ: 'inline',
            }
        },
        indent: function () {
            var O = this;
            return {
                ico: 'indent',
                onclick: function(){
                    O.toggleIndent(40);
                }
            }
        },
        unindent: function () {
        var O = this;
            return {
                ico: 'unindent',
                onclick: function(){
                    O.toggleIndent(-40);
                }
            }
        },
        undo: function () {
            var O = this;
            return {
                ico: 'undo',
                onclick: function(){
                    O.history.undo();
                }
            }
        },
        redo: function () {
            var O = this;
            return {
                ico: 'redo',
                onclick: function(){
                    O.history.redo();
                }
            }
        },
        sub: function () {
            return {
                ico: 'sub',
                typ: 'inline',
                tag: 'sub'
            }
        },
        sup: function () {
            return {
                ico: 'sup',
                typ: 'inline',
                tag: 'sup'
            }
        },

        align: function (val) {
            var O = this;
            return {
                typ: 'style',
                tag: 'text-align:' + val,
                ico: 'align-' + ((!val)? 'left': val),
                mnu: !val,
                onclick: function() {
                    O.toggleStyle('text-align', val);
                }
            }
        },
        size: function (parm) {
            var key, val;
            for (key in parm) {val = parm[key]}

            var O = this,
                style = ['font-size', val];

            return {
                typ: 'style',
                tag: 'font-size:' + val,
                txt: key,
                mnu: !val,
                onclick: function() {
                    O.toggleInline('span', style);
                }
            }
        },
        format: function (parm) {
            var key, val;
            for (key in parm) {val = parm[key]}

            return {
                typ: 'block',
                tag: val,
                txt: key,
                mnu: !val,
            }
        },

        clean:function () {
            var O = this;
            return {
                ico: 'clean',
                onclick: function(){
                    O.selection.eachBlock(function (n) {
                        var $n = $(n),
                            // allowing li for now.
                            $e = $n.is('li')? $('<li>'):$('<p>');

                        $n.before($e);
                        $e.append(O.utils.textNodes(n));
                        $n.remove();
                        return $e[0];
                    });
                }
            }
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

