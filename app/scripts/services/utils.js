"use strict";

angular.module("homeuiApp")
  .factory("getElementAttributes", function () {
    return function getElementAttributes (elem) {
        var attr = {};

        if(elem && elem.length) $.each(elem.get(0).attributes, function(v,n) { 
            n = n.nodeName||n.name;
            v = elem.attr(n); // relay on $.fn.attr, it makes some filtering and checks
            if(v != undefined && v !== false) attr[n] = v
        })

        return attr;
    };
  });

