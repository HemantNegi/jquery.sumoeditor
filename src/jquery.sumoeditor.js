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
        O.editor = O.$editor[0];

        O.$wrapper.append([O.$toolbar, O.$editor]);
    }

    Editor.prototype = {
        defaults: {
            placeholder: 'Start writing here...',
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
                ['quote', 'code'],

                [{'header': 1}, {'header': 2}],               // custom button values
                ['ol', 'ul', 'indent', 'unindent', 'sub', 'sup', 'link'],
                [{'direction': 'rtl'}],                         // text direction

                [{'size': ['small', false, 'large', 'huge']}],  // custom dropdown
                [{'header': [1, 2, 3, 4, 5, 6, false]}],

                [{'color': []}, {'background': []}],          // dropdown with defaults from theme
                [{'font': []}],
                [{'align': []}],

                ['clean']                                         // remove formatting button
            ]
        },

        /*
        * A list of elements which we want to consider block elements (wtf :p)
        * */
        BLOCK_ELEMENTS: {P:1, LI:1, BLOCKQUOTE:1, CODE:1, H1:1, H2:1, H3:1, H4:1, UL:1, OL:1},

        init: function () {
            // Introduce defaults that can be extended either
            // globally or using an object literal.
            this.config = $.extend(this.defaults, this.opts);

            // Array holds the tag names of elements to be removed forcefully on backspace.
            this.bkArr = [];

            // initialize modules.
            this.selection.O = this.caret.O = this.utils.O = this;

            this.setUp();
            this.setToolbar();
            this.bindEvents();

            return this
        },

        /*
        * Setup and sanitize initial content into the editor.
        * */
        setUp: function () {
            var O = this;
            O.$editor.attr('placeholder', O.config.placeholder || O.$e.attr('placeholder'));

            O.$editor.html(O.$e.text());
            O.utils.sanitizeContent(O.$editor);
            if (!O.$editor.children().length ) {
                O.utils.addLine(O.$editor);
            }

            O.getContent();
            /*TODO: Remove this block*/
            O.$wrapper.after(O.$e);
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

        /*
        * create buttons for the toolbar, also binds events and there handlers.
        * @param {Object} def A button definition object (returned form the button object)
        * @return {jQuery Element} the newly created button.
        * */
        createButton: function (def) {
            var O = this,
                btn = $('<button>').addClass('sico-' + def.ico);

            if(def.rmOnBkSpace) this.bkArr.push(def.tag);

            btn.on('click', function (evt) {
                evt.preventDefault();
                evt.stopPropagation();

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

                O.getContent();
            })

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
                O.utils.modal();
            })

            // caret position update.
            O.$editor.on('keyup click', function (evt) {
                // #HISTORY
                // var node = O.getNode().parentsUntil(O.elem).andSelf().first();
                // var n = O.getCursorPos(node);
                // O.currentElement = node;
                // O.cursorPos = n;
                // console.log('pos: ', n, 'node: ', node);
                O.getContent();
                O.utils.modal();
            });

            // handle key presses.
            O.$editor.on('keydown', function (e) {
                // flag to e.preventDefault();
                var pd = !1;

                if (e.ctrlKey) {
                    pd = O.ctrlKeyPress(e.keyCode);
                }
                else if (e.keyCode === 8) {
                    pd = O.backSpacePress();
                }
                else if (e.keyCode === 13 && e.shiftKey !== true) {
                    pd = O.breakLine();
                }
                else if (e.keyCode == 27){
                    O.utils.modal();
                }

                // update contents of underlying actual element.
                O.getContent();

                if(pd) {
                    e.preventDefault();
                    return !1;
                }
            });

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
        * @param {number} key keycode for the pressed key.
        * @return {boolean} to preventDefault or not.
        * */
        ctrlKeyPress: function (key) {
            var O = this;

            // CASE: handle ctrl + a to fix selection issue.
            if (key == 65 || key == 97) { // 'A' or 'a'
                O.selection.selectAll();
                return !0;
            }
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
                        var ne = O.utils.replaceTag($n, 'p');
                        O.caret.setPos(ne, 0);
                    }
                }

            }
            console.log('== backspace pressed == pos: ', pos, '  Node: ', $n.prop('tagName'));
            return pd;
        },

        /*
        * Breaks line at cursor position ans also handles many scenarios.
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
                !($curBElm.is('p') && $curBElm.parent().is(O.editor))){

                // Case: when there is an empty p inside a li. we need to create a new li.
                if($curBElm.is('p') && $curBElm.parent().is('li')) {
                    var li_ = $curBElm.parent();
                    $curBElm.remove();
                    $curElm = $curBElm = li_;
                    fPivot = {};
                    pos = $curBElm.contents().length - 1;

                } else {
                    // Case: Stop recreation of elements, this time we will skip enter press.
                    var n = O.utils.replaceTag($curBElm, 'p');
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

            // it will be good to remove at last.
            D?D.remove():0;
            $curBElm.after($n);

            O.utils.setBlank($curBElm);
            O.utils.setBlank($n);
            O.caret.setPos($n, 0);

            return !0;
        },

        /*
         * block: {string} valid name of tag to create
         */
        toggleBlock: function (block) {
            // there may be discrepancy in selected nodes. as some of them may already be
            // wrapped and some may not. So we use the state of first element to change
            // the state of selection.
            var O = this, r = null;

            var nodes = O.selection.eachBlock(function (mE) {
                mE = $(mE);
                r = r == null ? mE.is(block) : r;
                var elem;
                if (r) {
                    // begin removing the block.
                    elem = O.utils.replaceTag(mE, 'p');
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
         * tag: {string} valid name of an inline tag to create.
         */
        toggleInline: function (tag) {
            var O = this,
                an = null, // flag to apply uniform operation on the selection.
                Tag = '<' + tag + '>';
                // Tag = '<a href="http://good.com">';

            O.selection.eachInline(function (n) {
                var first = n[0],
                    last = n[n.length - 1],
                    m = O.utils.ancestorIs(first, tag);
                an = an == null ? m : an;

                // unwrap selection.
                if (an && m) {
                    var tN = O.utils.textNodes(m),
                        end = tN.indexOf(first) - 1;

                    // for left side.
                    if (end >= 0) {
                        var nods = O.utils.textNodesWithin(tN[0], tN[end], tag);
                        $(nods[0]).wrapAll(Tag);
                    }

                    // now for right side.
                    var start = tN.indexOf(last) + 1;
                    if (start <= tN.length - 1) { // both start and end are equal and no need to wrap.
                        nods = O.utils.textNodesWithin(tN[start], tN[tN.length - 1], tag);
                        $(nods[0]).wrapAll(Tag);
                    }

                    $(m.childNodes[0]).unwrap();
                }

                // wrap selection.
                if (!an && !m) {
                    $(n).wrapAll(Tag);
                }

                return n;
            });
        },

        /*
        * Handles add/removal of lists
        * @param {string('ul'| 'ol')} list the list node.
        * */
        listHandler: function (lst){
            var r = null, O = this;
            
            var nodes = O.selection.eachBlock(function(el){

                // el is the closest block element.
                // first try to pick closest li if exists else take el
                var $elm,
                    $el = $(O.utils.ancestorIs(el, 'li') || el);
                r = r == null ? $el.parent().is(lst) : r;
                // r = r == null ? O.utils.ancestorIs($el, lst) : r;
                // $el = $($el);

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

        linkHandler: function () {
            var O = this,
                an = null, // flag to apply uniform operation on the selection.
                Tag = '<a>';
                // Tag = '<a href="http://good.com">';

            O.selection.eachInline(
                function (n) {
                    var first = n[0],
                        m = O.utils.ancestorIs(first, 'a');
                    an = an == null ? m : an;

                    // wrap selection.
                    if (!an && !m) {
                        $(n).wrapAll(Tag);
                    }

                    return n;
                },
                function () {
                    var $c = '<p><label for="sumo_lnk_txt">Text</label><span><input id="sumo_lnk_txt" placeholder="Display text" type="text"/></span></p>' +
                        '<p><label for="sumo_lnk">Link</label><span><input id="sumo_lnk" placeholder="http://quesapp.com" type="text"/></span></p>' +
                        '<p><span class="_lst"><label class="sumo-chbox"><input type="checkbox"/><span></span>New tab</label></span>' +
                        '<input type="submit" value="Apply"/></p>';

                    O.utils.modal($c);
                }
            );
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
                $c = $e.children(),
                txt = x === '' ? '' : $e.html();

            this.$e.text(txt);
            setTimeout(function(){
                $e.toggleClass('blank', ($c.length < 2 && !$e.text() && $c.first().is('p')));
            },1)
            return txt;
        },

    }

    /*
    * Selection module - contains all selection related methods.
    * */
    Editor.prototype.selection = {
        /*
        * Gets the block nodes in the selection.
        * @returns {{nodes: Array.<Element>, range: Object.<Range Object>}}
        * */
        getBlocks: function () {
            var o = this,
                rng = o.getRange(),
                start = o.O.utils.getBlockNode(rng.start),
                end = o.O.utils.getBlockNode(rng.end),
                nodes = [],
                stNode = o.O.utils.getRootNode(start),
                enNode = o.O.utils.getRootNode(end),
                // recursively gets all the block child nodes of given node.
                gbe = function(nod){
                    var be = [], m = !1, C=nod.childNodes;
                    for(var i=0; i<C.length; i++){
                        var n = C[i];
                        // if any of the child nodes is not a block node then break.
                        if (n.tagName && o.O.BLOCK_ELEMENTS[n.tagName.toUpperCase()]){
                            be.push(n);
                        }
                        else{
                            m = !0;
                            break;
                        }
                    }

                    if(m || !C.length){
                        return [nod]
                    }
                    else{
                        var arr = [];
                        for(var i=0; i<be.length; i++){
                            arr = arr.concat(gbe(be[i]));
                        }
                        return arr;
                    }
                };

            while (stNode) {
                nodes = nodes.concat(gbe(stNode));
                if (stNode === enNode) break;
                stNode = stNode.nextSibling;
            }

            var off = nodes.indexOf(start),
                lim = nodes.indexOf(end) - off + 1;
            return {
                nodes: nodes.splice(off, lim),
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
            if(sl && R.so === R.eo && $(R.start).text().length === R.eo){
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

            var sel = this.obj(),
                range = sel.getRangeAt(0),
                /*
                * @type {{
                *   start: Object.<DOM Node>, so: number,
                *   end: Object.<DOM Node>, eo: number
                *  }}
                *  a custom interpretation of range object
                * */
                rng = {
                    start: range.startContainer,
                    end: range.endContainer,
                    so: range.startOffset,
                    eo: range.endOffset
                };
                    // collapsed = range.collapsed;

                // if any of the ends are outside of editor container.
                // set a collapsed range on last node.
         /*       if(!this.isInside(rng.start) || !this.isInside(rng.end)){
                    var cn = this.O.editor.childNodes;
                    rng.start = rng.end = cn[cn.length-1];
                    // usually rng.end should not be a text node but just a sanity check,
                    rng.so = rng.eo = rng.end.nodeType == 3 ? rng.end.length : rng.end.childNodes.length;
                }*/

                // firefox case: pressing ctrl + a selects editor container also.
                /*
                I think we don't need this check now as we have handled ctrl + A
                if(rng.start == this.O.editor && rng.end == this.O.editor){
                    debugger;
                    var cn = this.O.editor.childNodes;
                    rng.start = cn[0];
                    rng.end = cn[cn.length-1];
                    rng.so = 0;
                    // usually rng.end should not be a text node but just a sanity check,
                    rng.eo = rng.end.nodeType == 3 ? rng.end.length : rng.end.childNodes.length;
                }*/
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
            var sel = this.getBlocks();
            var rng = sel.rng;

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
        * */
        eachInline: function (modify, before) {
            var o = this,
                R = o.getRange(),
                obj = o.textNodes(R),
                R = obj.rng,
                isPoint = R.start === R.end && R.so === R.eo;

            // this will help in preserving selection while prompting the user.
            if(before)before();

            $.each(obj.nods, function (i, n) {
                // must return the nodes whether modified or not.
                var cr = modify(n);

                // if we have modified selection containers update them.
                if (n[0] == R.start)
                    R.start = cr[0];
                if (n[n.length - 1] == R.end)
                    R.end = cr[cr.length - 1];

                // Exceptional: ("\u200B") should be removed so include in selection.
                if(isPoint && R.so == 0){
                    //debugger;
                    R.eo = 1;
                }
            });
            o.setRange(R);
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
        }
    };

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
        * Sets the caret position in a given element and at given offset.
        * @param {jQuery Element} $E
        * @param {number} pos The position offset.
        * */
        setPos: function ($E, pos) {
            // TODO: Needs refactoring this can be implemented by selection apis
            var createRange = function (node, chars, range) {
                if (!range) {
                    range = document.createRange()
                    range.selectNode(node);
                    range.setStart(node, 0);
                }

                if (chars.count === 0) {
                    range.setEnd(node, chars.count);
                } else if (node && chars.count > 0) {
                    if (node.nodeType === Node.TEXT_NODE) {
                        if (node.textContent.length < chars.count) {
                            chars.count -= node.textContent.length;
                        } else {
                            range.setEnd(node, chars.count);
                            chars.count = 0;
                        }
                    } else {
                        for (var lp = 0; lp < node.childNodes.length; lp++) {
                            range = createRange(node.childNodes[lp], chars, range);

                            if (chars.count === 0) {
                                break;
                            }
                        }
                    }
                }

                return range;
            };

            if (pos >= 0) {
                var selection = window.getSelection();

                var range = createRange($E[0], {count: pos});

                if (range) {
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }

        }
    };

    /*
    * Utility function goes here.
    * */
    Editor.prototype.utils = {

        /*
        * Sets the empty character in a blank row.
        * @param {jQuery Element} row element
        * */
        setBlank: function ($e) {
            if ($e.html().trim() === '') {
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

            var $m = $('<'+ t +'>');
            $m.html($n.contents());
            $n.after($m);
            $n.remove();
            return $m;
        },

        /*
        * Removes given list item from list and put its content in an appropriate container.
        * @param {jQuery Element} li the jQuery instance of list item.
        * @param {string} t new tag to move content to.
        * @returns {jQuery Element} The newly created DOM object.
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
            // if (start === end && rng.so === rng.eo) {
            if (start === end) {
                nodes.push([start])
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
            var elms = [], p=0;
            $n.contents().each(function(_, e){
                if((e.nodeType === 3 && e.textContent) || $(e).is('br')){
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
        * */
        modal: function ($c) {
            var o = this,
                $m = o.O.$wrapper.find('.sumo-modal');
            if($m.length) {
                $m.remove();
                return
            }
            if(!$c)return;

            var $j = $('<form>').on('submit', function (e) {
                e.stopPropagation();
                return false;
            });
            $m = $('<div class="sumo-modal">')
            $m.append($j);
            o.O.$wrapper.append($m);
            $j.append($c)
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
                }
                // typ: 'inline',
            }
        },
        indent: function () {
            return {ico: 'indent'}
        },
        unindent: function () {
            return {ico: 'unindent'}
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
        clean:function () {
            return {
                ico: 'clean',
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

