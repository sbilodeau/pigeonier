(function() { 'use strict';

    //====================================
    //
    //====================================
    function isUrl(text) {
        return /^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/i.test(text||'');
    }

    //====================================
    //
    //====================================
    function isImage(text){
        return /^http[s]?:\/\/.*\.(jpg|jpeg|png|svg|gif)$/i.test((text||''));
    }

	angular.module('app').filter('toHtml', ['$sce', function($sce) {

        //====================================
        //
        //====================================
        return function(text) {

            if(!text)
                return text;

            var lines = (text||'').split('\n');

            for(var l in lines) {

                var words = lines[l].split(' ');

                for(var w in words) {

                    if(isUrl(words[w])){
                        var link = $('<a target="_blank">');

                        link.attr('href', words[w]);

                        if(isImage(words[w])) {
                            var img = $('<img>');
                            img.attr('src', words[w]);
                            link.append(img);
                        }
                        else {
                            link.text(words[w]);
                        }

                        words[w] = $('<div>').append(link).html();
                    }
                }

                lines[l] = words.join(' ');
            }

            return $sce.trustAsHtml(lines.join('<br>'));
        };

	}]);

})();
