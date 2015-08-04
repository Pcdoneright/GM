///<reference path="../../typings/app.d.ts" />
///<reference path="../../app/services/DataEntrySvc.ts" />

class salespersonMaint {
    gHeight: number;
    dESrvc: app.IDataEntrySrvc;
    salesperson: app.IDataStore;
    salespersonGrid: any;

    static $inject = ['$scope', '$timeout', '$window', '$filter', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'uiGridConstants', 'DataEntrySvc'];
    constructor(private $scope, private $timeout:ng.ITimeoutService, private $window:ng.IWindowService, private $filter, private $mdDialog, private DataSvc, private CompanySvc, private toastr:toastr.IToastrService, private uiGridConstants, private DataEntrySvc) {

        // New Data Entry Service Instance
        this.dESrvc = DataEntrySvc.Instance();

        // Data Stores, Unique Keys, updatable, validate fields
        this.salesperson = this.dESrvc.newDataStore('salesperson', ['fspid'], true, ['fname', 'fregion', 'fphone1', 'fuid']);

        DataSvc.serverDataGet('api/SalespersonMaint/Getlist').then((dataResponse) => {
            this.salesperson.loadData(dataResponse);
        });

        angular.element($window).bind('resize', this.onResizeWindow); //Capture resize event
        this.onResizeWindow(); // Execute at start
        this.initGrids();

        // Get Users
        DataSvc.serverDataGet('api/UserMaint/GetUserList').then((dataResponse) => {
            this.salespersonGrid.columnDefs[3].editDropdownOptionsArray = dataResponse;
        });

        this.dESrvc.initCodeTable().then((dataResponse) => {
            // Do after initGrids()
            this.salespersonGrid.columnDefs[2].editDropdownOptionsArray = $filter('filter')(dataResponse, {fgroupid: "REG"});
        }); // when codetable is needed

        // afterCellEdit + cellnav for grid
        this.salespersonGrid.onRegisterApi = (gridApi) => {
            this.salespersonGrid.gridApi = gridApi; // Save ref to grid

            // Cell Navigation
            gridApi.cellNav.on.navigate($scope, (newRowcol, oldRowCol) => {
                gridApi.selection.selectRow(newRowcol.row.entity); // select row
            });

            // Change Event
            gridApi.edit.on.afterCellEdit($scope, (rowEntity, colDef, newValue, oldValue) => {
                if (newValue === oldValue) return; // Exit no changes

                switch (colDef.field) {
                    case 'fuid':
                        rowEntity.cfuid = $filter('filter')(colDef.editDropdownOptionsArray, {fuid: newValue}, true)[0].cfname;
                        break;
                    case 'fregion':
                        rowEntity.cfregion = $filter('filter')(colDef.editDropdownOptionsArray, {fid: newValue}, true)[0].fdescription;
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
        this.dESrvc.update('api/SalespersonMaint/Postupdate').then((dataResponse) => {
            this.CompanySvc.ofSetHourGlass(false);
        });

    }

    // Parse Error Msg
    showValidateMsg(msg) {
        var fieldmsg = '', tablemsg = '';

        switch (msg.table) {
            case 'salesperson':
                tablemsg = 'SALES PERSON';
                switch (msg.field) {
                    case 'fname':
                        fieldmsg = "NAME";
                        break;
                    case 'fregion':
                        fieldmsg = "REGION";
                        break;
                    case 'fphone1':
                        fieldmsg = "PHONE 1";
                        break;
                    case 'fuid':
                        fieldmsg = "USER ID";
                        break;
                }
                break;
        }

        this.toastr.error(fieldmsg + ' value missing in ' + tablemsg);
    }

    salespersonAdd() {
        this.salesperson.addRow({
            fspid: this.dESrvc.getMaxValue(this.salesperson.items, 'fspid') + 1,
            factive: true
        });

        this.dESrvc.scrollToLastRow(this.salespersonGrid, 1); // Scroll to new row (always last)
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
        this.salespersonGrid = {
            data: 'vm.salesperson.items',
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
                    field: "fregion", displayName: "Region",
                    cellTemplate: '<div class="ui-grid-cell-contents"><span>{{row.entity.cfregion}}</span></div>',
                    editableCellTemplate: 'ui-grid/dropdownEditor',
                    editDropdownIdLabel: 'fid',
                    editDropdownValueLabel: 'fdescription',
                    //editDropdownOptionsArray: 'c.vendorListDD' doesn't work if assigned here
                    width: 150
                },
                {
                    field: "fuid", displayName: "User ID",
                    cellTemplate: '<div class="ui-grid-cell-contents"><span>{{row.entity.cfuid}}</span></div>',
                    editableCellTemplate: 'ui-grid/dropdownEditor',
                    editDropdownIdLabel: 'fuid',
                    editDropdownValueLabel: 'cfname',
                    //editDropdownOptionsArray: 'c.vendorListDD' doesn't work if assigned here
                    width: 150
                },
                {field: "faddress", displayName: "Address", width: 200},
                {field: "fcity", displayName: "City", width: 150},
                {field: "fstate", displayName: "State", width: 80},
                {field: "fzip", displayName: "Zip Code", width: 150},
                {field: "fphone1", displayName: "Phone 1", width: 115, cellFilter: 'phone'},
                {field: "fphone2", displayName: "Phone 2", width: 115, cellFilter: 'phone'}
            ]
        };
    }
}

// Must be done after class is declared for it to work
angular.module('app').controller('salespersonMaint', salespersonMaint);