(function() { 'use strict';
    var app = angular.module('app');

    app.controller('chatCtrl', ['$scope', '$route', '$http', '$location', '$interval', '$sce', function($scope, $route, $http, $location, $interval, $sce){

        var ctrl = this;
        var refreshTimer = null;

        $scope.$on('$destroy', function(){
            if(refreshTimer)
                $interval.cancel(refreshTimer);
        });

        testAuthentication().then(focus).then(load).then(function(){
         refreshTimer = $interval(load, 10000);
        });

        ctrl.messages = [];
        ctrl.post     = post;
        ctrl.load     = load;
        ctrl.disconnect = disconnect;
        ctrl.deleteAll  = deleteAll;
        ctrl.displayTime = displayTime;
        ctrl.selectPhoto = selectPhoto;

        //====================================
        //
        //====================================
        function isImage(text){
            return /^http[s]?:\/\/.*\.(jpg|jpeg|png|svg|gif)$/.test((text||''));
        }

        //====================================
        //
        //====================================
        function testAuthentication() {

            var token = $scope && $scope.$root && $scope.$root.auth && $scope.$root.auth.token;

            return $http.get('/api/authentication', {

                headers: { authorization : token },
                timeout: 300000

            }).catch(function(err){

                delete $scope.$root.auth;

                $scope.$applyAsync(function(){
                    $location.url('/');
                });

                if(refreshTimer)
                    $interval.cancel(refreshTimer);

                throw err;
            });
        }

        //====================================
        //
        //====================================
        function load() {

            ctrl.loading = true;

            var msgCount = (ctrl.messages||[]).length;

            testAuthentication().then(function(){

                return $http.get('/api/messages', { headers: { authorization : $scope.$root.auth.token } });

            }).then(function(res){

                ctrl.messages = _(res.data).map(function(m){
                    m.date = new Date(m.date);
                    m.media = isImage(m.text);
                    return m;

                }).sortBy('date').value();

            }).catch(function(err){

                console.log(err);

                return testAuthentication();

            }).finally(function(){

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

            testAuthentication().then(function(){

                let data;
                let options = {};

                if(typeof(msg)=="string") {
                    data = { text: msg };
                }
                else if(msg.type) {
                    data = msg;
                    options.headers = angular.extend(options.headers||{}, { 'Content-Type': msg.type });
                }

                return $http.post('/api/messages', data, options);

            }).then(function(){

                return load();

            }).catch(function(err){

                console.log(err);

                return testAuthentication();

            }).finally(function(){
                autoscroll();
                delete ctrl.loading;
            });
        }

        //====================================
        //
        //====================================
        function deleteAll() {

            var messages = ctrl.messages;

            testAuthentication().then(function(){
                messages.forEach(function(m){
                    del(m._id);
                });
            });
        }

        //====================================
        //
        //====================================
        function disconnect() {
            ctrl.messages = [];
            delete $scope.$root.auth;
            testAuthentication();
        }

        //====================================
        //
        //====================================
        function del(id) {

            return $http.delete('/api/messages/'+id, { headers: { authorization : $scope.$root.auth.token } }).then(function(){

                ctrl.messages = _.filter(ctrl.messages, function(m){
                    return m._id!=id;
                });

            }).catch(function(err){

                console.log(err);

                return testAuthentication();

            }).finally(function(){
                autoscroll();
            });

        }

        //====================================
        //
        //====================================
        function autoscroll() {
            $scope.$applyAsync(function(){

                var q = $('#chat');

                q.stop(true).animate({ scrollTop:parseInt(q.prop('scrollHeight'))+200 }, 200);

            });
        }

        //====================================
        //
        //====================================
        function displayTime(date) {
            return moment(date).fromNow();
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

    }]);
})();
