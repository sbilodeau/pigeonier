(function() { 'use strict';

    var app = angular.module('app', ['ngRoute', 'ngCookies', 'ngSanitize']);

    app.config(['$httpProvider', function($httpProvider) {

        $httpProvider.useApplyAsync(true);
        $httpProvider.interceptors.push('authenticationHttpIntercepter');

    }]);

	app.factory('authenticationHttpIntercepter', ["$rootScope", function($rootScope) {

		return {
			request: function(config) {

				var trusted = /^\/api\//i.test(config.url);

				var hasAuthorization = (config.headers||{}).hasOwnProperty('Authorization') ||
							  		   (config.headers||{}).hasOwnProperty('authorization');

				if(!trusted || hasAuthorization) // no need to alter config
					return config;

				//Add token to http headers

                if($rootScope.auth && $rootScope.auth.token) {
                    config.headers = angular.extend(config.headers||{}, {
                        Authorization : $rootScope.auth.token
                    });
                }

				return config;
			}
		};
	}]);

})();
