
(function(){
    'use strict';

    angular.module('app').controller('myController', ['$rootScope', '$scope', 'CompanySvc', '$location', 'DataSvc', 'toastr',
        function($rootScope, $scope, CompanySvc, $location, DataSvc, toastr){
        //showAngularStats({"position": "topright"}); // Debug only
        var me = this;
        me.userid = "";
        me.password = "";

        // Get Company Name
        DataSvc.serverDataGet('api/Company/GetCompanyName').then(function(dataResponse) {
            $rootScope.companyName = dataResponse;
        });

        // Validate Login and Get Menu Data
        this.ofLogin = function(){
            CompanySvc.ofSetHourGlass(true);
            DataSvc.serverDataGet('api/Login/GetLogin', { userid: me.userid, pswd: me.password }).then(function(dataResponse) {
                CompanySvc.ofSetHourGlass(false);
                if (dataResponse.success) {
                    CompanySvc.ofSetMenu(dataResponse.data);
                    CompanySvc.ofSetUser(dataResponse.user);
                    $location.url('/mainmenu');
                }
                else
                    toastr.error('Invalid User ID or Password.');
            });
        };
    }]);

})();