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
        function isImage(text){
            return /^http[s]?:\/\/.*\.(jpg|jpeg|png|svg|gif)$/.test((text||''));
        }

        //====================================
        //
        //====================================
        function load() {

            ctrl.loading = true;

            var msgCount = (ctrl.messages||[]).length;

            return $http.get('/api/messages').then(function(res){

                ctrl.messages = _(res.data).map(function(m){
                    m.date = new Date(m.date);
                    m.media = isImage(m.text);
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
        function autoscroll() {
            $timeout(function(){

                var q = $('#chat');

                q.stop(true).animate({ scrollTop:parseInt(q.prop('scrollHeight'))+2000 }, 200);

            }, 100);
        }

        //====================================
        //
        //====================================
        function focus() {
            $scope.$applyAsync(function(){
                $('#text').focus();
            });
        }

        //====================================
        //
        //====================================
        function selectPhoto() {

            var htmlFile = $('<input type="file"  accept="image/*" style="display:none">');

            $("form:first").append(htmlFile);

            htmlFile.change(upload);

            htmlFile.click();
        }


        //====================================
        //
        //====================================
        function upload(evt) {

            var htmlFile = evt.target;
            var file     = htmlFile.files[0];

            console.log(evt);
            console.log(file);

            post(file).then(function(){
                $(htmlFile).remove();
            });

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
