(function() { 'use strict';

    var authentication;

	angular.module('app').factory('auth', ['$cookies', function($cookies) {

        function get() {

            if(!authentication)
                authentication = $cookies.getObject('auth');

            return authentication;
        }

        function set(auth, options) {

            authentication = auth;

            if(!auth) {
                $cookies.remove('auth');
                authentication = null;
            }
            else if (options.persist) {

                var exp = new Date();
                exp.setDate(exp.getDate()+7);

                $cookies.putObject('auth', authentication, {path:'/', expires: exp });
            }

            return authentication;
        }

        return { get: get, set: set };

	}]);

})();
