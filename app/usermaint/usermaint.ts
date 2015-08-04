///<reference path="../../typings/app.d.ts" />
///<reference path="../../app/services/DataEntrySvc.ts" />

class userMaint {
    gHeight: number;
    dESrvc: app.IDataEntrySrvc;
    user: app.IDataStore;
    userGrid: any;

    static $inject = ['$scope', '$timeout', '$window', '$filter', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'uiGridConstants', 'DataEntrySvc'];
    constructor(private $scope, private $timeout:ng.ITimeoutService, private $window:ng.IWindowService, private $filter, private $mdDialog, private DataSvc, private CompanySvc, private toastr:toastr.IToastrService, private uiGridConstants, private DataEntrySvc) {

        // New Data Entry Service Instance
        this.dESrvc = DataEntrySvc.Instance();

        // Data Stores, Unique Keys, updatable, validate fields
        this.user = this.dESrvc.newDataStore('user', ['fuid'], true, ['fuserid', 'fgroupid', 'fpassword', 'ffirst', 'flast']);

        // Get Customer Terms for DropDown
        DataSvc.serverDataGet('api/UserMaint/Getlist').then((dataResponse) => {
            this.user.loadData(dataResponse);
        });

        // Get Groups
        DataSvc.serverDataGet('api/UserMaint/GetGroups').then((dataResponse) => {
            this.userGrid.columnDefs[1].editDropdownOptionsArray = dataResponse;
        });

        angular.element($window).bind('resize', this.onResizeWindow); //Capture resize event
        this.onResizeWindow(); // Execute at start
        this.initGrids();

        // afterCellEdit + cellnav for grid
        this.userGrid.onRegisterApi = (gridApi) => {
            this.userGrid.gridApi = gridApi; // Save ref to grid

            // Cell Navigation
            gridApi.cellNav.on.navigate($scope, (newRowcol, oldRowCol) => {
                gridApi.selection.selectRow(newRowcol.row.entity); // select row
            });

            // Change Event
            gridApi.edit.on.afterCellEdit($scope, (rowEntity, colDef, newValue, oldValue) => {
                if (newValue === oldValue) return; // Exit no changes

                switch (colDef.field) {
                    case 'fgroupid':
                        rowEntity.cfgroupid = $filter('filter')(colDef.editDropdownOptionsArray, {fgroupid: newValue}, true)[0].fname;
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
        this.dESrvc.update('api/userMaint/Postupdate').then((dataResponse) => {
            this.CompanySvc.ofSetHourGlass(false);
        });

    }

    // Parse Error Msg
    showValidateMsg(msg) {
        var fieldmsg = '', tablemsg = '';

        switch (msg.table) {
            case 'user':
                tablemsg = 'USERS';
                switch (msg.field) {
                    case 'fuserid':
                        fieldmsg = "USER ID";
                        break;
                    case 'fpassword':
                        fieldmsg = "PASSWORD";
                        break;
                    case 'ffirst':
                        fieldmsg = "FIRST NAME";
                        break;
                    case 'flast':
                        fieldmsg = "LAST NAME";
                        break;
                    case 'fgroupid':
                        fieldmsg = "ACCESS GROUP";
                        break;
                }
                break;
        }

        this.toastr.error(fieldmsg + ' value missing in ' + tablemsg);
    }

    userAdd() {
        this.user.addRow({
            fuid: this.dESrvc.getMaxValue(this.user.items, 'fuid') + 1,
            factive: true,
            fisadmin: false
        });

        this.dESrvc.scrollToLastRow(this.userGrid, 1); // Scroll to new row (always last)
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
        this.userGrid = {
            data: 'vm.user.items',
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
                {
                    field: "fgroupid", displayName: "Access Group",
                    cellTemplate: '<div class="ui-grid-cell-contents"><span>{{row.entity.cfgroupid}}</span></div>',
                    editableCellTemplate: 'ui-grid/dropdownEditor',
                    editDropdownIdLabel: 'fgroupid',
                    editDropdownValueLabel: 'fname',
                    //editDropdownOptionsArray: 'c.vendorListDD' doesn't work if assigned here
                    width: 150
                },
                {
                    field: "fisadmin",
                    displayName: "Admin",
                    width: 70,
                    type: 'boolean',
                    cellTemplate: '<input type="checkbox" ng-model="row.entity.fisadmin" ng-click="$event.stopPropagation();">'
                },

                {field: "fuserid", displayName: "ID", width: 150},
                {field: "fpassword", displayName: "Password", width: 150,
                    cellTemplate: '<div class="ui-grid-cell-contents" ng-class="col.colIndex()">*******</div>',
                    //editableCellTemplate: '<input type="password" ng-model="row.entity.fpassword"/>',
                    //editableCellTemplate: '<input type="password" ng-class="\'colt\' + col.index" ng-model="MODEL_COL_FIELD" />',
                    //editableCellTemplate: '<input style="Xborder:none;background:transparent;Xheight:30px" ng-class="\'colt\' + col.index" type="password" ng-model="MODEL_COL_FIELD">'
                },
                {field: "ffirst", displayName: "First Name", width: 200},
                {field: "flast", displayName: "Last Name", width: 200}
            ]
        };
    }
}

// Must be done after class is declared for it to work
angular.module('app').controller('userMaint', userMaint);