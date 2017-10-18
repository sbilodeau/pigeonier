(function() { 'use strict';
    var app = angular.module('app');

    app.controller('homeCtrl', ['$scope', '$route', '$http', '$location', '$window', function($scope, $route, $http, $location, $window){

        var homeCtrl = this;

        delete $scope.$root.auth;

        homeCtrl.submit = submit;

        $scope.$applyAsync(focus);

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
        function authenticate(pin) {

            pin = (pin||'').replace(/^\s+/, '').replace(/\s+$/, '').toLowerCase();

            return $http.post('/api/authentication', { pin: pin }).then(function(res){

                $scope.$root.auth = {
                    pin: pin,
                    token: res.data.token
                };

            }).catch(function(err){

                delete $scope.$root.auth;
                throw err;

            });
        }

        //====================================
        //
        //====================================
        function focus() {
            $('#text').focus();
        }
    }]);
})();
