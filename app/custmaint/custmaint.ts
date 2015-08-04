///<reference path="../../typings/app.d.ts" />
///<reference path="../../app/services/DataEntrySvc.ts" />

class custmaint {
    selectedTab: number = 0;
    selectedTab2: number = 0;
    listCustomerGridSearch: string = '';
    ctype: string = 'N';
    gHeight: number;
    customeritemsHeight: number;
    customerlocationsHeight: number;
    searchId: string = '';
    searchIdError: string = '';
    showMoreEdit: boolean = true;
    retrieving: boolean = false;
    fitem: string = '';

    // objects, DS, Grids, arrays
    dESrvc: app.IDataEntrySrvc;
    customers: app.IDataStore;
    customeritems: app.IDataStore;
    customerlocations: app.IDataStore;

    listCustomerGrid: any;
    customeritemsGrid: any;
    customerlocationsGrid: any;
    salespersons: any[];
    priceclasses: any[];

    // Must be done for minified to work
    static $inject = ['$scope', '$filter', '$timeout', '$window', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'uiGridConstants', 'itemlistSvc', 'DataEntrySvc', 'companyRules'];
    constructor(private $scope, private $filter:ng.IFilterService, private $timeout:ng.ITimeoutService, private $window:ng.IWindowService, private $mdDialog, private DataSvc, private CompanySvc, private toastr:toastr.IToastrService, private uiGridConstants, private itemlistSvc, private DataEntrySvc, private companyRules) {
        // New Data Entry Service Instance
        this.dESrvc = DataEntrySvc.Instance();

        // Data Stores, Unique Keys, updatable, validate fields
        this.customers = this.dESrvc.newDataStore('customers', ['fcid'], true, ['fname', 'fterms', 'fshipmethod', 'fpcid', 'fspid', 'ftype', 'fterritory']);
        this.customeritems = this.dESrvc.newDataStore('customeritems', ['fcid', 'fitem'], true, ['fitem']);
        this.customerlocations = this.dESrvc.newDataStore('customerlocations', ['fcid', 'flocid'], true, ['fname']);

        // Get salespersons for DropDown
        DataSvc.serverDataGet('api/SalespersonMaint/GetSalespersonlist').then((dataResponse) => {
            this.salespersons = dataResponse;
        });

        // Get priceclass for DropDown
        DataSvc.serverDataGet('api/PriceClassMaint/GetList').then((dataResponse) => {
            this.priceclasses = dataResponse;

            var npricelcass = angular.copy(dataResponse);
            npricelcass.unshift({fpcid: null, fdescription: ''}); // Add Null Item
            this.customeritemsGrid.columnDefs[2].editDropdownOptionsArray = npricelcass;
        });

        angular.element($window).bind('resize', this.onResizeWindow); //Capture resize event
        this.onResizeWindow(); // Execute at start
        this.initGrids();
        this.dESrvc.initCodeTable(); // when codetable is needed

        // afterCellEdit + cellnav for grid
        this.customeritemsGrid.onRegisterApi = (gridApi) => {
            this.customeritemsGrid.gridApi = gridApi; // Save ref to grid
            // Cell Navigation
            gridApi.cellNav.on.navigate($scope, (newRowcol, oldRowCol) => {
                gridApi.selection.selectRow(newRowcol.row.entity); // select row
            });
            // Change Event
            gridApi.edit.on.afterCellEdit($scope, (rowEntity, colDef, newValue, oldValue) => {
                if (newValue === oldValue) return; // Exit no changes

                switch (colDef.field) {
                    case 'fpcid':
                        rowEntity.fpcid = newValue;
                        // Find description from seleted value, and when found assign and return
                        rowEntity.cfpcid = this.$filter('filter')(colDef.editDropdownOptionsArray, {fpcid: newValue}, true)[0].fdescription;
                        this.customeritemCalcPrice(rowEntity);
                        break;
                    case 'flockprice':
                        rowEntity.flockprice = this.CompanySvc.validNumber(newValue, 2); // Convert to number
                        this.customeritemCalcPrice(rowEntity);
                        break;
                }
            });
        };
        // afterCellEdit + cellnav for grid
        this.customerlocationsGrid.onRegisterApi = (gridApi) => {
            this.customerlocationsGrid.gridApi = gridApi; // Save ref to grid
            // Cell Navigation
            gridApi.cellNav.on.navigate($scope, (newRowcol, oldRowCol) => {
                gridApi.selection.selectRow(newRowcol.row.entity); // select row
            });
        };
    }

    // Valid Entry
    validEntry():boolean {
        if (this.customers.items.length !== 1) return false;
        return (this.customers.items[0].fcid.length > 0);
    }

    createCust(event) {
        this.dESrvc.pendingChangesContinue().then(() => {

            this.$mdDialog.show({
                targetEvent: event,
                title: 'New Customer ID',
                locals: {parent: this},
                controller: angular.noop,
                controllerAs: 'c',
                bindToController: true,
                template: '<md-dialog>' +
                '  <md-content>' +
                '   <h2 flex class="md-title" style="text-align: center">New Customer ID</h2>' +
                '   <div layout="row">' +
                '       <md-input-container md-no-float>' +
                '           <input type="text" ng-model="c.parent.searchId" upper-case placeholder="Enter ID" style="width: 250px;padding-left: 10px" auto-focus="600" />' +
                '       </md-input-container>' +
                '   </div>' +
                '   <span class="widget-error">{{c.parent.searchIdError}}</span>' +
                '  </md-content>' +
                '  <div class="md-actions">' +
                '    <md-button ng-click="c.parent.dESrvc.mdDialogCancel()">Cancel</md-button>' +
                '    <md-button ng-click="c.parent.validateSearchId()">Continue</md-button>' +
                '  </div>' +
                '</md-dialog>'

            }).then(() => {
                this.retrieving = true; // Global flag set on
                this.customers.loadData([]);
                this.customeritems.loadData([]);
                this.customerlocations.loadData([]);

                this.customers.addRow({
                    fcid: this.searchId,
                    factive: true,
                    fistaxexcempt: false,
                    fgetpricelist: 'N'
                });

                this.$timeout(() => {
                    this.retrieving = false;
                    this.searchId = ''; // Clear Value
                    angular.element('#fname')[0].focus(); // Set focus
                }, 300); // Global flag set off
            });
        });
    }

    // Validate New ID
    validateSearchId() {
        if (!this.searchId) {
            this.$mdDialog.cancel();
            return;
        }

        this.DataSvc.serverDataGet('api/CustomerMaint/GetValidateCustomer', {pfcid: this.searchId}).then((dataResponse) => {
            if (dataResponse.length === 0)
                this.$mdDialog.hide();
            else
                this.searchIdError = "Customer ID Already Exist!";
        });
    }

    // Save
    update() {
        if (!this.validEntry()) return;
        if (!this.dESrvc.checkForChanges()) return;

        var msg = this.dESrvc.validate();
        if (msg !== '') {
            this.showValidateMsg(msg);
            return;
        }
        // Validate Details
        if (this.customerlocations.items.length < 1) {
            this.toastr.warning('Customer Must Have At Least 1 Location');
            return;
        }

        this.CompanySvc.ofSetHourGlass(true);

        // Last Update
        this.customers.items[0].ts = new Date();
        this.customers.items[0].fby = this.CompanySvc.userInfo.fname;

        // Send to Server
        this.dESrvc.update('api/CustomerMaint/Postupdate').then((dataResponse) => {
            this.CompanySvc.ofSetHourGlass(false);
        });
    }

    // Parse Error Msg
    showValidateMsg(msg) {
        var fieldmsg = '', tablemsg = '';

        switch (msg.table) {
            case 'customers':
                tablemsg = 'PROPERTIES';
                switch (msg.field) {
                    case 'fname':
                        fieldmsg = "NAME";
                        break;
                    case 'fterms':
                        fieldmsg = "TERMS";
                        break;
                    case 'fshipmethod':
                        fieldmsg = "SHIPPING METHOD";
                        break;
                    case 'fpcid':
                        fieldmsg = "PRICE CLASS";
                        break;
                    case 'fspid':
                        fieldmsg = "SALES PERSON";
                        break;
                    case 'fterritory':
                        fieldmsg = "TERRITORY";
                        break;
                    case 'ftype':
                        fieldmsg = "TYPE";
                        break;
                }
                break;
            case 'customeritems':
                tablemsg = 'CUSTOMER ITEMS';
                switch (msg.field) {
                    case 'fitem':
                        fieldmsg = 'ITEM';
                        break;
                }
                break;
            case 'customerlocations':
                tablemsg = 'LOCATIONS';
                switch (msg.field) {
                    case 'fname':
                        fieldmsg = 'NAME';
                        break;
                }
                break;
        }

        this.toastr.error(fieldmsg + ' value missing in ' + tablemsg);
    }

    searchNumber() {
        if (!this.searchId) return;
        //this.searchId = this.searchId.replace(/[^0-9\.-]/g, '');
        //if (this.searchId === '') return; //Remove non-numeric, period or minus char

        this.CompanySvc.ofSetHourGlass(true);
        this.DataSvc.serverDataGet('api/CustomerMaint/GetValidateCustomer', {pfcid: this.searchId}).then((dataResponse)=> {
            if (dataResponse.length > 0) {
                this.retrieveCust(dataResponse[0].fcid);
                this.searchId = '';
            }
            else
                this.toastr.info('Customer ID Not Found');

            this.CompanySvc.ofSetHourGlass(false);
        });
    }

    retrieveCust(fcid) {
        if (!fcid) return;
        this.dESrvc.pendingChangesContinue().then(() => {
            this.retrieving = true; // Global flag set on

            this.CompanySvc.ofSetHourGlass(true);
            this.DataSvc.serverDataGet('api/CustomerMaint/GetCustomer', {pfcid: fcid}).then((dataResponse) => {
                this.customers.loadData(dataResponse.customers);
                this.customeritems.loadData(dataResponse.customeritems);
                this.customerlocations.loadData(dataResponse.customerlocations);

                this.customeritemCalcPrice();

                this.$timeout(() => {
                    this.retrieving = false
                }, 300); // Global flag set off
                this.CompanySvc.ofSetHourGlass(false);
            });
        });
    }

    listGridDoubleClick = (params) => {
        this.retrieveCust(params.data.fcid);
        this.selectedTab = 1
    };

    // Add item
    customeritemsAddItem(pitem) {
        if (this.$filter('filter')(this.customeritems.items, {fitem: pitem.fitem}, true).length > 0) return; // No duplicates

        var rowIndex = this.customeritems.addRow({
            fcid: this.customers.items[0].fcid,
            fitem: pitem.fitem,
            flockprice: 0,
            flastprice: 0,
            // item related fields
            cfdescription: pitem.cfdescription,
            fbaseprice: pitem.fbaseprice,
            funits: pitem.funits,
            fusablep: pitem.fusablep,
            fcostplus: pitem.fcostplus,
            flockclassprice: pitem.flockclassprice,
            ffreightcost: pitem.ffreightcost,
            cfprice: this.companyRules.calcSellPrice(this.priceclasses, pitem.flockclassprice, this.customers.items[0].fpcid, pitem.fbaseprice, pitem.ffreightcost, pitem.funits, pitem.fusablep, pitem.fcostplus, 0)
        });

        this.dESrvc.scrollToLastRow(this.customeritemsGrid, 2); // Scroll to new row (always last)
    }

    // Add scanned item
    fitemOnChange() {
        if (this.retrieving) return false; // while retrieving exit
        if (this.fitem.length < 3) return false;

        this.DataSvc.serverDataGet('api/ItemMaint/GetValidateItem', {pfitem: this.fitem}).then((dataResponse) => {
            if (dataResponse.length == 0) {
                this.toastr.info('Item not found!');
                return;
            }

            this.fitem = ''; // Clear value
            this.customeritemsAddItem(dataResponse[0]);
        });
    }

    lastpriceupdate() {
        if (!this.validEntry()) return;

        for (var i = 0; i < this.customeritems.items.length; i++) {
            var obj = this.customeritems.items[i];
            obj.flastprice = obj.cfprice;
        }
    }

    customeritemCalcPrice(row?) {
        var mfpcid;
        // 1 row
        if (row) {
            mfpcid = (row.fpcid) ? row.fpcid :  this.customers.items[0].fpcid;
            row.cfprice = this.companyRules.calcSellPrice(this.priceclasses, row.flockclassprice, mfpcid, row.fbaseprice, row.ffreightcost, row.funits, row.fusablep, row.fcostplus, row.flockprice)
        }
        // All rows
        else {
            for (var i = 0; i < this.customeritems.items.length; i++) {
                var obj = this.customeritems.items[i];
                mfpcid = (obj.fpcid) ? obj.fpcid :  this.customers.items[0].fpcid;
                obj.cfprice = this.companyRules.calcSellPrice(this.priceclasses, obj.flockclassprice, mfpcid, obj.fbaseprice, obj.ffreightcost, obj.funits, obj.fusablep, obj.fcostplus, obj.flockprice)
            }
        }
    }

    // mdDialog to select 1 to add to
    itemsAdd(evt) {
        if (!this.validEntry()) return;
        // show mdDialog
        this.itemlistSvc.show(event, this.customers.items[0].fpcid).then((row) => {
            this.customeritemsAddItem(row); //  Add selection to customeritems
        });
    }

    // Generic remove row
    gridRemove(grid, items, event) {
        if (!this.validEntry()) return;
        if (grid.gridApi.selection.getSelectedRows().length == 0) return; // No selected row

        items.removeRow(event, grid.gridApi.selection.getSelectedRows()[0]);
    }

    // Remove Rows
    itemsRemove(event) {
        this.gridRemove(this.customeritemsGrid, this.customeritems, event);
    }

    // Remove Rows
    locationsRemove(event) {
        this.gridRemove(this.customerlocationsGrid, this.customerlocations, event);
    }

    locationsAdd() {
        if (!this.validEntry()) return;

        this.customerlocations.addRow({
            fcid: this.customers.items[0].fcid,
            flocid: this.dESrvc.getMaxValue(this.customerlocations.items, 'flocid') + 1,
        });

        this.dESrvc.scrollToLastRow(this.customerlocationsGrid, 0); // Scroll to new row (always last)
    }

    copyAddress() {
        if (!this.validEntry()) return;
        if (this.customerlocationsGrid.gridApi.selection.getSelectedRows().length == 0) return; // No selected row

        var row = this.customerlocationsGrid.gridApi.selection.getSelectedRows()[0];
        row.fname = this.customers.items[0].fname;
        row.faddress1 = this.customers.items[0].faddress1;
        row.faddress2 = this.customers.items[0].faddress2;
        row.fcity = this.customers.items[0].fcity;
        row.fstate = this.customers.items[0].fstate;
        row.fzip = this.customers.items[0].fzip;
        row.fphone = this.customers.items[0].fphone1;
        row.fcontact = this.customers.items[0].fcontact;
    }

    printPL(pNew) {
        if (!this.validEntry()) return;

        this.CompanySvc.ofSetHourGlass(true);

        var mParms = 'pfcid=' + this.customers.items[0].fcid + '&pNew=' + pNew;
        this.CompanySvc.ofCreateJasperReport('CustItemList.pdf', mParms).then((pResponse) => {
            // Open PDF file
            this.$timeout(() => {this.CompanySvc.ofOpenServerFile(pResponse.data);}, 1000);
        });
    }

    // Get Customer List
    listCustomerGridRefresh(value) {
        if (value.length < 3 && this.ctype !== 'A') {
            this.toastr.warning('Minimun 3 Characters');
            return;
        }

        this.CompanySvc.ofSetHourGlass(true);
        this.DataSvc.serverDataGet('api/CustomerMaint/GetCustomerList', {
            pActive: true,
            pName: value,
            pType: this.ctype
        }).then((dataResponse) => {
            this.listCustomerGrid.rowData = dataResponse;
            this.listCustomerGrid.api.onNewRows();

            if (dataResponse.length === 0) this.toastr.info('No Rows found');
            this.CompanySvc.ofSetHourGlass(false);
        });
    }

    // Resize gridlist to fill window
    onResizeWindow = () => {
        this.$timeout(() => {
            this.gHeight = this.$window.innerHeight - 115;
            this.customeritemsHeight = (this.showMoreEdit) ? this.$window.innerHeight - 500 : this.$window.innerHeight - 360;
            this.customerlocationsHeight = (this.showMoreEdit) ? this.$window.innerHeight - 465 : this.$window.innerHeight - 325;
        }, 100);
    };

    // Show more/less properties
    toggleShowMoreEdit() {
        this.showMoreEdit = !this.showMoreEdit;
        this.onResizeWindow();
    }

    // Initialize Grid presentation (s/b on html)
    initGrids() {
        // AngularGrid
        this.listCustomerGrid = {
            rowData: [],
            enableColResize: true,
            enableSorting: true,
            rowSelection: 'single',
            columnDefs: [
                {field: "fcid", displayName: "ID", width: 250, cellDoubleClicked: this.listGridDoubleClick},
                {field: "fname", displayName: "Name", width: 300, cellDoubleClicked: this.listGridDoubleClick},
                {field: "cfpcid", displayName: "Price Class", width: 150, cellDoubleClicked: this.listGridDoubleClick},
                {field: "faddress1", displayName: "Address", width: 250, cellDoubleClicked: this.listGridDoubleClick},
                {field: "fcontact", displayName: "Contact", width: 200, cellDoubleClicked: this.listGridDoubleClick},
                {field: "fphone1", displayName: "Phone", width: 115, cellRenderer: this.CompanySvc.phoneRenderer, cellDoubleClicked: this.listGridDoubleClick},
                {field: "cfterms", displayName: "Terms", width: 150, cellDoubleClicked: this.listGridDoubleClick},
                {field: "fnotes", displayName: "Notes", width: 350, cellDoubleClicked: this.listGridDoubleClick}
            ]
        };

        // ui-grid
        this.customeritemsGrid = {
            data: 'vm.customeritems.items',
            enableRowHeaderSelection: false,
            enableSorting: false,
            enableHorizontalScrollbar: 2,
            enableVerticalScrollbar: 2,
            enableColumnMenus: false,
            minRowsToShow: 4,
            enableCellEditOnFocus: true,
            multiSelect: false,
            columnDefs: [
                {field: "fitem", displayName: "Item Number", width: 200, enableCellEdit: false},
                {field: "cfdescription", displayName: "Description", width: 300, enableCellEdit: false},
                {
                    field: "fpcid", displayName: "Price-Class", width: 130,
                    cellTemplate: '<div class="ui-grid-cell-contents"><span>{{row.entity.cfpcid}}</span></div>',
                    editableCellTemplate: 'ui-grid/dropdownEditor',
                    editDropdownIdLabel: 'fpcid',
                    editDropdownValueLabel: 'fdescription'
                    //editDropdownOptionsArray: 'this.dESrvc.codeTable | filter: {fgroupid: "CCT"}' Does not work must assign in code
                },
                {field: "flockprice", displayName: "Lock-Price", cellFilter: 'currency', type: 'string', width: 100},
                {field: "cfprice", displayName: "Price", cellFilter: 'currency', width: 80, enableCellEdit: false},
                {field: "flastprice", displayName: "Last-Price", cellFilter: 'currency', width: 90, enableCellEdit: false}
            ]
        };

        // ui-grid
        this.customerlocationsGrid = {
            data: 'vm.customerlocations.items',
            enableRowHeaderSelection: false,
            enableSorting: false,
            enableHorizontalScrollbar: 2,
            enableVerticalScrollbar: 2,
            enableColumnMenus: false,
            minRowsToShow: 4,
            enableCellEditOnFocus: true,
            multiSelect: false,
            columnDefs: [
                {field: "fname", displayName: "Name", width: 250},
                {field: "fphone", displayName: "Phone", width: 115, cellFilter: 'phone'},
                {field: "fcontact", displayName: "Contact", width: 200},
                {field: "faddress1", displayName: "Address1", width: 250},
                {field: "faddress2", displayName: "Address2", width: 250},
                {field: "fcity", displayName: "City", width: 150},
                {field: "fstate", displayName: "State", width: 80},
                {field: "fzip", displayName: "Zip Code", width: 150}
            ]
        };
    }
}

// Must be done after class is declared for it to work
angular.module('app').controller('custmaint', custmaint);
