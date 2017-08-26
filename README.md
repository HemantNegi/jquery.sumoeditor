# jquery.sumoeditor
A javascript rich text editor for web content creation.

RULES
- No text node will ever be a direct child of editor.
- Do not delete any node ever, always try to move it.
- We will try to use native html tags for everything and follow w3c semantics.

## elements which we want to consider block elements:
To generate a consistent markup across the browsers, we have to make some constraints on certain tags.
These are mostly native block elements.
Block elements are generated on caret return.

## Understanding Selection and Range Objects

Selection object:
    anchorNode   : The node from where the selection is started (if no selection then the caret position in element).
    anchorOffset : offset from the beginning of anchorNode.
    baseNode     : N/A
    baseOffset   : N/A
    extentNode   : N/A
    extentOffset : N/A
    focusNode    : The node where selection ends (this will be the final cursor position)
    focusOffset  : offset from the beginning of focusOffset.
    isCollapsed  : boolean - represents if there is a selection or not (false for a selection)
    rangeCount   : Number of ranges in this selection
    type         : Range||Caret (but do not depend on this use isCollapsed insted.)

Range object:
    collapsed               : If range contains a selection or not (Similar to selection.isCollapsed).
    commonAncestorContainer : The common parent of selected elements.
    startContainer          : The container from where selection is starting in order of elements in dom.
    startOffset             : start offset wrt start Container.
    endContainer            : The container from where selection is ending in order of elements in dom.
    endOffset               : end offset wrt endContainer

NOTE: selection.anchorOffset and range.startOffset can be same if selection begins from top to bottom and vice versa for
      selection.focusOffset and range.endContainer.

here in sumo editor we rely on range

## REFERENCES:
Boilerplate code for jquery plugin - https://github.com/jquery-boilerplate/jquery-boilerplate
