(function () {
    'use strict';

//var app = angular.module('pcdrApp', ['ngMaterial', 'ngMessages', 'ngRoute', 'toastr', 'kendo.directives', 'mdDateTime'])
//var app = angular.module('pcdrApp', ['ngMaterial', 'ngMessages', 'ngRoute', 'toastr', 'ngGrid'])
//var app = angular.module('pcdrApp', ['ngMaterial', 'ngMessages', 'ngRoute', 'toastr', 'ui.grid', 'ui.grid.autoResize', 'ui.grid.resizeColumns', 'ui.grid.selection'])
//var app = angular.module('pcdrApp', ['ngMaterial', 'ngMessages', 'ngRoute', 'toastr', 'kendo.directives'])
//var app = angular.module('pcdrApp', ['ngMaterial', 'ngMessages', 'ngRoute', 'toastr', 'ui.grid', 'ui.grid.autoResize', 'ui.grid.resizeColumns', 'ui.grid.selection', 'ui.grid.cellNav', 'ui.grid.edit', 'angularGrid', 'mc.resizer']);
//    angular.module('app', ['ngMaterial', 'ngMessages', 'ngRoute', 'toastr', 'ui.grid', 'ui.grid.autoResize', 'ui.grid.resizeColumns', 'ui.grid.selection', 'ui.grid.cellNav', 'ui.grid.edit', 'angularGrid', 'angularModalService']);
    angular.module('app', ['ngMaterial', 'ngMessages', 'ngRoute', 'toastr', 'ui.grid', 'ui.grid.autoResize', 'ui.grid.resizeColumns', 'ui.grid.selection', 'ui.grid.cellNav', 'ui.grid.edit', 'angularGrid']);

    angular.module('app').config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
        $routeProvider.when('/', {
            templateUrl: "app/company/login/login.html"
            //templateUrl: "app/test/test.html"

            //resolve: resolveController('/app/company/login/login.js')
            //controller: 'myController'
        })
            .when('/mainmenu', {
                templateUrl: "app/company/mainmenu/mainmenu.html"
                //controller: 'mainMenuCtrl'
            });

        $routeProvider.otherwise({redirectTo: '/'});
        //$locationProvider.html5Mode(true);
    }]);

    // Initialize Global Values
    angular.module('app').run(["$rootScope", function ($rootScope) {
        //$.material.init(); // Bootstrap Material Design

        $rootScope.companyVersion = 'V0.2.4';
    }]);

})();