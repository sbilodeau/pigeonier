(function() { 'use strict';

    moment.locale('en', {
        calendar : {
            lastDay : '[Yesterday at] H:mm',
            sameDay : '[Today at] H:mm',
            nextDay : '[Tomorrow at] H:mm',
            lastWeek : 'dddd [at] H:mm',
            nextWeek : '[Next] dddd [at] H:mm',
            sameElse : 'YYYY-MM-DD at H:mm'
        }
    });

	angular.module('app').filter('moment', [function() {

        //====================================
        //
        //====================================
        return function(date, method, p1, p2, p3, p4) {

            return date && moment(date)[method](p1, p2, p3, p4);

        };
	}]);
})();
