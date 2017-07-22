(function ($, document, window) {
    'use strict';

    /*
     {

     base: {
     ... all core functions go here.
     ... these functions will define the usability(compatibility) of this editor.
     }

     core: {
     ... these functions controls the editing behavior different elements.

     }

     utils: {
     ... these functions are
     }

     }
     */

    function EasyEditor(element, options) {
        this.elem = element;
        options = options || {};
        this.className = options.className || 'easyeditor';

        // 'bold', 'italic', 'link', 'h2', 'h3', 'h4', 'alignleft', 'aligncenter', 'alignright', 'quote', 'code', 'list', 'x', 'source'
        var defaultButtons = ['bold', 'italic', 'link', 'h2', 'h3', 'h4', 'alignleft', 'aligncenter', 'alignright'];
        this.buttons = options.buttons || defaultButtons;
        this.buttonsHtml = options.buttonsHtml || null;
        this.overwriteButtonSettings = options.overwriteButtonSettings || null;
        this.css = options.css || null;
        this.onLoaded = typeof options.onLoaded === 'function' ? options.onLoaded : null;
        this.randomString = Math.random().toString(36).substring(7);
        this.theme = options.theme || null;
        this.dropdown = options.dropdown || {};

        this.attachEvents();
    }

    // initialize
    EasyEditor.prototype.attachEvents = function () {
//        debugger;
        this.bootstrap();
        this.addToolbar();
        this.handleKeypress();
        this.handleResizeImage();
        this.utils();

        var self = this;
        this.currentElement = $('#editor');
        this.cursorPos = 0;
        // store the focus element.
        this.focusHistory = $('#editor');
        $('#editor').parent().children('.easyeditor-toolbar').on('mousedown', 'button', function (event) {
            if ($.contains(self.elem, document.activeElement)) {
                self.focusHistory = $(document.activeElement);
            }
            // we only need to stop this event, rest will be fine.
            event.preventDefault();
            return false;
        });

        if (this.onLoaded !== null) {
            this.onLoaded.call(this);
        }
    };

    // destory editor
    EasyEditor.prototype.detachEvents = function () {
        var self = this;
        var $container = $(self.elem).closest('.' + self.className + '-wrapper');
        var $toolbar = $container.find('.' + self.className + '-toolbar');

        $toolbar.remove();
        $(self.elem).removeClass(self.className).removeAttr('contenteditable').unwrap();
    };

    // Adding necessary classes and attributes in editor
    EasyEditor.prototype.bootstrap = function () {
        var self = this;
        var tag = $(self.elem).prop('tagName').toLowerCase();

        if (tag === 'textarea' || tag === 'input') {
            var placeholderText = $(self.elem).attr('placeholder') || '';

            var marginTop = $(self.elem).css('marginTop') || 0;
            var marginBottom = $(self.elem).css('marginBottom') || 0;
            var style = '';
            if (marginTop.length > 0 || marginBottom.length > 0) {
                style = ' style="margin-top: ' + marginTop + '; margin-bottom: ' + marginBottom + '" ';
            }

            $(self.elem).after('<div id="' + self.randomString + '-editor" placeholder="' + placeholderText + '">' + $(self.elem).val() + '</div>');
            $(self.elem).hide().addClass(self.randomString + '-bind');

            self.elem = document.getElementById(self.randomString + '-editor');
            $(self.elem).attr('contentEditable', true).addClass(self.className).wrap('<div class="' + self.className + '-wrapper"' + style + '></div>');
        }
        else {
            $(self.elem).attr('contentEditable', true).addClass(self.className).wrap('<div class="' + self.className + '-wrapper"></div>');
        }

        // initial sanity.
        $(self.elem).contents().filter(function () {
            return (this.nodeType === 3 && $(this).text().trim() != "")
        }).wrap('<p></p>')
        if (!$('p', self.elem).length && $(self.elem).text().trim() === "") {
            $(self.elem).html('<p><br /></p>');
        }
        $(self.elem).attr('tab-index', '1')

        this.$wrapperElem = $(self.elem).parent();

        if (self.css !== null) {
            $(self.elem).css(self.css);
        }

        this.containerClass = '.' + self.className + '-wrapper';

        if (typeof self.elem === 'string') {
            self.elem = $(self.elem).get(0);
        }

        if (self.theme !== null) {
            $(self.elem).closest(self.containerClass).addClass(self.theme);
        }
    };

    // enter and paste key handler
    EasyEditor.prototype.handleKeypress = function () {
        var O = this;

        // REF: https://stackoverflow.com/questions/3219758/detect-changes-in-the-dom
        var observeDOM = (function () {
            var MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
                eventListenerSupported = window.addEventListener;

            return function (obj, callback) {
                if (MutationObserver) {
                    // define a new observer
                    var obs = new MutationObserver(function (mutations, observer) {
                        if (mutations[0].addedNodes.length || mutations[0].removedNodes.length)
                            callback();
                    });
                    // have the observer observe foo for changes in children
                    obs.observe(obj, {childList: true, subtree: true});
                }
                // fallback to back to the deprecated Mutation events
                else if (eventListenerSupported) {
                    obj.addEventListener('DOMNodeInserted', callback, false);
                    obj.addEventListener('DOMNodeRemoved', callback, false);
                }
            };
        })();

        // Observe a specific DOM element:
        observeDOM(O.elem, function () {
            console.log('dom changed');

            // handle removal of div elements.
            $(O.elem).find('div').each(function () {
                var c = $(this).contents().unwrap('div');
                console.log('DOM observer: div removed', c);
            });

            // handle case when editor is empty.
            // There must always be a p element present in the editor.
            if (!$(O.elem).children(':not(br)').length) {
                $('br', O.elem).remove();
                document.execCommand('insertHTML', false, '<p><br/></p>');
                console.log('DOM observer: editor empty: p inserted');
            }

            /*
             // remove unnecessary elements. (firefox generates too much nested p)
             $('*>p', O.elem).each(function(){
             var pos = O.getCursorPos($(this));
             var p = $(this).parent();
             $(this).contents().unwrap('p');
             if (p.contents().length > 1 ){
             O.setCursorAtPos(p, pos);
             //O.setCursorAtEnd(pos);
             }
             })
             */

        });
        //focusout
        $(O.elem).on('keyup click', function (evt) {
            var node = O.getNode().parentsUntil(O.elem).andSelf().first();
            var n = O.getCursorPos(node);
            O.currentElement = node;
            O.cursorPos = n;
            console.log('pos: ', n, 'node: ', node);
        });

        $(O.elem).keydown(function (e) {

            if (e.keyCode === 8) { // backspace,

                var node = O.getNode() //.parentsUntil(O.elem).andSelf().first();
                var pos = O.getCursorPos(node);
                if (pos == 0) {
                    // replace tags(O.bk_re) with <p>.
                    var _node = node[0];
                    if (_node.nodeType == 3 && !_node.previousSibling) node = node.parent();
                    for (var i = 0; i < O.bk_re.length; i++) {
                        if (node.is(O.bk_re[i])) {
                            e.preventDefault();
                            var ne = $('<p></p>');
                            ne.prepend(node.contents());
                            node.before(ne);
                            node.remove();
                            ne = ne.contents().first() || ne;
                            O.setCursorAtPos(ne, 0);
                        }
                    }

                }



                console.log('== backspace pressed == pos: ', pos, '  Node: ', node.prop('tagName'));

            }
            else if (e.keyCode === 13 && O.isSelectionInsideElement('li') === false) {

                if (e.shiftKey === true) {
//                    document.execCommand('insertHTML', false, '<br>');
                }
                else {
                    e.preventDefault();
                    var content = O.breakLine();
                    var elem,
                        cur = O.getNode().parentsUntil(O.elem).andSelf().first();
                    if (content.html().trim() === "") {
                        content.append('<br/>')
                    }
                    cur.after(content);
                    O.setCursorAtPos(content, 0);
                    return false;
                }

            }

        });

//         $(O.elem).on('keydown', function(e) {
//             if(e.keyCode === 8 ){ // backspace
//                 e.preventDefault();
//                 $(this).find('div').remove()
//             }
//          });

        O.elem.addEventListener('paste', function (e) {
            e.preventDefault();
            var text = e.clipboardData.getData('text/plain').replace(/\n/ig, '<br>');
            document.execCommand('insertHTML', false, text);
        });

    };

    EasyEditor.prototype.getNode = function () {
        var sel = window.getSelection();
        var node = sel.anchorNode;

        if (!$.contains(this.elem, node)) {
            console.log('getNode Selection is outside the editor! Last node returned.');
            return $('#editor').contents().last();
        }


        // this handles the issue with firefox. when cursor is in between two text nodes then
        // sel.anchorNode will be the parent of these text nodes, and hence parent node is returned.
        // Workaround: in this case return the text node which is after the cursor.
        if (node.nodeType != 3 && sel.anchorOffset != 0) {
            var node_ = $(node).contents()[sel.anchorOffset];

            if(node_)
                node = node_;
        }

        return $(node)
    }

    EasyEditor.prototype.isSelectionInsideElement = function (tagName) {
        var sel, containerNode;
        tagName = tagName.toUpperCase();
        if (window.getSelection) {
            sel = window.getSelection();
            if (sel.rangeCount > 0) {
                containerNode = sel.getRangeAt(0).commonAncestorContainer;
            }
        } else if ((sel = document.selection) && sel.type != "Control") {
            containerNode = sel.createRange().parentElement();
        }
        while (containerNode) {
            if (containerNode.nodeType == 1 && containerNode.tagName == tagName) {
                return true;
            }
            containerNode = containerNode.parentNode;
        }
        return false;
    };

    // adding toolbar
    EasyEditor.prototype.addToolbar = function () {
        var self = this;

        $(self.elem).before('<div class="' + self.className + '-toolbar"><ul></ul></div>');
        this.$toolbarContainer = this.$wrapperElem.find('.' + self.className + '-toolbar');

        this.populateButtons();
    };

    // inject button events
    EasyEditor.prototype.bk_re = [];
    EasyEditor.prototype.injectButton = function (settings) {
        var self = this;

        // overwritting default button settings
        if (self.overwriteButtonSettings !== null && self.overwriteButtonSettings[settings.buttonIdentifier] !== undefined) {
            var newSettings = $.extend({}, settings, self.overwriteButtonSettings[settings.buttonIdentifier]);
            settings = newSettings;
        }

        // if button html exists overwrite default button html
        if (self.buttonsHtml !== null && self.buttonsHtml[settings.buttonIdentifier] !== undefined) {
            settings.buttonHtml = self.buttonsHtml[settings.buttonIdentifier];
        }

        // if buttonTitle parameter exists
        var buttonTitle;
        if (settings.buttonTitle) {
            buttonTitle = settings.buttonTitle;
        }
        else {
            buttonTitle = settings.buttonIdentifier.replace(/\W/g, ' ');
        }

        // if removeOnBackSpace is set
        if (settings.removeOnBackSpace) {
            this.bk_re.push(settings.blockName);
        }

        // adding button html
        if (settings.buttonHtml) {
            if (settings.childOf !== undefined) {
                var $parentContainer = self.$toolbarContainer.find('.toolbar-' + settings.childOf).parent('li');

                if ($parentContainer.find('ul').length === 0) {
                    $parentContainer.append('<ul></ul>');
                }

                $parentContainer = $parentContainer.find('ul');
                $parentContainer.append('<li><button type="button" class="toolbar-' + settings.buttonIdentifier + '" title="' + buttonTitle + '">' + settings.buttonHtml + '</button></li>');
            }
            else {
                self.$toolbarContainer.children('ul').append('<li><button type="button" class="toolbar-' + settings.buttonIdentifier + '" title="' + buttonTitle + '">' + settings.buttonHtml + '</button></li>');
            }
        }

        // bind click event
        if (typeof settings.clickHandler === 'function') {
            $(self.elem).closest(self.containerClass).delegate('.toolbar-' + settings.buttonIdentifier, 'click', function (event) {
                if (typeof settings.hasChild !== undefined && settings.hasChild === true) {
                    event.stopPropagation();
                }
                else {
                    event.preventDefault();
                }

                console.log('element pos: ', self.currentElement, self.cursorPos)
                self.setCursorAtPos(self.currentElement, self.cursorPos);
                self.focusHistory.focus();

                settings.clickHandler.call(this, this);

                if (settings.blockName) {
                    self.currentElement = self.addRemoveBlock(self, settings.blockName);
                }

                // set currently created element to currentElement.
                console.log('=====setting currentElement to : ', self.currentElement)
            });
        }
    };

    // open dropdown
    EasyEditor.prototype.openDropdownOf = function (identifier) {
        var self = this;
        $(self.elem).closest(self.containerClass).find('.toolbar-' + identifier).parent().children('ul').show();
    };

    // binding all buttons
    EasyEditor.prototype.populateButtons = function () {
        var self = this;

        $.each(self.buttons, function (index, button) {
            if (typeof self[button] === 'function') {
                self[button]();
            }
        });

    };

    // allowing resizing image
    EasyEditor.prototype.handleResizeImage = function () {
        var self = this;

        $('html').delegate(self.containerClass + ' figure', 'click', function (event) {
            event.stopPropagation();
            $(this).addClass('is-resizable');
        });

        $('html').delegate(self.containerClass + ' figure.is-resizable', 'mousemove', function (event) {
            $(this).find('img').css({'width': $(this).width() + 'px'});
        });

        $(document).click(function () {
            $(self.elem).find('figure').removeClass('is-resizable');
        });
    };

    // get selection
    EasyEditor.prototype.getSelection = function () {
        if (window.getSelection) {
            var selection = window.getSelection();

            if (selection.rangeCount) {
                return selection;
            }
        }

        return false;
    };

    // remove formatting
    EasyEditor.prototype.removeFormatting = function (arg) {
        var self = this;
        var inFullArea = arg.inFullArea;

        if (self.isSelectionOutsideOfEditor() === true) {
            return false;
        }

        if (inFullArea === false) {
            var selection = self.getSelection();
            var selectedText = selection.toString();

            if (selection && selectedText.length > 0) {

                var range = selection.getRangeAt(0);
                var $parent = $(range.commonAncestorContainer.parentNode);

                if ($parent.attr('class') === self.className || $parent.attr('class') === self.className + '-wrapper') {
                    var node = document.createElement('span');
                    $(node).attr('data-value', 'temp').html(selectedText.replace(/\n/ig, '<br>'));
                    range.deleteContents();
                    range.insertNode(node);

                    $('[data-value="temp"]').contents().unwrap();
                }
                else {

                    var topMostParent;
                    var hasParentNode = false;
                    $.each($parent.parentsUntil(self.elem), function (index, el) {
                        topMostParent = el;
                        hasParentNode = true;
                    });

                    if (hasParentNode === true) {
                        $(topMostParent).html($(topMostParent).text().replace(/\n/ig, '<br>')).contents().unwrap();
                    }
                    else {
                        $parent.contents().unwrap();
                    }

                }

            }
        }
        else {
            $(self.elem).html($(self.elem).text().replace(/\n/ig, '<br>'));
        }

        // self.removeEmptyTags();
    };

    // removing empty tags
    EasyEditor.prototype.removeEmptyTags = function () {
        var self = this;
        $(self.elem).html($(self.elem).html().replace(/(<(?!\/)[^>]+>)+(<\/[^>]+>)+/, ''));
    };

    // remove block element from selection
    EasyEditor.prototype.removeBlockElementFromSelection = function (selection, removeBr) {
        var self = this;
        var result;

        removeBr = removeBr === undefined ? false : removeBr;
        var removeBrNode = '';
        if (removeBr === true) {
            removeBrNode = ', br';
        }

        var range = selection.getRangeAt(0);
        var selectedHtml = range.cloneContents();
        var temp = document.createElement('temp');
        $(temp).html(selectedHtml);
        $(temp).find('h1, h2, h3, h4, h5, h6, p, div' + removeBrNode).each(function () {
            $(this).replaceWith(this.childNodes);
        });
        result = $(temp).html();

        return result;
    };

    // wrap section with a tag
    EasyEditor.prototype.wrapSelectionWithNodeName = function (arg) {
        var self = this;
        if (self.isSelectionOutsideOfEditor() === true) {
            return false;
        }

        var node = {
            name: 'span',
            blockElement: false,
            style: null,
            cssClass: null,
            attribute: null,
            keepHtml: false
        };

        if (typeof arg === 'string') {
            node.name = arg;
        }
        else {
            node.name = arg.nodeName || node.name;
            node.blockElement = arg.blockElement || node.blockElement;
            node.style = arg.style || node.style;
            node.cssClass = arg.cssClass || node.cssClass;
            node.attribute = arg.attribute || node.attribute;
            node.keepHtml = arg.keepHtml || node.keepHtml;
        }

        var selection = self.getSelection();

        if (selection && selection.toString().length > 0 && selection.rangeCount) {
            // checking if already wrapped
            var isWrapped = self.isAlreadyWrapped(selection, node);

            // wrap node
            var range = selection.getRangeAt(0).cloneRange();
            var tag = document.createElement(node.name);

            // adding necessary attribute to tag
            if (node.style !== null || node.cssClass !== null || node.attribute !== null) {
                tag = self.addAttribute(tag, node);
            }

            // if selection contains html, surround contents has some problem with pre html tag and raw text selection
            if (self.selectionContainsHtml(range)) {
                range = selection.getRangeAt(0);

                if (node.keepHtml === true) {
                    var clonedSelection = range.cloneContents();
                    var div = document.createElement('div');
                    div.appendChild(clonedSelection);
                    $(tag).html(div.innerHTML);
                }
                else {
                    tag.textContent = selection.toString();
                }

                range.deleteContents();
                range.insertNode(tag);

                if (range.commonAncestorContainer.localName === node.name) {
                    $(range.commonAncestorContainer).contents().unwrap();
                    self.removeEmptyTags();
                }
            }
            else {
                range.surroundContents(tag);
                selection.removeAllRanges();
                selection.addRange(range);
            }

            if (isWrapped === true) {
                self.removeWrappedDuplicateTag(tag);
            }

            self.removeEmptyTags();
            selection.removeAllRanges();
        }
    };


    // if selection contains html tag, surround content fails if selection contains html
    EasyEditor.prototype.selectionContainsHtml = function (range) {
        var self = this;
        if (range.startContainer.parentNode.className === self.className + '-wrapper') return false;
        else return true;
    };

    // if already wrapped with same tag
    EasyEditor.prototype.isAlreadyWrapped = function (selection, node) {
        var self = this;
        var range = selection.getRangeAt(0);
        var el = $(range.commonAncestorContainer);
        var result = false;

        if (el.parent().prop('tagName').toLowerCase() === node.name && el.parent().hasClass(self.className) === false) {
            result = true;
        }
        else if (node.blockElement === true) {
            $.each(el.parentsUntil(self.elem), function (index, el) {
                var tag = el.tagName.toLowerCase();
                if ($.inArray(tag, ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) !== -1) {
                    result = true;
                }
            });
        }
        else {
            $.each(el.parentsUntil(self.elem), function (index, el) {
                var tag = el.tagName.toLowerCase();
                if (tag === node.name) {
                    result = true;
                }
            });
        }

        return result;
    };

    EasyEditor.prototype.isWrapped = function (tagName) {
        var n = this.getNode();
        return n.parentsUntil(this.elem).andSelf().filter(function () {
            return $(this).is(tagName);
        });
    };

    // remove wrap if already wrapped with same tag
    EasyEditor.prototype.removeWrappedDuplicateTag = function (tag) {
        var self = this;
        var tagName = tag.tagName;

        $(tag).unwrap();

        if ($(tag).prop('tagName') === tagName && $(tag).parent().hasClass(self.className) === false && $(tag).parent().hasClass(self.className + '-wrapper')) {
            $(tag).unwrap();
        }
    };

    // adding attribute in tag
    EasyEditor.prototype.addAttribute = function (tag, node) {
        if (node.style !== null) {
            $(tag).attr('style', node.style);
        }

        if (node.cssClass !== null) {
            $(tag).addClass(node.cssClass);
        }

        if (node.attribute !== null) {
            if ($.isArray(node.attribute) === true) {
                $(tag).attr(node.attribute[0], node.attribute[1]);
            }
            else {
                $(tag).attr(node.attribute);
            }
        }

        return tag;
    };

    // insert a node into cursor point in editor
    EasyEditor.prototype.insertAtCaret = function (node) {
        var self = this;
        if (self.isSelectionOutsideOfEditor() === true) {
            return false;
        }

        if (self.getSelection()) {
            var range = self.getSelection().getRangeAt(0);
            range.insertNode(node);
        }
        else {
            $(node).appendTo(self.elem);
        }
    };

    // checking if selection outside of editor or not
    EasyEditor.prototype.isSelectionOutsideOfEditor = function () {
        return !this.elementContainsSelection(this.elem);
    };

    // node contains in containers or not
    EasyEditor.prototype.isOrContains = function (node, container) {
        while (node) {
            if (node === container) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    };

    // selected text is inside container
    EasyEditor.prototype.elementContainsSelection = function (el) {
        var self = this;
        var sel;
        if (window.getSelection) {
            sel = window.getSelection();
            if (sel.rangeCount > 0) {
                for (var i = 0; i < sel.rangeCount; ++i) {
                    if (!self.isOrContains(sel.getRangeAt(i).commonAncestorContainer, el)) {
                        return false;
                    }
                }
                return true;
            }
        } else if ((sel = document.selection) && sel.type !== "Control") {
            return self.isOrContains(sel.createRange().parentElement(), el);
        }
        return false;
    };

    // insert html chunk into editor's temp tag
    EasyEditor.prototype.insertHtml = function (html) {
        var self = this;
        $(self.elem).find('temp').html(html);
    };

    // utility of editor
    EasyEditor.prototype.utils = function () {
        var self = this;

        $('html').delegate('.' + self.className + '-modal-close', 'click', function (event) {
            event.preventDefault();
            self.closeModal('#' + $(this).closest('.' + self.className + '-modal').attr('id'));
        });

        if ($('.' + self.randomString + '-bind').length > 0) {
            var bindData;
            $('html').delegate(self.elem, 'click keyup', function () {
                var el = self.elem;
                clearTimeout(bindData);
                bindData = setTimeout(function () {
                    $('.' + self.randomString + '-bind').html($(el).html());
                }, 250);
            });
        }

        $(document).click(function (event) {
            $('.' + self.className).closest('.' + self.className + '-wrapper').find('.' + self.className + '-toolbar > ul > li > ul').hide();
        });
    };

    // youtube video id from url
    EasyEditor.prototype.getYoutubeVideoIdFromUrl = function (url) {
        if (url.length === 0) return false;
        var videoId = '';
        url = url.replace(/(>|<)/gi, '').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
        if (url[2] !== undefined) {
            videoId = url[2].split(/[^0-9a-z_\-]/i);
            videoId = videoId[0];
        }
        else {
            videoId = url;
        }
        return videoId;
    };

    // opening modal window
    EasyEditor.prototype.openModal = function (selector) {
        var temp = document.createElement('temp');
        temp.textContent = '.';
        this.insertAtCaret(temp);

        $(selector).removeClass('is-hidden');
    };

    // closing modal window
    EasyEditor.prototype.closeModal = function (selector) {
        var self = this;

        $(selector).addClass('is-hidden').find('input').val('');
        $(selector).find('.' + self.className + '-modal-content-body-loader').css('width', '0');
        var $temp = $(this.elem).find('temp');

        if ($temp.html() === '.') {
            $temp.remove();
        }
        else {
            $temp.contents().unwrap();
        }

        $(this.elem).focus();
    };

    EasyEditor.prototype.bold = function () {
        var self = this;
        var settings = {
            buttonIdentifier: 'bold',
            buttonHtml: 'B',
            clickHandler: function () {
                // lets keep it as simple as that.
                document.execCommand('bold', false, '');
//                self.wrapSelectionWithNodeName({ nodeName: 'strong', keepHtml: true });
            }
        };

        self.injectButton(settings);
    };

    EasyEditor.prototype.italic = function () {
        var self = this;
        var settings = {
            buttonIdentifier: 'italic',
            buttonHtml: 'I',
            clickHandler: function () {
                document.execCommand('italic', false, '');
//                self.wrapSelectionWithNodeName({ nodeName: 'em', keepHtml: true });
            }
        };

        self.injectButton(settings);
    };

    EasyEditor.prototype.h2 = function () {
        var self = this;
        var settings = {
            buttonIdentifier: 'header-2',
            buttonHtml: 'H2',
            blockName: 'h2',
            clickHandler: function () {
//                document.execCommand('italic', false, '');
//                self.wrapSelectionWithNodeName({ nodeName: 'h2', blockElement: true });
            }
        };

        self.injectButton(settings);
    };

    EasyEditor.prototype.h3 = function () {
        var self = this;
        var settings = {
            buttonIdentifier: 'header-3',
            buttonHtml: 'H3',
            blockName: 'h3',
            clickHandler: function () {
                self.wrapSelectionWithNodeName({nodeName: 'h3', blockElement: true});
            }
        };

        self.injectButton(settings);
    };

    EasyEditor.prototype.h4 = function () {
        var self = this;
        var settings = {
            buttonIdentifier: 'header-4',
            buttonHtml: 'H4',
            blockName: 'h4',
            clickHandler: function () {
                self.wrapSelectionWithNodeName({nodeName: 'h4', blockElement: true});
            }
        };

        self.injectButton(settings);
    };

    EasyEditor.prototype.x = function () {
        var self = this;
        var settings = {
            buttonIdentifier: 'remove-formatting',
            buttonHtml: 'x',
            clickHandler: function () {
                self.removeFormatting({inFullArea: false});
            }
        };

        self.injectButton(settings);
    };

    EasyEditor.prototype.alignleft = function () {
        var self = this;
        var settings = {
            buttonIdentifier: 'align-left',
            buttonHtml: 'Align left',
            clickHandler: function () {
                self.wrapSelectionWithNodeName({
                    nodeName: 'p',
                    style: 'text-align: left',
                    cssClass: 'text-left',
                    keepHtml: true
                });
            }
        };

        self.injectButton(settings);
    };

    EasyEditor.prototype.aligncenter = function () {
        var self = this;
        var settings = {
            buttonIdentifier: 'align-center',
            buttonHtml: 'Align center',
            clickHandler: function () {
                self.wrapSelectionWithNodeName({
                    nodeName: 'p',
                    style: 'text-align: center',
                    cssClass: 'text-center',
                    keepHtml: true
                });
            }
        };

        self.injectButton(settings);
    };

    EasyEditor.prototype.alignright = function () {
        var self = this;
        var settings = {
            buttonIdentifier: 'align-right',
            buttonHtml: 'Align right',
            clickHandler: function () {
                self.wrapSelectionWithNodeName({
                    nodeName: 'p',
                    style: 'text-align: right',
                    cssClass: 'text-right',
                    keepHtml: true
                });
            }
        };

        self.injectButton(settings);
    };

    EasyEditor.prototype.quote = function () {
        var self = this;
        var settings = {
            buttonIdentifier: 'quote',  // selector
            buttonHtml: 'Quote',        // caption value
            blockName: 'blockquote',    // these will always be the first child of editor.
            removeOnBackSpace: true,    // force remove this tag on backspace and wrap in P.
            clickHandler: function () {
                // addRemoveBlock = function(block){ }
//                return self.addRemoveBlock.call('blockquote', this);
            }
        };

        self.injectButton(settings);
    };

    EasyEditor.prototype.ul = function () {
        var self = this;
        var settings = {
            buttonIdentifier: 'list',
            buttonHtml: 'UL',
             blockName: 'li',    // these will always be the first child of editor.
            removeOnBackSpace: true,    // force remove this tag on backspace and wrap in P.

            clickHandler: function () {
                //self.wrapSelectionWithList();
            }
        };

        self.injectButton(settings);
    };

    EasyEditor.prototype.code = function () {
        var self = this;
        var settings = {
            buttonIdentifier: 'code',
            buttonHtml: 'Code',
            clickHandler: function () {
                self.wrapSelectionWithNodeName({nodeName: 'pre'});
            }
        };

        self.injectButton(settings);
    };

    EasyEditor.prototype.link = function () {
        var self = this;
        var settings = {
            buttonIdentifier: 'link',
            buttonHtml: 'Link',
            clickHandler: function () {
                self.wrapSelectionWithNodeName({nodeName: 'a', attribute: ['href', prompt('Insert link', '')]});
            }
        };

        self.injectButton(settings);
    };

    EasyEditor.prototype.source = function () {
        var self = this;
        var settings = {
            buttonIdentifier: 'source',
            buttonHtml: 'Source',
            clickHandler: function (thisButton) {
                var $elemContainer = $(thisButton).closest('.' + self.className + '-wrapper');
                var $elem = $elemContainer.find('.' + self.className);
                var $tempTextarea;

                if ($(thisButton).hasClass('is-view-source-mode')) {
                    $tempTextarea = $('body > textarea.' + self.className + '-temp');
                    $elem.css('visibility', 'visible');
                    $tempTextarea.remove();
                    $(thisButton).removeClass('is-view-source-mode');
                }
                else {
                    $('body').append('<textarea class="' + self.className + '-temp" style="position: absolute; margin: 0;"></textarea>');
                    $tempTextarea = $('body > textarea.' + self.className + '-temp');

                    $tempTextarea.css({
                        'top': $elem.offset().top,
                        'left': $elem.offset().left,
                        'width': $elem.outerWidth(),
                        'height': $elem.outerHeight()
                    }).html($elem.html());

                    if ($elem.css('border') !== undefined) {
                        $tempTextarea.css('border', $elem.css('border'));
                    }

                    $elem.css('visibility', 'hidden');
                    $(thisButton).addClass('is-view-source-mode');

                    $tempTextarea.on('keyup click change keypress', function () {
                        $elem.html($(this).val());
                    });
                }
            }
        };

        self.injectButton(settings);
    };

    EasyEditor.prototype.setCursorAtEnd = function (E) {
        var range = document.createRange();
        var sel = window.getSelection();
        var con = E.contents();
        var len = con.length;
        if (len > 0 && con.last().is('br'))len--;
        range.setStart(E[0], len);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    };
    EasyEditor.prototype.setCursorAtBeginning = function (E) {
        var range = document.createRange();
        var sel = window.getSelection();
        range.setStart(E[0], 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
    };

    EasyEditor.prototype.setCursorAtPos = function (E, pos) {
        // ref: https://stackoverflow.com/questions/6249095/how-to-set-caretcursor-position-in-contenteditable-element-div
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

            var range = createRange(E[0], {count: pos});

            if (range) {
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
//        E.focus();
    };
    EasyEditor.prototype.getCursorPos = function (parent) {
        var selection = window.getSelection(),
            charCount = 0,
            node;

        if (selection.focusNode) {
            if (parent.is(selection.focusNode) || parent.find(selection.focusNode).length > 0) {
                node = selection.focusNode;
                charCount = selection.focusOffset;

                while (node) {
                    if (parent.is(node)) {
                        break;
                    }

                    if (node.previousSibling) {
                        node = node.previousSibling;
                        charCount += node.textContent.length;
                    } else {
                        node = node.parentNode;
                        if (node === null) {
                            break
                        }
                    }
                }
            }
        }
        return charCount;
    };

    EasyEditor.prototype.addRemoveBlock = function (self, block) {
        /*
         block: (string) valid name of tag to create
         */
        var getClosestBlock = function() {
            /*
                returns the closest patent which is a block element
            */
            var p = self.getNode().parentsUntil(self.elem).andSelf();
            var n = p.first();
            // here an exception is ul > li
            if (n.is('ul')) n = $(p[1]);
            return n;
        };

        var n = getClosestBlock();

        var pos = self.getCursorPos(n);
        var elem;
        var matched = self.isWrapped(block);
        if (!!matched.length) {
            // begin removing the block.
            // matched.each(function() {
                var mE = matched.first();//$(this);
                elem = $('<p></p>')
                    .html(mE.contents());
                if (elem.text() == "") {
                    elem.html('<br/>')
                }

                if(block === 'li') {
                    // handle list split when cursor is on non edge li.
                    var ul = mE.parent();
                    if(mE.is(':first-child')) {
                        ul.before(elem);
                    }
                    else if(mE.is(':last-child')) {
                        ul.after(elem);
                    }
                    else{
                        // create a new list for previous li's
                        ul.before(
                            ul.clone()
                                .empty()
                                .append(mE.prevAll())
                        );
                        ul.before(elem);
                    }

                    mE.remove();
                    if(!ul.children('li').length){
                        ul.remove();
                    }
                }
                else
                {
                    mE.before(elem);
                    mE.remove();
                }
            // });
        }
        else {
            // begin adding the block..
            elem = $('<' + block + '>');
            console.log('inserting element');

            if (block === 'li'){
                // TODO: case when there is a ul already before and after.
                elem = $('<ul></ul>')
                    .append(elem.append(n.contents()));
                n.replaceWith(elem);

            }
            else{
                n.replaceWith(elem.append(n.contents()));
            }
        }
        self.setCursorAtPos(elem, pos);

        // return newly created element.
        return elem
    };

    EasyEditor.prototype.breakLine = function () {
        var O = this;
        var node = O.getNode();
        // ps = [p, span, b, textNode] it will be an array starting from a paragraph node.
        var ps = node.parentsUntil(O.elem).andSelf(); //.filter(function(){return this.nodeType != 3 });
        var lastNode = ps.last(); // this should be a text node (closest to cursor.)
        var pos = O.getCursorPos(lastNode);

        // setting this on assumption that there will always be atleast two elements present in ps (textNode and its parent).
        var P = ps.first().clone().empty();

        // firefox places cursor at beginning with no text node.
        if (ps.length == 1 && lastNode.html() != "") {
            console.log("Firefox buggy case ...");
            var clonedNode = lastNode.clone();
            lastNode.html('<br/>');
            return clonedNode
        }

        if (lastNode[0].nodeType === 3) {
            // text after cursor in textNode.
            var nie = document.createTextNode(lastNode.text().substring(pos, lastNode.text().length));
            // text before cursor in textNode.
            var l_txt = lastNode.text().substring(0, pos);
            l_txt == "" ? lastNode.before('<br/>') : lastNode.before(document.createTextNode(l_txt));
            // if(l_txt)
        }
        for (var i = ps.length - 2; i >= 0; i--) {
            P = $(ps[i]).clone().empty();
            P.append(nie);
            var e = ps[i + 1];
            while (e.nextSibling) {
                P.append(e.nextSibling);
            }
            nie = P;
        }
        console.log('next line : ', P.html());
        // it will be good to remove at last.
        if (lastNode[0].nodeType === 3) {
            lastNode.remove();
        }
        return P;
    };

    // wrap selection with unordered list
    EasyEditor.prototype.wrapSelectionWithList = function (tagname) {
        var self = this;
        tagname = tagname || 'ul';

        //document.execCommand('insertOrderedList', false, '');

        // return;
        // preventing outside selection
        if (self.isSelectionOutsideOfEditor() === true) {
            return false;
        }

        // if text selected
        var selection = self.getSelection();
        if (selection && selection.toString().length > 0 && selection.rangeCount) {
            var selectedHtml = self.removeBlockElementFromSelection(selection, true);
            var listArray = selectedHtml.split('\n').filter(function (v) {
                return v !== '';
            });
            var wrappedListHtml = $.map(listArray, function (item) {
                return '<li>' + $.trim(item) + '</li>';
            });

            var node = document.createElement(tagname);
            $(node).html(wrappedListHtml);

            var range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(node);

            selection.removeAllRanges();
        }

    };

    window.EasyEditor = EasyEditor;

    $.fn.easyEditor = function (options) {
        return this.each(function () {
            if (!$.data(this, 'plugin_easyEditor')) {
                $.data(this, 'plugin_easyEditor',
                    new EasyEditor(this, options));
            }
        });
    };

})(jQuery, document, window);
