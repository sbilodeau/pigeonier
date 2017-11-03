(function() { 'use strict';

	angular.module('app').directive('bubble', ['$http', '$sce', 'emoji', function($http, $sce, emoji) {

        var sentenceEmojiRe = new RegExp('^'+emoji.source+"+$")

        return {
            restrict : 'E',
            templateUrl: '/app/directives/bubble.html',
            scope: { msg: "<message" },
            link: function($scope)
            {
                $scope.toType = toType;
                $scope.toHtml = toHtml;
                $scope.isAllEmoji = isAllEmoji;
            }
        };


        //====================================
        //
        //====================================

        function isAllEmoji(text) {

            text = text||'';

            if(!emoji.test(text))
                return false;

            return sentenceEmojiRe.test(text.replace(/\s/gm, ''));
        }

        //====================================
        //
        //====================================
        function toType(contentType) {
            return (contentType||'text/').split('/')[0];
        }

        //====================================
        //
        //====================================
        function toHtml(text) {

            if(!text)
                return text;

            var lines = (text||'').split('\n');

            for(var l in lines) {

                var words = lines[l].split(' ');

                for(var w in words) {

                    if(isUrl(words[w])){
                        var link = $('<a target="_blank">');

                        link.attr('href', words[w]);
                        link.text(words[w]);

                        words[w] = $('<div>').append(link).html();
                    }
                }

                lines[l] = words.join(' ');
            }

            return $sce.trustAsHtml(lines.join('<br>'));
        }

        //====================================
        //
        //====================================
        function isUrl(text) {
            return /^(?:\w+:)?\/\/([^\s\.]+\.\S{2}|localhost[\:?\d]*)\S*$/i.test(text||'');
        }

	}]);
})();
