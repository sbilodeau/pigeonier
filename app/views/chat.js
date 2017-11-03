(function() { 'use strict';
    var app = angular.module('app');

    app.controller('chatCtrl', ['$scope', '$route', '$http', '$location', '$interval', '$timeout', 'auth',
                        function($scope,   $route,   $http,   $location,   $interval,   $timeout,   auth){

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
            var pendings = _.filter(ctrl.messages||[], { pending: true });

            return $http.get('/api/messages').then(function(res){

                ctrl.messages = _(res.data).concat(pendings).sortBy('date').value();

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

            let data;
            let options = {};

            if(typeof(msg)=="string") {
                data = { text: msg };
            }
            else if(msg.type) {
                data = msg;
                options.headers = angular.extend(options.headers||{}, { 'Content-Type': msg.type });
            }

            let pendingMessage = {
                _id: randomString(24),
                me: true,
                date: new Date().toISOString(),
                text: msg.type || msg,
                contentType: msg.type || 'text/plain',
                pending: true,
                data: msg
            };

            ctrl.messages.push(pendingMessage);

            autoscroll();

            return $http.post('/api/messages', data, options).then(function(){

                delete pendingMessage.pending;

                return load();

            }).catch(on403).catch(function(err) {

                pendingMessage.error = (err||{}).data || err || 'Unknown Error';

                console.error((err||{}).data || err);

            }).finally(function(){

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
        function autoscroll() {
            $timeout(function(){

                var q = $('#chat');

                q.stop(true).animate({ scrollTop:parseInt(q.prop('scrollHeight'))+2000 }, 200);

            }, 100);
        }

        //============================================================
        //
        //
        //============================================================
        function randomString(length) {
          var text = "";
          var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

          for (var i = 0; i < length; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));

          return text;
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
