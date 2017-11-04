(function() { 'use strict';
    var app = angular.module('app');

    app.controller('chatCtrl', ['$scope', '$route', '$http', '$location', '$interval', '$timeout', '$sce', 'auth',
                        function($scope,   $route,   $http,   $location,   $interval,   $timeout,   $sce,   auth){

        var ctrl = this;
        var refreshTimer = null;

        $scope.log = console.log;

        $scope.$on('$destroy', function(){
            if(refreshTimer)
                $interval.cancel(refreshTimer);
        });

        load().then(function(){
            refreshTimer = $interval(load, 10000);
        });

        ctrl.messages = [];
        ctrl.post     = post;
        ctrl.load     = load;
        ctrl.disconnect = disconnect;
        ctrl.deleteAll  = deleteAll;
        ctrl.selectPhoto = selectPhoto;
        ctrl.toHtml = toHtml;
        ctrl.isAllEmoji = isAllEmoji;

        var textarea = $("textarea")[0];

        $scope.inputHeight = function() {
            return Math.min(Math.max(textarea.scrollHeight,40), 120);
        };

        //====================================
        //
        //====================================
        function load() {

            ctrl.loading = true;

            var msgCount = (ctrl.messages||[]).length;

            return $http.get('/api/messages').then(function(res){

                ctrl.messages = _(res.data).map(function(m){
                    m.date = new Date(m.date);
                    m.type = (m.contentType||'text/').split('/')[0];
                    return m;

                }).sortBy('date').value();

                $scope.date = new Date();

            }).catch(on403).catch(console.error).finally(function(){

                if(msgCount!=(ctrl.messages||[]).length)
                    autoscroll();

                delete ctrl.loading;
            });
        }

        //====================================
        //
        //====================================
        function post(msg) {

            if(!msg) return;

            ctrl.loading = true;

            let data;
            let options = {};

            if(typeof(msg)=="string") {
                data = { text: msg };
            }
            else if(msg.type) {
                data = msg;
                options.headers = angular.extend(options.headers||{}, { 'Content-Type': msg.type });
            }

            return $http.post('/api/messages', data, options).then(function(){

                return load();

            }).catch(on403).catch(console.error).finally(function(){

                delete ctrl.loading;

            });
        }

        //====================================
        //
        //====================================
        function deleteAll() {

            var messages = ctrl.messages;

            messages.forEach(function(m){
                del(m._id);
            });
        }

        //====================================
        //
        //====================================
        function disconnect() {

            ctrl.messages = [];
            auth.set(null);

            $location.url('/');
        }

        //====================================
        //
        //====================================
        function del(id) {

            return $http.delete('/api/messages/'+id).then(function(){

                ctrl.messages = _.filter(ctrl.messages, function(m){
                    return m._id!=id;
                });

            }).catch(on403).catch(console.error).finally(function() {
                autoscroll();
            });

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

        var emojiRe = new RegExp('^('+[
            '\ud83c[\udf00-\udfff]', // U+1F300 to U+1F3FF
            '\ud83d[\udc00-\ude4f]', // U+1F400 to U+1F64F
            '\ud83d[\ude80-\udeff]', // U+1F680 to U+1F6FF
            '\\s'].join('|')+')+$');

        function isAllEmoji(str) {
            return emojiRe.test(str);
        }

        //====================================
        //
        //====================================
        var scrollTimer = null;
        function autoscroll() {

            scrollTimer = $timeout(function(){

                cancelsroll();

                var q = $('#chat');

                q.stop(true).animate({ scrollTop:parseInt(q.prop('scrollHeight'))+2000 }, 200);

            }, 300);
        }

        //====================================
        //
        //====================================
        function cancelsroll() {

            if(scrollTimer) {
                $timeout.cancel(scrollTimer);
                scrollTimer = null;
            }

        }

        //====================================
        //
        //====================================
        function selectPhoto() {

            var htmlFile = $('<input type="file"  accept="image/*;video/*" multiple style="display:none">');

            $("form:first").append(htmlFile);

            htmlFile.change(upload);

            htmlFile.click();
        }


        //====================================
        //
        //====================================
        function upload(evt) {

            var htmlFile = evt.target;
            var files    = htmlFile.files;

            for(var i=0; i<files.length; ++i) {

                post(files[i]).then(function(){
                //    $(htmlFile).remove();
                });
            }

        }

        //====================================
        //
        //====================================
        function on403(err){

            if(!err || err.status!=403)
                throw err;

            auth.set(null);

            $scope.$applyAsync(function(){
                $location.url('/');
            });

            if(refreshTimer)
                $interval.cancel(refreshTimer);

            throw err;
        }
    }]);
})();
