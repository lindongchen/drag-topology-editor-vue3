;(function() {

  "use strict";

   var root = this;
   var exports = root.coreTopologyUtil;

   exports.matchesSelector = function(el, selector, ctx) {
       ctx = ctx || el.parentNode;
       var possibles = ctx.querySelectorAll(selector);
       for (var i = 0; i < possibles.length; i++) {
           if (possibles[i] === el)
               return true;
       }
       return false;
   };

   exports.consume = function(e, doNotPreventDefault) {
       if (e.stopPropagation)
           e.stopPropagation();
       else
           e.returnValue = false;

       if (!doNotPreventDefault && e.preventDefault)
            e.preventDefault();
   };

   /*
    * Function: sizeElement
    * Helper to size and position an element. You would typically use
    * this when writing your own Connector or Endpoint implementation.
    *
    * Parameters:
    *  x - [int] x position for the element origin
    *  y - [int] y position for the element origin
    *  w - [int] width of the element
    *  h - [int] height of the element
    *
    */
   exports.sizeElement = function(el, x, y, w, h) {
       if (el) {
           el.style.height = h + "px";
           el.height = h;
           el.style.width = w + "px";
           el.width = w;
           el.style.left = x + "px";
           el.style.top = y + "px";
       }
   };


 }).call(window);
