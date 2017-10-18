(function() { 'use strict';

    var app = angular.module('app');

    app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider){

        $locationProvider.html5Mode(true);

        $routeProvider
        .when("/",       { templateUrl : "/app/views/home.html", controller: "homeCtrl as homeCtrl" })
        .when("/chat",   { templateUrl : "/app/views/chat.html", controller: "chatCtrl as chatCtrl" });

    }]);

})();
