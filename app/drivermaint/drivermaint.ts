///<reference path="../../typings/app.d.ts" />
///<reference path="../../app/services/DataEntrySvc.ts" />

class driverMaint {
    gHeight: number;
    dESrvc: app.IDataEntrySrvc;
    driver: app.IDataStore;
    driverGrid: any;

    static $inject = ['$scope', '$timeout', '$window', '$filter', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'uiGridConstants', 'DataEntrySvc'];
    constructor(private $scope, private $timeout:ng.ITimeoutService, private $window:ng.IWindowService, private $filter, private $mdDialog, private DataSvc, private CompanySvc, private toastr:toastr.IToastrService, private uiGridConstants, private DataEntrySvc) {

        // New Data Entry Service Instance
        this.dESrvc = DataEntrySvc.Instance();

        // Data Stores, Unique Keys, updatable, validate fields
        this.driver = this.dESrvc.newDataStore('drivers', ['fdvid'], true, ['fname', 'fphone', 'fregion']);

        // Get Customer Terms for DropDown
        DataSvc.serverDataGet('api/DriversMaint/Getlist').then((dataResponse) => {
            this.driver.loadData(dataResponse);
        });

        angular.element($window).bind('resize', this.onResizeWindow); //Capture resize event
        this.onResizeWindow(); // Execute at start
        this.initGrids();

        // Get Groups
        DataSvc.serverDataGet('api/UserMaint/GetUserList').then((dataResponse) => {
            this.driverGrid.columnDefs[2].editDropdownOptionsArray = dataResponse;
        });

        this.dESrvc.initCodeTable().then((dataResponse) => {
            this.driverGrid.columnDefs[3].editDropdownOptionsArray = $filter('filter')(dataResponse, {fgroupid: "REG"}); // Assign ddw to grid column
        });

        // afterCellEdit + cellnav for grid
        this.driverGrid.onRegisterApi = (gridApi) => {
            this.driverGrid.gridApi = gridApi; // Save ref to grid

            // Cell Navigation
            gridApi.cellNav.on.navigate($scope, (newRowcol, oldRowCol) => {
                gridApi.selection.selectRow(newRowcol.row.entity); // select row
            });

            // Change Event
            gridApi.edit.on.afterCellEdit($scope, (rowEntity, colDef, newValue, oldValue) => {
                if (newValue === oldValue) return; // Exit no changes

                switch (colDef.field) {
                    case 'fuid':
                        rowEntity.cfname = $filter('filter')(colDef.editDropdownOptionsArray, {fuid: newValue}, true)[0].cfname;
                        break;
                }
            });
        };
    }

    update() {
        if (!this.dESrvc.checkForChanges()) return;

        var msg = this.dESrvc.validate();
        if (msg != '') {
            this.showValidateMsg(msg);
            return;
        }

        this.CompanySvc.ofSetHourGlass(true);
        // Send to Server
        this.dESrvc.update('api/DriversMaint/Postupdate').then((dataResponse) => {
            this.CompanySvc.ofSetHourGlass(false);
        });

    }

    // Parse Error Msg
    showValidateMsg(msg) {
        var fieldmsg = '', tablemsg = '';

        switch (msg.table) {
            case 'drivers':
                tablemsg = 'DRIVERS';
                switch (msg.field) {
                    case 'fuid':
                        fieldmsg = "USER ID";
                        break;
                    case 'fname':
                        fieldmsg = "NAME";
                        break;
                    case 'fregion':
                        fieldmsg = "REGION";
                        break;
                    case 'fphone':
                        fieldmsg = "PHONE";
                        break;
                }
                break;
        }

        this.toastr.error(fieldmsg + ' value missing in ' + tablemsg);
    }

    driverAdd() {
        this.driver.addRow({
            fdvid: this.dESrvc.getMaxValue(this.driver.items, 'fdvid') + 1,
            factive: true
        });

        this.dESrvc.scrollToLastRow(this.driverGrid, 1); // Scroll to new row (always last)
    }

    // Resize gridlist to fill window
    onResizeWindow = () => {
        this.$timeout(() => {
            this.gHeight = this.$window.innerHeight - 85;
        }, 100);
    };

    // Initialize Grid presentation (s/b on html)
    initGrids() {
        // ui-grid
        this.driverGrid = {
            data: 'vm.driver.items',
            enableRowHeaderSelection: false,
            enableSorting: false,
            enableHorizontalScrollbar: 2,
            enableVerticalScrollbar: 2,
            enableColumnMenus: false,
            minRowsToShow: 4,
            enableCellEditOnFocus: true,
            multiSelect: false,
            columnDefs: [
                {
                    field: "factive",
                    displayName: "Active",
                    width: 70,
                    type: 'boolean',
                    cellTemplate: '<input type="checkbox" ng-model="row.entity.factive" ng-click="$event.stopPropagation();">'
                },
                {field: "fname", displayName: "Name", width: 200},
                {
                    field: "fuid", displayName: "User",
                    cellTemplate: '<div class="ui-grid-cell-contents"><span>{{row.entity.cfname}}</span></div>',
                    editableCellTemplate: 'ui-grid/dropdownEditor',
                    editDropdownIdLabel: 'fuid',
                    editDropdownValueLabel: 'cfname',
                    //editDropdownOptionsArray: 'c.vendorListDD' doesn't work if assigned here
                    width: 200
                },
                {
                    field: "fregion", displayName: "Region",
                    cellTemplate: '<div class="ui-grid-cell-contents"><span>{{row.entity.cfregion}}</span></div>',
                    editableCellTemplate: 'ui-grid/dropdownEditor',
                    editDropdownIdLabel: 'fid',
                    editDropdownValueLabel: 'fdescription',
                    //editDropdownOptionsArray: 'c.vendorListDD' doesn't work if assigned here
                    width: 150
                },
                {field: "fphone", displayName: "Phone", width: 115, cellFilter: 'phone'},
                {field: "fnotes", displayName: "Notes", width: 300}
            ]
        };
    }
}

// Must be done after class is declared for it to work
angular.module('app').controller('driverMaint', driverMaint);