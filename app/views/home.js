(function() { 'use strict';
    var app = angular.module('app');

    app.controller('homeCtrl', ['$scope', '$route', '$http', '$location', '$window', 'auth', function($scope, $route, $http, $location, $window, auth){

        var homeCtrl = this;

        delete $scope.$root.auth;

        homeCtrl.submit = submit;

        $scope.$applyAsync(focus);

        testAuthentication().then(function(){
            $location.url('/chat');
        })

        //====================================
        //
        //====================================
        function submit(text) {

            text = text || '';

            authenticate(text).then(function(){

                text = '';

                $scope.$applyAsync(function(){
                    $location.url('/chat');
                });

            }).catch(function(){

                if(text)
                    $window.location = 'https://google.com/search?q='+encodeURIComponent(text);

            });
        }

        //====================================
        //
        //====================================
        function authenticate(rawtext) {

            rawtext = (rawtext||'').replace(/^\s+/, '').replace(/\s+$/, '').toLowerCase();

            var parts = rawtext.split('/');

            var pin    = parts[0];
            var option = parts[1];

            return $http.post('/api/authentication', { pin: pin }).then(function(res){

                auth.set({ token: res.data.token }, { persist : option=='save' });

            }).catch(function(err){

                delete $scope.$root.auth;
                throw err;

            });
        }

        //====================================
        //
        //====================================
        function testAuthentication() {
            return $http.get('/api/authentication', { timeout: 10000 });
        }

        //====================================
        //
        //====================================
        function focus() {
            $('#text').focus();
        }
    }]);
})();
