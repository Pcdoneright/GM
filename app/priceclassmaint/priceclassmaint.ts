///<reference path="../../typings/app.d.ts" />
///<reference path="../../app/services/DataEntrySvc.ts" />

class PriceClassMaint {
    gHeight: number;
    dESrvc: app.IDataEntrySrvc;
    priceclass: app.IDataStore;
    priceclassGrid: any;

    static $inject = ['$scope', '$timeout', '$window', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'uiGridConstants', 'DataEntrySvc'];
    constructor(private $scope, private $timeout:ng.ITimeoutService, private $window:ng.IWindowService, private $mdDialog, private DataSvc, private CompanySvc, private toastr:toastr.IToastrService, private uiGridConstants, private DataEntrySvc) {

        // New Data Entry Service Instance
        this.dESrvc = DataEntrySvc.Instance();

        // Data Stores, Unique Keys, updatable, validate fields
        this.priceclass = this.dESrvc.newDataStore('priceclass', ['fpcid'], true, ['fdescription', 'fpercentage']);

        // Get Customer Terms for DropDown
        DataSvc.serverDataGet('api/PriceClassMaint/GetList').then((dataResponse) => {
            this.priceclass.loadData(dataResponse);
        });

        angular.element($window).bind('resize', this.onResizeWindow); //Capture resize event
        this.onResizeWindow(); // Execute at start
        this.initGrids();

        // afterCellEdit + cellnav for grid
        this.priceclassGrid.onRegisterApi = (gridApi) => {
            this.priceclassGrid.gridApi = gridApi; // Save ref to grid

            // Cell Navigation
            gridApi.cellNav.on.navigate($scope, (newRowcol, oldRowCol) => {
                gridApi.selection.selectRow(newRowcol.row.entity); // select row
            });

            // Change Event
            gridApi.edit.on.afterCellEdit($scope, (rowEntity, colDef, newValue, oldValue) => {
                if (newValue === oldValue) return; // Exit no changes

                switch (colDef.field) {
                    case 'fpercentage':
                        rowEntity.fpercentage = this.CompanySvc.validNumber(newValue, 2); // Convert to number
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
        this.dESrvc.update('api/PriceClassMaint/Postupdate').then((dataResponse) => {
            this.CompanySvc.ofSetHourGlass(false);
        });

    }

    // Parse Error Msg
    showValidateMsg(msg) {
        var fieldmsg = '', tablemsg = '';

        switch (msg.table) {
            case 'priceclass':
                tablemsg = 'PRICE CLASS';
                switch (msg.field) {
                    case 'fpercentage':
                        fieldmsg = "PERCENTAGE";
                        break;
                    case 'fdescription':
                        fieldmsg = "DESCRIPTION";
                        break;
                }
                break;
        }

        this.toastr.error(fieldmsg + ' value missing in ' + tablemsg);
    }

    priceclassRemove(event) {
        if (this.priceclassGrid.gridApi.selection.getSelectedRows().length == 0) return; // check for valid row
        this.priceclass.removeRow(event, this.priceclassGrid.gridApi.selection.getSelectedRows()[0]);
    }

    priceclassAdd() {
        this.priceclass.addRow({
            fpcid: this.dESrvc.getMaxValue(this.priceclass.items, 'fpcid') + 1,
            fusecostplus: false,
            fsalescomission: 0
        });

        this.dESrvc.scrollToLastRow(this.priceclassGrid, 0); // Scroll to new row (always last)
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
        this.priceclassGrid = {
            data: 'vm.priceclass.items',
            enableRowHeaderSelection: false,
            enableSorting: false,
            enableHorizontalScrollbar: 2,
            enableVerticalScrollbar: 2,
            enableColumnMenus: false,
            minRowsToShow: 4,
            enableCellEditOnFocus: true,
            multiSelect: false,
            columnDefs: [
                {field: "fdescription", displayName: "Description", width: 250},
                {field: "fpercentage", displayName: "Percentage", width: 150},
                {
                    field: "fusecostplus",
                    displayName: "Use Cost-Plus",
                    width: 115,
                    type: 'boolean',
                    cellTemplate: '<input type="checkbox" ng-model="row.entity.fusecostplus" ng-click="$event.stopPropagation();">'
                },
                {field: "fsalescomission", displayName: "Sales Comm. %", width: 130}
            ]
        };
    }
}

// Must be done after class is declared for it to work
angular.module('app').controller('PriceClassMaint', PriceClassMaint);