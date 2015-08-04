///<reference path="../../typings/app.d.ts" />

// Number Round-2-decimal For easy access when dealing with floats
function r2d(value) {
    return Math.round(value * 1e2) / 1e2;
}

//function GetBrowser()
//{
//    return  navigator ? navigator.userAgent.toLowerCase() : "other";
//}

//// Override Date.parse to prevent Chrome v.35 from converting date to UTC
//if (navigator.userAgent.indexOf("Chrome") != -1) {
//    var orgDateParse = Date.parse; // Save pointer to original func
//    Date.parse = function (sDateString) {
//        sDateString = sDateString.replace('T', ' '); // Replace T from time
//        return orgDateParse(sDateString);
//    }
//}
//// Override Date.parse to prevent Safari v.7.0.1 from converting date to UTC
//else if (navigator.userAgent.indexOf("Safari") != -1) {
//    var orgDateParse = Date.parse; // Save pointer to original func
//    Date.parse = function (sDateString) {
//        sDateString = sDateString.replace('T', ' '); // Replace T from time
//        sDateString = sDateString.replace(/-/g, '/'); // Replace all - from date
//        return orgDateParse(sDateString);
//    }
//}

// Get Number of Watchers on Angular
// getWatchers().length
function getWatchers(root) {
    root = angular.element(root || document.documentElement);
    var watcherCount = 0;

    function getElemWatchers(element) {
        var isolateWatchers = getWatchersFromScope(element.data().$isolateScope);
        var scopeWatchers = getWatchersFromScope(element.data().$scope);
        var watchers = scopeWatchers.concat(isolateWatchers);
        angular.forEach(element.children(), function (childElement) {
            watchers = watchers.concat(getElemWatchers(angular.element(childElement)));
        });
        return watchers;
    }

    function getWatchersFromScope(scope) {
        if (scope) {
            return scope.$$watchers || [];
        } else {
            return [];
        }
    }

    return getElemWatchers(root);
}

// Custom Filter to Phone
angular.module('app').filter('phone', ['CompanySvc', function(CompanySvc) {
    return function(input) {
        return CompanySvc.phoneRenderer({value: input});
    };
}]);

// Set assigned element Height to this element height (usually <div>)
// attributes used:
// el-set-height-for: 'id' of element to resize
angular.module('app').directive('elSetHeightFor', ['$window', '$timeout', function ($window, $timeout) {
    return {
        link: function (scope, elem, attrs) {
            scope.onResize = function () {
                // Use timeout to make sure container resizes properly
                $timeout(function () {
                    //    console.log('this: ' + elem.height());
                    //    console.log('element: ' + angular.element('#' + attrs['elSetHeightFor']).height());

                    angular.element('#' + attrs['elSetHeightFor']).height(elem.height());
                    //console.log('after element:' + elem.height());
                }, 10);
                //console.log('resize');
            };
            scope.onResize(); // Run at start

            angular.element($window).bind('resize', function () {
                scope.onResize();
            });
        }
    }
}]);

// Auto Focus to this element from HTML
angular.module('app').directive('autoFocus', ['$timeout', function($timeout) {
    return {
        restrict: 'AC',
        link: function(_scope, _element, attrs) {
            var timelen = attrs.autoFocus || 0; // Default time 0
            $timeout(function(){
                _element[0].focus();
                if (_element[0].select) _element[0].select(); // Could be <Select>
            }, timelen);
        }
    };
}]);

// Assign to <Input Text> to accept valid numbers only
// attributes used:
// format-value: any valid format value 'number', 'c2'
// model-type: 'string', 'integer', 'float'
//app.directive('validNumber', ['$filter', function($filter) {
//    return {
//        require: '?ngModel',
//        link: function(scope, element, attrs, ngModelCtrl) {
//            var modelType = attrs.modelValue || 'integer';
//            var formatValue = attrs.formatValue || 'number';
//
//            if(!ngModelCtrl) {
//                return;
//            }
//
//            // From user-to-Model
//            ngModelCtrl.$parsers.push(function(val) {
//                if (angular.isUndefined(val)) {
//                    val = '';
//                }
//                var clean = val.replace(/[^0-9\.]/g, '');
//                var decimalCheck = clean.split('.');
//
//                if(!angular.isUndefined(decimalCheck[1])) {
//                    decimalCheck[1] = decimalCheck[1].slice(0,2);
//                    clean =decimalCheck[0] + '.' + decimalCheck[1];
//                }
//
//                if (val !== clean) {
//                    ngModelCtrl.$setViewValue(clean);
//                    ngModelCtrl.$render();
//                }
//
//                // check model type to save
//                if (modelType === 'integer') { clean = parseInt(clean, 10);}
//                else if (modelType === 'float') { clean = parseFloat(clean, 10);}
//
//                //console.log('parser:' + clean);
//                return clean;
//            });
//
//            // From Model to User
//            ngModelCtrl.$formatters.push(function(viewValue){
//                //console.log('formater:' + viewValue);
//                return $filter(formatValue)(viewValue);
//            });
//
//            // Trap for [space] key
//            element.bind('keypress', function(event) {
//                if(event.keyCode === 32) {
//                    event.preventDefault();
//                }
//            });
//
//            // When focus leaves reformat display only
//            element.bind('blur', function()
//            {
//                ngModelCtrl.$viewValue = $filter(formatValue)(ngModelCtrl.$modelValue);
//                ngModelCtrl.$render();
//                //console.log(ngModelCtrl.$viewValue);
//                //element.removeClass('selected');
//            });
//        }
//    };
//}]);

angular.module('app').directive('validNumber', ['$filter', '$timeout', function ($filter, $timeout) {
    return {
        require: '?ngModel',
        link: function (scope, element, attrs, ngModelCtrl) {

            if (!ngModelCtrl) return;
            if (!ngModelCtrl.$options) ngModelCtrl.$options = {updateOn: 'blur'}; // Add updateOnBlur

            var modelType = attrs.modelValue || 'integer';
            var formatValue = attrs.formatValue || 'number';

            // From user-to-Model only onblur
            ngModelCtrl.$parsers.push(function (val) {
                var clean = val.replace(/[^0-9\.-]/g, ''); //Remove non-numeric, period or minus char

                if (clean === '') clean = '0';
                else if (isNaN(clean)) clean = '0'; // If not a number return 0

                ngModelCtrl.$viewValue = $filter(formatValue)(clean); // Set value for display
                ngModelCtrl.$render();

                // check model type to save
                if (modelType === 'integer') {
                    clean = parseInt(clean, 10);
                }
                else if (modelType === 'float') {
                    clean = parseFloat(clean, 10);
                }

                //console.log('parser:' + clean);
                return clean;
            });

            // From Model to User
            ngModelCtrl.$formatters.push(function (viewValue) {
                //console.log('formater:' + viewValue);
                return $filter(formatValue)(viewValue);
            });

            // Trap for [space] key
            element.bind('keypress', function (event) {
                if (event.keyCode === 32) {
                    event.preventDefault();
                }
            });
        }
    };
}]);

// Used only for those cells that DONOT capture 'afterCellEdit' event since old and new values will be same here
angular.module('app').directive('validNumberGrid', ['$filter', '$timeout', 'uiGridEditConstants', function ($filter, $timeout, uiGridEditConstants) {
    return {
        require: '?ngModel',
        link: function (scope, element, attrs, ngModelCtrl) {
            if (!ngModelCtrl) return;
            if (!ngModelCtrl.$options) ngModelCtrl.$options = {updateOn: 'blur'}; // Add updateOnBlur

            var modelType = attrs.modelValue || 'integer';
            var formatValue = attrs.formatValue || 'number';

            // From user-to-Model only onblur
            ngModelCtrl.$parsers.push(function (val) {
                var clean = val.replace(/[^0-9\.-]/g, ''); //Remove non-numeric, period or minus char

                if (clean === '') clean = '0';
                else if (isNaN(clean)) clean = '0'; // If not a number return 0

                // No needed inside a ui-grid
                //ngModelCtrl.$viewValue = $filter(formatValue)(clean); // Set value for display
                //ngModelCtrl.$render();

                // check model type to save
                if (modelType === 'integer') {
                    clean = parseInt(clean, 10);
                }
                else if (modelType === 'float') {
                    clean = parseFloat(clean, 10);
                }

                return clean;
            });

            // From Model to User
            ngModelCtrl.$formatters.push(function (viewValue) {
                //console.log('formater:' + viewValue);
                return $filter(formatValue)(viewValue);
            });

            // Trap for [space] key
            element.bind('keypress', function (event) {
                if (event.keyCode === 32) {
                    event.preventDefault();
                }
            });

            //set focus at start of edit
            scope.$on(uiGridEditConstants.events.BEGIN_CELL_EDIT, function () {
                attrs.$set('style', 'width:93%;height:28px;border: 1px solid #2587ce;padding-left: 5px;'); // Set style
                //element[0].style.width = (element[0].parentElement.offsetWidth - 8) + 'px';
                //element[0].style.height = (element[0].parentElement.offsetHeight - 4) + 'px';
                element[0].focus();
                element[0].select();
                //console.log(element[0]);
                //console.log('ngGridEventStartCellEdit');
            });

            // When focus leaves reformat display only
            element.bind('blur', function () {
                scope.$emit(uiGridEditConstants.events.END_CELL_EDIT);
                //console.log('events.END_CELL_EDIT');
            });
        }
    };
}]);

// Used only for those cells that 'afterCellEdit' event is capture since old and new values will be different here
angular.module('app').directive('validNumberGridAce', ['$filter', '$timeout', 'uiGridEditConstants', function ($filter, $timeout, uiGridEditConstants) {
    return {
        require: '?ngModel',
        link: function (scope, element, attrs, ngModelCtrl) {
            var modelType = attrs.modelValue || 'integer';
            var formatValue = attrs.formatValue || 'number';
            var decimal = attrs.decimalValue || 2;

            if (!ngModelCtrl) {
                return;
            }

            // From user-to-Model
            ngModelCtrl.$parsers.push(function (val) {
                if (angular.isUndefined(val)) {
                    val = '';
                }
                //var clean = val.replace(/[^0-9\.]/g, '');
                var clean = val.replace(/[^0-9\.\-]/g, ''); // Allow negative too
                var decimalCheck = clean.split('.');

                if (!angular.isUndefined(decimalCheck[1])) {
                    decimalCheck[1] = decimalCheck[1].slice(0, decimal); // Get decimal values
                    clean = decimalCheck[0] + '.' + decimalCheck[1];
                }

                if (val !== clean) {
                    ngModelCtrl.$setViewValue(clean);
                    ngModelCtrl.$render();
                }

                // check model type to save
                if (modelType === 'integer') {
                    clean = parseInt(clean, 10);
                }
                else if (modelType === 'float') {
                    clean = parseFloat(clean);
                }

                //console.log('parser:' + clean);
                return clean;
            });

            // From Model to User
            ngModelCtrl.$formatters.push(function (viewValue) {
                //console.log('formater:' + viewValue);
                return $filter(formatValue)(viewValue);
            });

            // Trap for [space] key
            element.bind('keypress', function (event) {
                if (event.keyCode === 32) {
                    event.preventDefault();
                }
            });

            //set focus at start of edit
            scope.$on(uiGridEditConstants.events.BEGIN_CELL_EDIT, function () {
                attrs.$set('style', 'width:93%;height:28px;border: 1px solid #2587ce;padding-left: 5px;'); // Set repeating style
                element[0].focus();
                element[0].select();
            });

            // When focus leaves reformat display only
            element.bind('blur', function () {
                ngModelCtrl.$viewValue = $filter(formatValue)(ngModelCtrl.$modelValue);
                ngModelCtrl.$render();

                scope.$emit(uiGridEditConstants.events.END_CELL_EDIT);
                //console.log('ngGridEventEndCellEdit');
            });
        }
    };
}]);

angular.module('app').directive('upperCase', [function () {
    return {
        require: '?ngModel',
        link: function (scope, element, attrs, ngModelCtrl) {

            if (!ngModelCtrl) return;
            if (!ngModelCtrl.$options) ngModelCtrl.$options = {updateOn: 'blur'}; // Add updateOnBlur
            //attrs.$set('style', 'text-transform: uppercase;'); // Add uppercase style
            element.addClass('uppercase'); // Add class instead of overriding css

            // From user-to-Model only onblur
            ngModelCtrl.$parsers.push(function (val) {
                return val.toUpperCase();
            });
        }
    };
}]);

// Phone Number format
angular.module('app').directive('phoneNumber', ['CompanySvc', function (CompanySvc) {
    return {
        require: '?ngModel',
        link: function (scope, element, attrs, ngModelCtrl) {

            if (!ngModelCtrl) return;
            if (!ngModelCtrl.$options) ngModelCtrl.$options = {updateOn: 'blur'}; // Add updateOnBlur

            // From user-to-Model only onblur
            ngModelCtrl.$parsers.push(function (val) {
                var clean = val.replace(/[()\.-]/g, ''); //Remove non-numeric, period or minus char
                clean = clean.replace(' ', ''); // Remove blank spaces

                ngModelCtrl.$viewValue = CompanySvc.phoneRenderer({value: clean}); // Set value for display
                ngModelCtrl.$render();

                return clean;
            });

            // From Model to User
            ngModelCtrl.$formatters.push(function (viewValue) {
                //console.log('formater:' + viewValue);
                return CompanySvc.phoneRenderer({value: viewValue});
            });
        }
    };
}]);

// Maximun # of characters specified
angular.module('app').directive('maxLength', [function () {
    return {
        require: '?ngModel',
        link: function (scope, element, attrs, ngModelCtrl) {

            if (!ngModelCtrl) return;
            if (!ngModelCtrl.$options) ngModelCtrl.$options = {updateOn: 'blur'}; // Add updateOnBlur
            var maxlength = Number(attrs.maxLength);

            // From user-to-Model only onblur
            ngModelCtrl.$parsers.push(function (val) {
                if (val.length > maxlength) {
                    var transformedInput = val.substring(0, maxlength);
                    ngModelCtrl.$setViewValue(transformedInput);
                    ngModelCtrl.$render();
                    return transformedInput;
                }
                return val;
            });
        }
    };
}]);

//app.directive('mNumberInput', function () {
//    return {
//        restrict: 'EA',
//        //template: '<input name="{{inputName}}" ng-model="inputValue" />',
//        //template: '<input type="number" ng-model="inputValue" class="m-input-numberic"><label>{{inputValue | formatValue}}</label>',
//        //scope: {
//        //    inputValue: '=',
//        //    inputName: '=',
//        //    formatValue: '='
//        //},
//
//        //template: '<input type="number" ng-model="inputValue" class="m-input-numberic"><label>{{inputValue | formatValue }}</label>',
//        //template: '<input type="number" ng-model="inputValue" class="m-input-numeric"><label class="m-input-numeric-label">{{inputValue}}</label>',
//
//        template: function(element, attrs) {
//            //var htmlText = '<input flex type="number" ng-model="' + attrs.inputValue + '" class="m-input-numberic">';
//            var formatValue = attrs.formatValue || 'numeric';
//            var htmlText = '<input type="number" ng-model="' + attrs.inputValue + '" Xclass="m-input-numeric">' +
//                '<label Xclass="m-input-numeric-label">{{' + attrs.inputValue + ' | ' +  formatValue + '}}</label>';
//            //var htmlText = '<input type="tel" ng-model="' + attrs.inputValue + '" class="m-input-numeric">' +
//            //    '<label class="m-input-numeric-label">{{' + attrs.inputValue + ' | ' +  formatValue + '}}</label>';
//
//            //var type = attrs.type || 'text';
//            //var required = attrs.hasOwnProperty('required') ? "required='required'" : "";
//            //var htmlText = '<div class="control-group">' +
//            //    '<label class="control-label" for="' + attrs.formId + '">' + attrs.label + '</label>' +
//            //    '<div class="controls">' +
//            //    '<input type="' + type + '" class="input-xlarge" id="' + attrs.formId + '" name="' + attrs.formId + '" ' + required + '>' +
//            //    '</div>' +
//            //    '</div>';
//            return htmlText;
//        },
//
//        //compile: function(element, attrs)
//        //{
//        //    //var type = attrs.type || 'text';
//        //    //var required = attrs.hasOwnProperty('required') ? "required='required'" : "";
//        //    //
//        //    ////var htmlText = '<input flex type="number" ng-model="' + attrs.inputValue + '" class="m-input-numberic">' +
//        //    ////    '<label>{{' + attrs.inputValue + ' | ' +  attrs.formatValue + '}}</label>';
//        //    //var htmlText = '<input flex type="number" ng-model="' + attrs.inputValue + '" class="m-input-numberic">';
//        //    //
//        //    //var xhtmlText = '<div class="control-group">' +
//        //    //    '<label class="control-label" for="' + attrs.formId + '">' + attrs.label + '</label>' +
//        //    //    '<div class="controls">' +
//        //    //    '<input type="' + type + '" class="input-xlarge" id="' + attrs.formId + '" name="' + attrs.formId + '" ' + required + '>' +
//        //    //    '</div>' +
//        //    //    '</div>';
//        //    //
//        //    //element.replaceWith(htmlText);
//        //}
//        //link: function (scope) {
//        //    scope.$watch('inputValue', function(newValue, oldValue) {
//        //        var arr = String(newValue).split("");
//        //        if (arr.length === 0) return;
//        //        if (arr.length === 1 && (arr[0] == '-' || arr[0] === '.' )) return;
//        //        if (arr.length === 2 && newValue === '-.') return;
//        //        if (isNaN(newValue)) {
//        //            scope.inputValue = oldValue;
//        //        }
//        //    });
//        //}
//    };
//});

//app.directive('numberOnlyInput', function () {
//    return {
//        restrict: 'EA',
//        template: '<input name="{{inputName}}" ng-model="inputValue" />',
//        scope: {
//            inputValue: '=',
//            inputName: '='
//        },
//        link: function (scope) {
//            scope.$watch('inputValue', function(newValue, oldValue) {
//                var arr = String(newValue).split("");
//                if (arr.length === 0) return;
//                if (arr.length === 1 && (arr[0] == '-' || arr[0] === '.' )) return;
//                if (arr.length === 2 && newValue === '-.') return;
//                if (isNaN(newValue)) {
//                    scope.inputValue = oldValue;
//                }
//            });
//        }
//    };
//});

// gridFooterFor directive
//
// <wj-flex-grid grid-footer-for="ownerGridId" ...
//
//app.directive('gridFooterFor', function () {
//
//    return {
//        restrict: 'A',
//        link: function (scope, element, attrs) {
//
//            // get control instance, assert type
//            var flex = wijmo.Control.getControl(element[0]);
//            flex = wijmo.asType(flex, wijmo.grid.FlexGrid);
//
//            // get master grid that controls this footer grid
//            var masterId = attrs['gridFooterFor'];
//            var masterHost = document.getElementById(masterId);
//            var masterFlex = wijmo.Control.getControl(masterHost);
//            wijmo.assert(flex && masterFlex && flex != masterFlex, 'bad parameters');
//
//            // configure footer grid
//            flex.isReadOnly = true;
//            flex.selectionMode = wijmo.grid.SelectionMode.None;
//            flex.headersVisibility = masterFlex.headersVisibility;
//            flex.columnHeaders.rows.clear();
//            var row = new wijmo.grid.Row();
//            row.cssClass = 'wj-footer-grid';
//            flex.rows.push(row);
//
//            // remove scrollbars from footer grid
//            var root = flex.hostElement.querySelector('[wj-part="root"]');
//            root.style.overflow = 'hidden';
//
//            // synchronize columns with master grid
//            var extraCol = new wijmo.grid.Column();
//            masterFlex.draggedColumn.addHandler(syncCols);
//            masterFlex.resizedColumn.addHandler(syncCols);
//            masterFlex.columns.collectionChanged.addHandler(syncCols);
//            function syncCols() {
//
//                // copy columns/sizes etc
//                flex.columnLayout = masterFlex.columnLayout;
//                flex.columns.push(extraCol);
//
//                // set content of footer grid
//                for (var i = 0; i < masterFlex.columns.length; i++) {
//                    var col = masterFlex.columns[i];
//                    var data = col.header ? col.header : col.binding;
//                    flex.setCellData(0, i, 'f(' + data + ')', false);
//                }
//            }
//
//            // synchronize scroll position with master grid
//            masterFlex.scrollPositionChanged.addHandler(function () {
//                flex.scrollPosition = masterFlex.scrollPosition;
//            });
//        }
//    };
//});
