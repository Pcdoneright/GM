///<reference path="../../typings/app.d.ts" />
///<reference path="../../app/services/DataEntrySvc.ts" />

class itemMaint {
    listGridSearch:string = '';
    ftype:string = 'D';
    fpcid:number = 1; // TODO: Must come from company
    selectedTab:number;

    retrieving:boolean = false;
    searchId:string = '';
    itemnumberid:string = '';
    fitemToAddError:string = '';
    fitemToAdd:string = '';
    gHeight:number;
    gHeightDetail:number;
    showInventoryGrid:boolean;

    dESrvc:app.IDataEntrySrvc;
    itemmasters:app.IDataStore;
    itemunits:app.IDataStore;
    itemvendors:app.IDataStore;

    listGrid:any;
    inventoryGrid:any;
    itemunitsGrid:any;
    priceclassGrid:any;
    itemvendorsGrid:any;
    priceclass:any[];
    countryorg:any[];

    //angular.module('app').controller('itemmaintenanceCtrl', ['$rootScope', '$scope', '$filter', '$timeout', '$window', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'DataEntrySvc', 'uiGridConstants', function ($rootScope, $scope, $filter, $timeout, $window, $mdDialog, DataSvc, CompanySvc, toastr, DataEntrySvc, uiGridConstants) {
    static $inject = ['$rootScope', '$scope', '$filter', '$timeout', '$window', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'DataEntrySvc', 'uiGridConstants', 'companyRules'];

    constructor(private $rootScope, private $scope:ng.IScope, private $filter, private $timeout, private $window, private $mdDialog, private DataSvc, private CompanySvc, private toastr, private DataEntrySvc, private uiGridConstants, private companyRules) {
        this.dESrvc = DataEntrySvc.Instance(); // Data Entry Service

        // Data Stores, Assign Unique Keys
        this.itemmasters = this.dESrvc.newDataStore('itemmaster', ['fimid'], true, ['fdescription', 'fcategory', 'fbaseprice']);
        this.itemunits = this.dESrvc.newDataStore('itemunit', ['fitem'], true, ['fuomdescription']);
        this.itemvendors = this.dESrvc.newDataStore('itemvendor', ['fitem', 'fvid'], true, ['fdescription', 'fvid']);

        angular.element($window).bind('resize', this.onResizeWindow); //Capture resize event
        this.onResizeWindow(); // Execute at start
        this.initGrids();
        this.dESrvc.initCodeTable().then((dataResponse) => {
            this.countryorg = angular.copy($filter('filter')(dataResponse, {fgroupid: 'COO'}, true));
            this.countryorg.unshift({fid: ''}); // Add Null Item
        });

        // Get Vendors
        DataSvc.serverDataGet('api/VendorMaint/GetVendors').then((dataResponse) => {
            this.itemvendorsGrid.columnDefs[0].editDropdownOptionsArray = dataResponse;
        });

        // Get priceclass
        DataSvc.serverDataGet('api/PriceClassMaint/GetList').then((dataResponse) => {
            this.priceclass = dataResponse;
            this.priceclassGrid.rowData = this.priceclass;
            this.priceclassGrid.api.onNewRows();
            this.priceclassGridReset();

            var npricelcass = angular.copy(dataResponse);
            npricelcass.unshift({fpcid: null, fdescription: ''}); // Add Null Item
            this.itemunitsGrid.columnDefs[8].editDropdownOptionsArray = npricelcass;
        });

        this.itemunitsGrid.onRegisterApi = (gridApi) => {
            this.itemunitsGrid.gridApi = gridApi; // Save ref to grid
            // Cell Navigation
            gridApi.cellNav.on.navigate($scope, (newRowcol, oldRowCol) => {
                // update sales price list
                if (this.itemunitsGrid.gridApi.selection.getSelectedRows()[0] !== newRowcol.row) {
                    this.priceclassGetSalesPrice(newRowcol.row.entity);
                }
                gridApi.selection.selectRow(newRowcol.row.entity); // select row
            });

            // Change Event
            gridApi.edit.on.afterCellEdit($scope, (rowEntity, colDef, newValue, oldValue) => {
                if (newValue === oldValue) return; // Exit no changes

                switch (colDef.field) {
                    case 'fuomdescription':
                        rowEntity.fuomdescription = newValue.toUpperCase();
                        break;
                    case 'funits':
                        rowEntity.funits = this.CompanySvc.validNumber(newValue); // Convert to number
                        this.itemunitsGetUnitCost(rowEntity);
                        this.priceclassGetSalesPrice(rowEntity);
                        break;
                    case 'fusablep':
                        rowEntity.fusablep = this.CompanySvc.validNumber(newValue); // Convert to number
                        this.itemunitsGetUnitCost(rowEntity);
                        this.priceclassGetSalesPrice(rowEntity);
                        break;
                    case 'fcostplus':
                        rowEntity.fcostplus = this.CompanySvc.validNumber(newValue, 2); // Convert to number
                        this.itemunitsGetUnitCost(rowEntity);
                        this.priceclassGetSalesPrice(rowEntity);
                        break;
                    case 'flockclassprice':
                        rowEntity.cflockclassprice = $filter('filter')(colDef.editDropdownOptionsArray, {fpcid: newValue}, true)[0].fdescription;
                        break;
                }
            });
        };

        this.itemvendorsGrid.onRegisterApi = (gridApi) => {
            this.itemvendorsGrid.gridApi = gridApi; // Save ref to grid
            // Cell Navigation
            gridApi.cellNav.on.navigate($scope, (newRowcol, oldRowCol) => {
                gridApi.selection.selectRow(newRowcol.row.entity); // select row
            });
            // Change Event
            gridApi.edit.on.afterCellEdit($scope, (rowEntity, colDef, newValue, oldValue) => {
                if (newValue === oldValue) return; // Exit no changes

                switch (colDef.field) {
                    case 'fvid':
                        rowEntity.cfname = $filter('filter')(colDef.editDropdownOptionsArray, {fvid: newValue}, true)[0].fname;
                        break;
                    case 'flastprice':
                        rowEntity.flastprice = this.CompanySvc.validNumber(newValue, 2); // Convert to number
                        break;
                    case 'fdescription':
                        rowEntity.fdescription = newValue.toUpperCase();
                        break;
                }
            });
        };
    }

    fbasepriceOnChange() {
        if (!this.validEntry()) return;

        for (var i = 0; i < this.itemunits.items.length; i++ ) {
            this.itemunitsGetUnitCost(this.itemunits.items[i]);
        }
        this.priceclassGetSalesPrice(this.itemunitsGrid.gridApi.selection.getSelectedRows()[0]);
    }

    // ItemList
    listGridSetPrice() {
        var rD = this.listGrid.rowData;

        // Calculate values
        for (var i = 0; i < rD.length; i++) {
            rD[i].cfcost = this.companyRules.getUnitCost(rD[i].fbaseprice, rD[i].ffreightcost, rD[i].funits, rD[i].fusablep);
            rD[i].cfsaleprice = this.companyRules.calcSellPrice(this.priceclass, rD[i].flockclassprice, this.fpcid, rD[i].fbaseprice, rD[i].ffreightcost, rD[i].funits, rD[i].fusablep, rD[i].fcostplus, 0);
        }

        this.listGrid.api.refreshView();
    }

    // Get Item List
    listGridRefresh(value) {
        if (value.length < 3 && (this.ftype !== 'O' && this.ftype !== 'A' && this.ftype !== 'L')) {
            this.toastr.warning('Minimun 3 Characters');
            return;
        }

        var api = '';
        switch (this.ftype) {
            case 'D':
                api = 'api/ItemMaint/GetListByDescription';
                break;
            case 'I':
                api = 'api/ItemMaint/GetListByItem';
                break;
            case 'O':
            case 'A':
            case 'L':
                api = 'api/ItemMaint/GetListOther';
                break;
        }

        this.DataSvc.serverDataGet(api, {psearch: value, pActive: false, pType: this.ftype}).then((dataResponse) => {
            this.listGrid.rowData = dataResponse;
            this.listGridSetPrice();
            this.listGrid.api.onNewRows();

            if (dataResponse.length === 0) this.toastr.info('No Rows found');
        });
    }

    // Get item by id
    searchByIdNumber() {
        if (!this.searchId) return;
        this.searchId = this.searchId.replace(/[^0-9\.-]/g, '');
        if (this.searchId === '') return; //Remove non-numeric, period or minus char

        var api = (this.itemnumberid === "I") ? 'api/ItemMaint/GetValidateItemmasters' : 'api/ItemMaint/GetValidateItem';
        this.DataSvc.serverDataGet(api, {pfitem: this.searchId}).then((dataResponse) => {
            if (dataResponse.length > 0) {
                this.retrieveItem(dataResponse[0].fimid);
                this.searchId = '';
            }
            else
                this.toastr.info('Item ID Not Found');
        });
    }

    // Get Item for EDIT
    retrieveItem(afimid) {
        if (!afimid) return;

        this.dESrvc.pendingChangesContinue().then(() => {
            this.retrieving = true; // Global flag set on

            this.DataSvc.serverDataGet('api/ItemMaint/GetItem', {pfimid: afimid}).then((dataResponse) => {
                this.itemmasters.loadData(dataResponse.itemmasters);
                this.itemunits.loadData(dataResponse.itemunits);
                this.itemvendors.loadData(dataResponse.itemvendors);
                this.priceclassGridReset();

                this.inventoryGrid.rowData = dataResponse.inventories;
                if (this.inventoryGrid.api) this.inventoryGrid.api.onNewRows(); // Grid is hidden and might not be init

                // Calculate values
                var rows = this.itemunits.items;
                for (var i = 0; i < rows.length; i++) {
                    this.itemunitsGetUnitCost(rows[i]);
                }

                this.$timeout(() => {
                    this.retrieving = false
                }, 400); // Global flag set off
            });
        });
    }

    itemunitsGetUnitCost(row) {
        row.cfcost = this.companyRules.getUnitCost(this.itemmasters.items[0].fbaseprice, this.itemmasters.items[0].ffreightcost, row.funits, row.fusablep);
    }

    priceclassGetSalesPrice(row) {
        if (!row) return; // Check for invalid

        for (var i = 0; i < this.priceclass.length; i++) {
            this.priceclass[i].cfsaleprice = this.companyRules.calcSellPrice(
                this.priceclass, row.flockclassprice, this.priceclass[i].fpcid, this.itemmasters.items[0].fbaseprice, this.itemmasters.items[0].ffreightcost, row.funits, row.fusablep, row.fcostplus, 0);
        }
        this.priceclassGrid.api.refreshView();
    }

    priceclassGridReset() {
        for (var i = 0; i < this.priceclass.length; i++) {
            this.priceclass[i].cfsaleprice = 0;
        }
        this.priceclassGrid.api.refreshView();
    }

    // New Item
    newItem(event) {
        this.dESrvc.pendingChangesContinue().then(() => {
            this.retrieving = true; // Global flag set on

            this.DataSvc.serverDataGet('api/Company/Getnextsequence', {seq: 'itemmasters'}).then((dataResponse) => {
                var fimid = dataResponse.data;

                // Clear data
                this.itemmasters.loadData([]);
                this.itemunits.loadData([]);
                this.itemvendors.loadData([]);
                this.inventoryGrid.rowData = [];
                this.priceclassGridReset();

                if (this.inventoryGrid.api) this.inventoryGrid.api.onNewRows(); // Grid is hidden and might not be init

                this.itemmasters.addRow({
                    fimid: fimid,
                    factive: true,
                    fistaxable: false,
                    freorderpoint: 0,
                    freorderqty: 0,
                    fbaseprice: 0,
                    ffreightcost: 0
                });

                this.$timeout(() => {
                    this.retrieving = false;
                    angular.element('#fdescription')[0].focus(); // Set focus
                }, 500); // Global flag set off
            });
        });
    }

    // Save the item
    update() {
        if (!this.validEntry()) return;
        if (!this.dESrvc.checkForChanges()) return;
        var msg = this.dESrvc.validate();
        if (msg != '') {
            this.showValidateMsg(msg);
            return;
        }

        this.CompanySvc.ofSetHourGlass(true);

        // Last Update
        this.itemmasters.items[0].ts = new Date();
        this.itemmasters.items[0].fby = this.CompanySvc.userInfo.fname;

        // Send to Server
        this.dESrvc.update('api/ItemMaint/Postupdate').then((dataResponse) => {
            //console.log('status: ' + dataResponse.status);
        }).finally(() => {
            this.CompanySvc.ofSetHourGlass(false);
        });
    }

    // Parse Error Msg
    showValidateMsg(msg) {
        var fieldmsg = '', tablemsg = '';

        switch (msg.table) {
            case 'itemmaster':
                tablemsg = 'ITEM PROPERTIES';
                switch (msg.field) {
                    case 'fdescription':
                        fieldmsg = 'DESCRIPTION';
                        break;
                    case 'fcategory':
                        fieldmsg = 'CATEGORY';
                        break;
                    case 'fbaseprice':
                        fieldmsg = 'BASE PRICE';
                        break;
                }
                break;
            case 'itemvendor':
                tablemsg = 'VENDORS';
                switch (msg.field) {
                    case 'fdescription':
                        fieldmsg = 'DESCRIPTION';
                        break;
                    case 'fvid':
                        fieldmsg = 'VENDOR';
                        break;
                }
                break;
            case 'itemunit':
                tablemsg = 'ITEM UNITS';
                fieldmsg = "UOM DESCRIPTION";
                break;
        }

        this.toastr.error(fieldmsg + ' value missing in ' + tablemsg);
    }

    // Valid Entry
    validEntry() {
        if (this.itemmasters.items.length !== 1) return false;
        return (this.itemmasters.items[0].fimid > 0);
    }

    itemvendorsAdd(evt) {
        if (!this.validEntry()) return;
        if (this.itemunitsGrid.gridApi.selection.getSelectedRows().length == 0) return; // check for valid row

        var itemRow = this.itemunitsGrid.gridApi.selection.getSelectedRows()[0];
        this.itemvendors.addRow({
            fitem: itemRow.fitem,
            fimid: this.itemmasters.items[0].fimid,
            flastprice: 0,
            fdescription: this.itemmasters.items[0].fdescription + ' ' + itemRow.fuomdescription
        });

        // Scroll to new row (always last)
        this.dESrvc.scrollToLastRow(this.itemvendorsGrid, 0);
    }

    // Add Rows
    itemunitsAdd(evt) {
        if (!this.validEntry()) return;

        this.fitemToAdd = null; // Clear value
        this.fitemToAddError = "";

        this.$mdDialog.show({
            targetEvent: evt,
            title: 'New Item Number',
            locals: {parent: this},
            controller: angular.noop,
            controllerAs: 'c',
            bindToController: true,
            //escapeToClose: false,
            template: '<md-dialog>' +
            '  <md-content>' +
            '   <h2 flex class="md-title" style="text-align: center">New Item Number</h2>' +
            '   <div layout="row">' +
            '       <md-input-container md-no-float>' +
            '           <input type="text" ng-model="c.parent.fitemToAdd" ng-model-options="{updateOn: \'blur\'}" placeholder="Enter an Item number" style="width: 250px;padding-left: 10px" auto-focus="600" />' +
            '       </md-input-container>' +
            '   </div>' +
            '   <span class="widget-error">{{c.parent.fitemToAddError}}</span>' +
            '  </md-content>' +
            '  <div class="md-actions">' +
            '    <md-button ng-click="c.parent.dESrvc.mdDialogCancel()">Cancel</md-button>' +
            '    <md-button ng-click="c.parent.validateNewItem()">Continue</md-button>' +
            '  </div>' +
            '</md-dialog>'

        }).then(() => {
            var idx = this.itemunits.addRow({
                fimid: this.itemmasters.items[0].fimid,
                fitem: this.fitemToAdd,
                funits: 1,
                fuomdescription: null,
                fusablep: 100,
                factive: true,
                fonsale: false,
                fcostplus: 0,
                flockclassprice: null
            });

            this.itemunitsGetUnitCost(this.itemunits.items[idx - 1]);
            // Scroll to new row (always last)
            this.dESrvc.scrollToLastRow(this.itemunitsGrid, 1);
        });
    }

    // Validate New fitem
    validateNewItem() {
        if (!this.fitemToAdd) {
            this.$mdDialog.cancel();
            return;
        }

        this.DataSvc.serverDataGet('api/ItemMaint/GetValidateItem', {pfitem: this.fitemToAdd}).then((dataResponse) => {
            if (dataResponse.length === 0)
                this.$mdDialog.hide();
            else
                this.fitemToAddError = "Item Number Already Exist!";
        });
    }

    // Remove Rows
    itemunitsRemove(event) {
        if (!this.validEntry()) return;
        if (this.itemunitsGrid.gridApi.selection.getSelectedRows().length == 0) return; // check for valid row

        var fitem = this.itemunitsGrid.gridApi.selection.getSelectedRows()[0].fitem;
        this.itemunits.removeRow(event, this.itemunitsGrid.gridApi.selection.getSelectedRows()[0]).then(() => {
            // Remove itemvendors
            this.itemvendorsGrid.gridApi.grid.rows.forEach((item) => {
                this.itemvendors._removeRow(item.entity);
            });
            this.priceclassGridReset();
        });
    }

    // Remove Rows
    itemvendorsRemove(event) {
        if (!this.validEntry()) return;
        if (this.itemvendorsGrid.gridApi.selection.getSelectedRows().length == 0) return; // check for valid row

        this.itemvendors.removeRow(event, this.itemvendorsGrid.gridApi.selection.getSelectedRows()[0]);
    }

    // Resize gridlist to fill window
    onResizeWindow = () => {
        this.$timeout(() => {
            this.gHeight = this.$window.innerHeight - 115;
            this.gHeightDetail = (this.showInventoryGrid) ? this.$window.innerHeight - 440: this.$window.innerHeight - 360;
        }, 100);
    };

    listGridDoubleClick = (params) => {
        this.retrieveItem(params.data.fimid);
        this.selectedTab = 1
    };

    // Initialize Grid presentation (s/b on html)
    initGrids() {
        // Angulargrid
        this.listGrid = {
            rowData: [],
            enableColResize: true,
            enableSorting: true,
            rowSelection: 'single',
            groupUseEntireRow: true,
            groupKeys: ['fdescription'],
            columnDefs: [
                {field: "fimid", displayName: "ID", width: 55, cellDoubleClicked: this.listGridDoubleClick},
                {field: "fitem", displayName: "Item", width: 150, cellDoubleClicked: this.listGridDoubleClick},
                //{field: "fdescription", displayName: "Description", width: 250},
                {field: "fuomdescription", displayName: "UOM Description", width: 200, cellDoubleClicked: this.listGridDoubleClick},
                {field: "cfcategory", displayName: "Category", width: 120, cellDoubleClicked: this.listGridDoubleClick},
                {field: "fbaseprice", displayName: "Base Price", width: 90, cellRenderer: this.CompanySvc.currencyRenderer, cellDoubleClicked: this.listGridDoubleClick},
                {field: "fusablep", displayName: "Usable %", width: 80},
                {field: "cfcost", displayName: "Cost", width: 80, cellRenderer: this.CompanySvc.currencyRenderer, cellDoubleClicked: this.listGridDoubleClick},
                {field: "cfsaleprice", displayName: "Sales Price", width: 100, cellRenderer: this.CompanySvc.currencyRenderer, cellDoubleClicked: this.listGridDoubleClick},
                {field: "funits", displayName: "# Units", width: 80, cellDoubleClicked: this.listGridDoubleClick},
                {field: "ffreightcost", displayName: "Freight", width: 80, cellRenderer: this.CompanySvc.currencyRenderer, cellDoubleClicked: this.listGridDoubleClick},
            ]
        };

        // Angulargrid
        this.inventoryGrid = {
            rowData: [],
            enableColResize: true,
            enableSorting: false,
            rowSelection: 'single',
            columnDefs: [
                {field: "fpurchaseorders", displayName: "Purchase Orders", cellFilter: 'number'},
                {field: "fsalesorders", displayName: "Sales Orders", cellFilter: 'number'},
                {field: "fonhand", displayName: "On Hand", cellFilter: 'number'},
                {field: "favgcost", displayName: "Avg Cost", cellRenderer: this.CompanySvc.currencyRenderer},
                {field: "favgsale", displayName: "Avg Sale", cellRenderer: this.CompanySvc.currencyRenderer}
            ],
        };

        this.itemunitsGrid = {
            data: 'vm.itemunits.items',
            enableRowHeaderSelection: false,
            enableSorting: false,
            enableHorizontalScrollbar: 2,
            enableVerticalScrollbar: 2,
            enableColumnMenus: false,
            //minRowsToShow: 6,
            enableCellEditOnFocus: true,
            multiSelect: false,
            columnDefs: [
                {field: "fitem", displayName: "Item Number", width: 150, enableCellEdit: false},
                {field: "fuomdescription", displayName: "UOM Description", width: 250},
                {field: "funits", displayName: "# Units", cellFilter: 'number', width: 80, type: 'string'},
                {field: "fusablep", displayName: "Usable %", cellFilter: 'number', width: 85, type: 'string'},
                {field: "cfcost", displayName: "Cost", width: 80, cellFilter: 'currency', enableCellEdit: false},
                {field: "fcostplus", displayName: "Cost-Plus", width: 90, cellFilter: 'currency'},
                {
                    field: "factive",
                    displayName: "Active",
                    width: 70,
                    type: 'boolean',
                    cellTemplate: '<input type="checkbox" ng-model="row.entity.factive" ng-click="$event.stopPropagation();">'
                },
                {
                    field: "fonsale",
                    displayName: "On-Sale",
                    width: 75,
                    type: 'boolean',
                    cellTemplate: '<input type="checkbox" ng-model="row.entity.fonsale" ng-click="$event.stopPropagation();">'
                },
                {
                    field: "flockclassprice",
                    displayName: "Lock-Price",
                    cellTemplate: '<div class="ui-grid-cell-contents"><span>{{row.entity.cflockclassprice}}</span></div>',
                    editableCellTemplate: 'ui-grid/dropdownEditor',
                    editDropdownIdLabel: 'fpcid',
                    editDropdownValueLabel: 'fdescription',
                    //editDropdownOptionsArray: 'c.vendorListDD' doesn't work if assigned here
                    width: 150
                }
            ]
        };

        // Angulargrid
        this.priceclassGrid = {
            rowData: [],
            enableColResize: true,
            enableSorting: false,
            rowSelection: 'single',
            columnDefs: [
                {field: "fdescription", displayName: "Class", width: 150},
                {field: "cfsaleprice", displayName: "Price", cellRenderer: this.CompanySvc.currencyRenderer, width: 80},
                {field: "fusecostplus", displayName: "Cost-Plus", width: 80, cellRenderer: function(params) {
                    return '<input type="checkbox" disabled ' + (params.data.fusecostplus ? 'checked' : '') + ' />';
                }}
            ]
        };

        this.itemvendorsGrid = {
            data: 'vm.itemvendors.items | filter: {fitem: (vm.itemunitsGrid.gridApi.selection.getSelectedRows()[0].fitem == "") ? "-1" : vm.itemunitsGrid.gridApi.selection.getSelectedRows()[0].fitem} : true',
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
                    field: "fvid", displayName: "Vendor",
                    cellTemplate: '<div class="ui-grid-cell-contents"><span>{{row.entity.cfname}}</span></div>',
                    editableCellTemplate: 'ui-grid/dropdownEditor',
                    editDropdownIdLabel: 'fvid',
                    editDropdownValueLabel: 'fname',
                    //editDropdownOptionsArray: 'c.vendorListDD' doesn't work if assigned here
                    width: 300
                },
                {field: "fdescription", displayName: "Vendor Description", width: 300},
                {field: "flastprice", displayName: "Last Price", cellFilter: 'currency', type: 'string', width: 100},
            ]
        };
    }
}

// Must be done after class is declared for it to work
angular.module('app').controller('itemMaint', itemMaint);
