///<reference path="../../typings/app.d.ts" />
///<reference path="../../app/services/DataEntrySvc.ts" />

class codeMaint {
    gHeight: number;
    fidToAdd: string;

    dESrvc: app.IDataEntrySrvc;
    codedetail: app.IDataStore;
    codemasterGrid: any;
    codedetailGrid: any;

    static $inject = ['$scope', '$timeout', '$window', '$filter', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'uiGridConstants', 'DataEntrySvc'];
    constructor(private $scope, private $timeout:ng.ITimeoutService, private $window:ng.IWindowService, private $filter, private $mdDialog, private DataSvc, private CompanySvc, private toastr:toastr.IToastrService, private uiGridConstants, private DataEntrySvc) {

        // New Data Entry Service Instance
        this.dESrvc = DataEntrySvc.Instance();

        // Data Stores, Unique Keys, updatable, validate fields
        this.codedetail = this.dESrvc.newDataStore('code_detail', ['fgroupid', 'fid'], true, ['fid']);

        // Get Customer Terms for DropDown
        DataSvc.serverDataGet('api/CodeMaint/GetCode').then((dataResponse) => {
            this.codemasterGrid.rowData = dataResponse.code_master;
            this.codemasterGrid.api.onNewRows();
            this.codedetail.loadData(dataResponse.code_detail);
        });

        angular.element($window).bind('resize', this.onResizeWindow); //Capture resize event
        this.onResizeWindow(); // Execute at start
        this.initGrids();

        // afterCellEdit + cellnav for grid
        this.codedetailGrid.onRegisterApi = (gridApi) => {
            this.codedetailGrid.gridApi = gridApi; // Save ref to grid

            // Cell Navigation
            gridApi.cellNav.on.navigate($scope, (newRowcol, oldRowCol) => {
                gridApi.selection.selectRow(newRowcol.row.entity); // select row
            });

            //// Change Event
            //gridApi.edit.on.afterCellEdit($scope, (rowEntity, colDef, newValue, oldValue) => {
            //    if (newValue === oldValue) return; // Exit no changes
            //
            //    switch (colDef.field) {
            //        case 'fgroupid':
            //            rowEntity.cfgroupid = $filter('filter')(colDef.editDropdownOptionsArray, {fgroupid: newValue}, true)[0].fname;
            //            break;
            //    }
            //});
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
        this.dESrvc.update('api/CodeMaint/Postupdate').then((dataResponse) => {
            this.CompanySvc.ofSetHourGlass(false);
        });

    }

    // Parse Error Msg
    showValidateMsg(msg) {
        var fieldmsg = '', tablemsg = '';

        tablemsg = 'DETAILS';
        switch (msg.field) {
            case 'fid':
                fieldmsg = "ID";
                break;
        }

        this.toastr.error(fieldmsg + ' value missing in ' + tablemsg);
    }

    codeAdd(event) {
        if (this.codemasterGrid.selectedRows.length == 0) return;

        this.$mdDialog.show({
            targetEvent: event,
            title: 'New Item Number',
            locals: {parent: this},
            controller: angular.noop,
            controllerAs: 'c',
            bindToController: true,
            //escapeToClose: false,
            template: '<md-dialog>' +
            '  <md-content>' +
            '   <h2 flex class="md-title" style="text-align: center">New ID</h2>' +
            '   <div layout="row">' +
            '       <md-input-container md-no-float>' +
            '           <input type="text" ng-model="c.parent.fidToAdd" ng-model-options="{updateOn: \'blur\'}" placeholder="Enter an ID" style="width: 250px;padding-left: 10px" auto-focus="600" />' +
            '       </md-input-container>' +
            '   </div>' +
            '  </md-content>' +
            '  <div class="md-actions">' +
            '    <md-button ng-click="c.parent.$mdDialog.cancel()">Cancel</md-button>' +
            '    <md-button ng-click="c.parent.$mdDialog.hide()">Continue</md-button>' +
            '  </div>' +
            '</md-dialog>'

        }).then(() => {
            if (!this.fidToAdd) return;

            this.codedetail.addRow({
                fgroupid: this.codemasterGrid.selectedRows[0].fgroupid,
                fid: this.fidToAdd
            });

            this.fidToAdd = ''; // Clear Value
            this.dESrvc.scrollToLastRow(this.codedetailGrid, 1); // Scroll to new row (always last)
        });
    }

    codeRemove(event) {
        if (this.codedetailGrid.gridApi.selection.getSelectedRows().length == 0) return; // check for valid row
        this.codedetail.removeRow(event, this.codedetailGrid.gridApi.selection.getSelectedRows()[0]);
    }

    // Resize gridlist to fill window
    onResizeWindow = () => {
        this.$timeout(() => {
            this.gHeight = this.$window.innerHeight - 415;
        }, 100);
    };

    // Initialize Grid presentation (s/b on html)
    initGrids() {
        // Angulargrid
        this.codemasterGrid = {
            rowData: [],
            enableColResize: true,
            enableSorting: false,
            rowSelection: 'single',
            columnDefs: [
                {field: "fgroupid", displayName: "Group", width: 150},
                {field: "fdescription", displayName: "Description", width: 300}
            ]
        };

        // ui-grid
        this.codedetailGrid = {
            data: 'vm.codedetail.items | filter: {fgroupid: (vm.codemasterGrid.selectedRows[0].fgroupid == "") ? "-1" : vm.codemasterGrid.selectedRows[0].fgroupid} : true',
            enableRowHeaderSelection: false,
            enableSorting: false,
            enableHorizontalScrollbar: 2,
            enableVerticalScrollbar: 2,
            enableColumnMenus: false,
            minRowsToShow: 4,
            enableCellEditOnFocus: true,
            multiSelect: false,
            columnDefs: [
                {field: "fid", displayName: "ID", width: 200, enableCellEdit: false},
                {field: "fdescription", displayName: "Description", width: 250},
                {field: "fopt1", displayName: "Option 1", width: 150},
                {field: "fopt2", displayName: "Option 2", width: 150},
                {field: "forder", displayName: "Sequence", width: 100},

            ]
        };
    }
}

// Must be done after class is declared for it to work
angular.module('app').controller('codeMaint', codeMaint);