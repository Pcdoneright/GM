///<reference path="../../typings/app.d.ts" />

(function () {
    'use strict';

    // Required by Application
    // Keeps Global Variable and Data
    angular.module('app').service('CompanySvc', ['$rootScope', '$http', '$q', '$timeout', '$window', '$filter', '$mdDialog', 'toastr', 'DataSvc',
        function ($rootScope, $http, $q, $timeout, $window, $filter, $mdDialog, toastr, DataSvc) {
            var me = this;
            $rootScope.hourGlassLoading = false; // Global
            me.menu = [];
            me.userInfo = {};
            me.overrideinput = '';
            me.inputDialogValue = '';

            //toastr.info('companySvc');

            this.ofSetHourGlass = function (pVal) {
                $rootScope.hourGlassLoading = pVal;
            };

            this.ofSetMenu = function (pMenu) {
                me.menu = pMenu;
            };

            this.ofGetMenu = function () {
                return me.menu;
            };

            this.ofSetUser = function (pUser) {
                me.userInfo = pUser;
            };

            // Create Report Request and send to sender
            this.ofCreateReport = function (pDwName, pParameters, pfpriority?:number) {
                var mData = [], mRptH = [], mRptP = [];
                var deferred = $q.defer();

                // Create reportheaders
                mRptH.push({fdwname: pDwName, fpriority: (pfpriority) ? pfpriority : 1});
                // Create reportparameters
                pParameters.forEach(function (pValue) {
                    mRptP.push(pValue);
                });

                mData.push(['reportheaders', mRptH]);
                mData.push(['reportparameters', mRptP]);

                // Send data to server and response will be the filename
                DataSvc.serverDataPost('api/Company/PostCreateReport', mData).then(function (dataResponse) {
                    deferred.resolve(dataResponse);
                });

                //$http({
                //    method: 'POST',
                //    url: 'api/Company/PostCreateReport',
                //    headers: { 'Content-Type': 'application/json' },
                //    data: mData
                //}).success(function(data){
                //    deferred.resolve(data);
                //}).error(function(){
                //    deferred.reject("error from server using: PostCreateReport");
                //    toastr.error("error from server using: PostCreateReport"); // Show toastr with error
                //});

                return deferred.promise;
            };

            // Create Report Request and send to sender
            this.ofCreateJasperReport = function(pDwName, pParameters) {
                var deferred = $q.defer();

                // Send data to server and response wich will be the filename
                DataSvc.serverDataPost('api/Company/PostCreateJasperReport', '', {rptname: pDwName, rptparm: pParameters}).then(function (dataResponse) {
                    deferred.resolve(dataResponse);
                });

                return deferred.promise;
            };

            // Opens a file from the server but loops every 3 seconds until file exist.
            this.ofOpenServerFile = function (pUrl) {
                var me = this, request = new XMLHttpRequest();

                request.open('HEAD', pUrl, false);
                request.send();

                if (request.status == 200) {
                    $rootScope.hourGlassLoading = false;
                    $rootScope.$apply();
                    //file exists
                    window.open(pUrl);
                    //$timeout(function () {window.open(pUrl);}, 1000); // Wait 1 second before opening to allow pb to save the file
                } else {
                    // call every 3 second
                    $timeout(function () {
                        me.ofOpenServerFile(pUrl);
                    }, 3000);
                }

                //var me = this;
                //// jquery to check for file existance
                //$.ajax({
                //    url: pUrl,
                //    type:'HEAD',
                //    error: function()
                //    {
                //        // call every 3 second
                //        $timeout(function() {me.ofOpenServerFile(pUrl);}, 3000);
                //    },
                //    success: function()
                //    {
                //        //CompanySvc.ofSetHourGlass(true);
                //        $rootScope.hourGlassLoading = false;
                //        $rootScope.$apply();
                //        //file exists
                //        window.open(pUrl);
                //    }
                //});
            };

            // Print PDF but still requires pressing a button
            this.printPdf = function(url) {
                var iframe = this._printIframe;
                if (!this._printIframe) {
                    iframe = this._printIframe = document.createElement('iframe');
                    document.body.appendChild(iframe);

                    iframe.style.display = 'none';
                    iframe.onload = function() {
                        setTimeout(function() {
                            iframe.focus();
                            iframe.contentWindow.print();
                        }, 1);
                    };
                }
                iframe.src = url;
            };

            // Checks a file from the server but loops every 3 seconds until file exist and calls back function.
            this.ofCheckServerFile = function (pUrl, pCallBack) {
                var me = this, request = new XMLHttpRequest();

                request.open('HEAD', pUrl, false);
                request.send();

                if (request.status == 200) {
                    $rootScope.hourGlassLoading = false;
                    $rootScope.$apply();
                    //file exists
                    if (pCallBack) $timeout(() => pCallBack(), 1000);
                } else {
                    // call every 3 second
                    $timeout(function () {
                        me.ofCheckServerFile(pUrl, pCallBack);
                    }, 3000);
                }
            };

            // Return a valid number either float or int
            this.validNumber = function(value, decimals?) {
                if (!value) return 0;
                if(!decimals) decimals = 0; // default

                // Convert to number
                var clean = value.replace(/[^0-9\.\-]/g, ''); // Allow negative too
                if (decimals > 0) {
                    var decimalCheck = clean.split('.');
                    if (!angular.isUndefined(decimalCheck[1])) {
                        decimalCheck[1] = decimalCheck[1].slice(0, decimals); // Get decimal values
                        clean = decimalCheck[0] + '.' + decimalCheck[1];
                    }
                }
                if (!clean) return 0; // if invalid return 0
                clean = (decimals == 0) ? parseInt(clean, 10) : parseFloat(clean); // float if decimals = 0
                return clean;
            };

            // For Angular-Grid
            this.currencyRenderer = (params) => {
                return $filter('currency')(params.value);
            };

            // For Angular-Grid
            this.dateRenderer = (params) => {
                if (params.value === null || params.value === undefined) return null;

                return $filter('date')(params.value, 'MM/dd/yyyy');
            };

            // For Angular-Grid
            this.phoneRenderer = (params) => {
                if (params.value === null || params.value === undefined) return null;
                return params.value.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
            };

            // Validate Supervisor Code
            this.overrideAdmin = function() {
                var deferred = $q.defer();

                $mdDialog.show({
                    targetEvent: event,
                    locals: {parent: me, $mdDialog: $mdDialog},
                    controller: angular.noop,
                    controllerAs: 'c',
                    bindToController: true,
                    //templateUrl: 'app/templates/itemoptionslist.tmpl.html'
                    template:
                    '<md-dialog aria-label="Change Qty">' +
                    '  <md-dialog-content>'+
                    '    <h2>Admin Override Code</h2>' +
                    '    <div class="m-input-inline">' +
                    '       <input type="password" ng-model="c.parent.overrideinput" auto-focus="600" ng-model-options="{updateOn: \'blur\'}"/>' +
                    '    </div>' +
                    '  </md-dialog-content>' +
                    '  <div class="md-actions">' +
                    '    <md-button ng-click="c.$mdDialog.hide()" class="md-primary">Continue</md-button>' +
                    '  </div>' +
                    '</md-dialog>',
                }).then( () => {
                    if (me.overrideinput == '') {
                        deferred.reject();
                        return;
                    }
                    // Validate value entered
                    return DataSvc.serverDataGet('api/CompanyMaint/GetValidatePOSOverride', {pfposoverride: me.overrideinput}).then( (dataResponse) => {
                        me.overrideinput = ''; // Clear Value
                        if (dataResponse.validate)
                            deferred.resolve(); // Only if validated
                        else
                            deferred.reject();
                    });
                });

                return deferred.promise;
            };

            // Request input text
            this.inputTextDialog = function(title, value, event) {
                me.inputDialogValue = value; // assign value

                return $mdDialog.show({
                    targetEvent: event,
                    locals: {parent: me, $mdDialog: $mdDialog},
                    controller: angular.noop,
                    controllerAs: 'c',
                    bindToController: true,
                    template: '<md-dialog aria-label="Title">' +
                    '  <md-dialog-content>' +
                    '    <h2>' + title + '</h2>' +
                    '    <div class="m-input-inline">' +
                    '       <input type="text" ng-model="c.parent.inputDialogValue" auto-focus="600" ng-model-options="{updateOn: \'blur\'}"/>' +
                    '    </div>' +
                    '  </md-dialog-content>' +
                    '  <div class="md-actions">' +
                    '    <md-button ng-click="c.$mdDialog.hide()" class="md-primary">Continue</md-button>' +
                    '  </div>' +
                    '</md-dialog>',
                }).then( () => {
                    return me.inputDialogValue; // Return Input
                });
            };

            // Request input number
            this.inputNumberDialog = function(title, value) {
                me.inputDialogValue = value; // assign value

                return $mdDialog.show({
                    targetEvent: event,
                    locals: {parent: me, $mdDialog: $mdDialog},
                    controller: angular.noop,
                    controllerAs: 'c',
                    bindToController: true,
                    template:
                    '<md-dialog aria-label="Title">' +
                    '  <md-dialog-content>'+
                    '    <h2>' + title + '</h2>' +
                    '    <div class="m-input-inline">' +
                    '       <input type="text" ng-model="c.parent.inputDialogValue" valid-number format-value="number" model-value="integer" auto-focus="600" ng-model-options="{updateOn: \'blur\'}"/>' +
                    '    </div>' +
                    '  </md-dialog-content>' +
                    '  <div class="md-actions">' +
                    '    <md-button ng-click="c.$mdDialog.hide()" class="md-primary">Continue</md-button>' +
                    '  </div>' +
                    '</md-dialog>',
                }).then( () => {
                    return me.inputDialogValue; // Return Input
                });
            };

            // Request input float
            this.inputAmountDialog = function(title, value) {
                me.inputDialogValue = value; // assign value

                return $mdDialog.show({
                    targetEvent: event,
                    locals: {parent: me, $mdDialog: $mdDialog},
                    controller: angular.noop,
                    controllerAs: 'c',
                    bindToController: true,
                    template:
                    '<md-dialog aria-label="Title">' +
                    '  <md-dialog-content>'+
                    '    <h2>' + title + '</h2>' +
                    '    <div class="m-input-inline">' +
                    '       <input type="text" ng-model="c.parent.inputDialogValue" valid-number format-value="number" model-value="float" auto-focus="600" ng-model-options="{updateOn: \'blur\'}"/>' +
                    '    </div>' +
                    '  </md-dialog-content>' +
                    '  <div class="md-actions">' +
                    '    <md-button ng-click="c.$mdDialog.hide()" class="md-primary">Continue</md-button>' +
                    '  </div>' +
                    '</md-dialog>',
                }).then( () => {
                    return me.inputDialogValue; // Return Input
                });
            };

            // Display Message
            // Request input text
            this.showDialog = function(title, value, event) {
                return $mdDialog.show({
                    targetEvent: event,
                    locals: {parent: me, $mdDialog: $mdDialog},
                    controller: angular.noop,
                    controllerAs: 'c',
                    bindToController: true,
                    template: '<md-dialog aria-label="Title">' +
                    '  <md-dialog-content>' +
                    '    <h2>' + title + '</h2>' +
                    '    <div class="m-input-inline">' +
                    '       <label style="font-size: 32px;">' + value + '</label>' +
                    '    </div>' +
                    '  </md-dialog-content>' +
                    '  <div class="md-actions">' +
                    '    <md-button ng-click="c.$mdDialog.hide()" class="md-primary">Continue</md-button>' +
                    '  </div>' +
                    '</md-dialog>',
                }).then( () => {});
            };
        }]);

    // ------------------------------------------------------------------------------
    // Communicates With Server WebAPI
    // ------------------------------------------------------------------------------
    angular.module('app').service('DataSvc', ['$http', '$q', '$filter', '$rootScope', 'toastr', function ($http, $q, $filter, $rootScope, toastr) {
        // Return a promise
        this.serverDataGet = function (pUrl, pParms) {
            var deferred = $q.defer();

            // Before sending to server convert date(only not datetime) to string to have current values instead of zulu
            convertDateDatesToString(pParms);

            $http({
                method: 'GET',
                url: pUrl,
                params: pParms
            }).success(function (data) {

                // Before receiving date from server convert string to date
                convertStringToDate(data);

                deferred.resolve(data);
            }).error(function () {
                deferred.reject("error from server using: " + pUrl);
                toastr.error("error from server using: " + pUrl); // Show toastr with error
                $rootScope.hourGlassLoading = false; // Re-enable access
                //CompanySvc.ofSetHourGlass(false); // Re-enable access
            });

            return deferred.promise;
        };

        // Return a promise
        this.serverDataPost = function (pUrl, pData, pParms) {
            var deferred = $q.defer();

            // Before sending to server convert date(only not datetime) to string to have current values instead of zulu
            convertDateDatesToString(pData);

            $http({
                method: 'POST',
                url: pUrl,
                params: pParms,
                data: pData
            }).success(function (data) {
                deferred.resolve(data);
            }).error(function () {
                deferred.reject("error from server using: " + pUrl);
                toastr.error("error from server using: " + pUrl); // Show toastr with error
                $rootScope.hourGlassLoading = false; // Re-enable access
                //CompanySvc.ofSetHourGlass(false); // Re-enable access
            });

            return deferred.promise;
        };

        // Convert Date to String before it gets send to server
        function convertDateDatesToString(input) {
            // Ignore things that aren't objects.
            if (typeof input !== "object") return input;

            for (var key in input) {
                if (!input.hasOwnProperty(key)) continue;

                var value = input[key];
                if (typeof value === 'string' || value === null) continue; // Exit for non-objects

                // Check for object properties which look like dates.
                if (typeof value === 'object' && Object.getPrototypeOf(value).toString() === "Invalid Date") {
                    // Convert only date with zero time (getHours() always show a number)
                    if (value.getMinutes() + value.getSeconds() === 0) {
                        input[key] = $filter('date')(value, 'yyyy-MM-dd 00:00:00'); // Covert to String for proper datetime
                        //console.log(input[key]);
                    }
                } else if (typeof value === "object") {
                    // Recurse into object
                    convertDateDatesToString(value);
                }
            }
        }


        //var regexIso8601 = /^(\d{4}|\+\d{6})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})\.(\d{1,})(Z|([\-+])(\d{2}):(\d{2}))?)?)?)?$/;
        //var regexIso8601 = /^(\d{4})-0?(\d+)-0?(\d+)[T ]0?(\d+):0?(\d+):0?(\d+)$/;
        // Translation: dec(x4),dash,opt 0,dec(x1+),dash,"T",opt 0,dec(1+),":", opt 0, dec(1+), ":", opt 0, dec(1+), opt "Z"
        var regexIso8601 = /^(\d{4})-0?(\d+)-0?(\d+)[T ]0?(\d+):0?(\d+):0?(\d+)Z?/;
        // Convert String to Date object
        function convertStringToDate(input) {
            // Ignore things that aren't objects.
            if (typeof input !== "object") return input;

            for (var key in input) {
                if (!input.hasOwnProperty(key)) continue;

                var value = input[key];
                var match;
                // Check for string properties which look like dates.
                if (typeof value === "string" && (match = value.match(regexIso8601))) {
                    //console.log(value);
                    // Use 12 hr o make sure date stays the same for Non-Timestamps
                    if (value.slice(-1) !== 'Z') value = value.replace("T00", "T12");
                    input[key] = new Date(value);
                    //console.log(input[key]);
                } else if (typeof value === "object") {
                    // Recurse into object
                    convertStringToDate(value);
                }
            }
        }

        //console.log('dataService'); 1 instance is created only.
    }]);
})();