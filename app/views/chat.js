(function() { 'use strict';
    var app = angular.module('app');

    app.controller('chatCtrl', ['$scope', '$route', '$http', '$location', '$interval', '$timeout', '$sce', 'auth', '$q',
                        function($scope,   $route,   $http,   $location,   $interval,   $timeout,   $sce,   auth,   $q){

        var ctrl = this;
        var refreshTimer = null;

        $scope.log = console.log;

        $scope.$on('$destroy', function(){
            if(refreshTimer) {
                $interval.cancel(refreshTimer);
                refreshTimer=null;
            }
        });

        ctrl.messages = [];
        ctrl.post     = post;
        ctrl.load     = load;
        ctrl.disconnect = disconnect;
        ctrl.deleteAll  = deleteAll;
        ctrl.selectPhoto = selectPhoto;

        $scope.toHtml = toHtml;
        $scope.isAllEmoji = isAllEmoji;

        $scope.text = "";

        $scope.onPostOrRefresh = function (){
            if($scope.text.trim()) {
                post($scope.text);
                $scope.text='';
            }
            else {
                load();
            }
        };

        load();

        //====================================
        //
        //====================================
        function load(postpone) {

            if(postpone!==false) {
                postponeRefresh();
            }

            $scope.loading = true;

            var pendings = _.filter(ctrl.messages, { pending: true });
            var msgCount = ctrl.messages.length - _.filter(ctrl.messages, { local: true }).length;

            return $http.get('/api/messages').then(function(res){

                ctrl.messages = _(res.data).union(pendings).sortBy('date').value();

                $scope.date = new Date();

            }).catch(on403).catch(console.error).finally(function(){

                delete $scope.loading;

                if(msgCount!=(ctrl.messages||[]).length)
                    autoscroll();

            });
        }

        //====================================
        //
        //====================================
        function postponeRefresh() {

            if(refreshTimer)
                $interval.cancel(refreshTimer);

            refreshTimer = $interval(function() { load(false); }, 10000);
        }

        //====================================
        //
        //====================================
        function post(msg) {

            if(!msg) return;

            let pendingMessage;

            return $q.when(msg).then(function(){

                postponeRefresh();

                pendingMessage = {
                    _id:  new Date().toISOString(),
                    date: new Date().toISOString(),
                    text: msg.type ? '['+msg.type+']' : msg,
                    contentType: 'text/plain',
                    me: true,
                    local: true,
                    pending: true,
                    rawMessage : msg,
                    retry: function() { repost(this); }
                };

                ctrl.messages.push(pendingMessage);

                autoscroll();

                let data;
                let options = {};

                if(typeof(msg)=="string") {
                    data = { text: msg };
                }
                else if(msg.type) {
                    data = msg;
                    options.headers = angular.extend(options.headers||{}, { 'Content-Type': msg.type });
                }
                else {
                    throw new Error('Unknow message type'+msg);
                }

                return $http.post('/api/messages', data, options);

            }).then(function(res){

                delete pendingMessage.local;
                delete pendingMessage.pending;
                delete pendingMessage.error;
                delete pendingMessage.rawMessage;
                delete pendingMessage.retry;

                _.extend(pendingMessage, res.data, { me: true });

            }).catch(on403).catch(function(err){

                pendingMessage.error = err;
                console.error(err);

            }).finally(load);
        }

        //====================================
        //
        //====================================
        function repost(msg) {

            if(!msg || !msg.rawMessage)
                return;

            ctrl.messages = _.without(ctrl.messages, msg);

            post(msg.rawMessage);
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

            htmlFile.change(function(evt){

                $scope.$applyAsync(function(){

                    var files = evt.target.files;

                    for(var i=0; i<files.length; ++i) {
                        post(files[i]);
                    }
                });
            });

            htmlFile.click();
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
