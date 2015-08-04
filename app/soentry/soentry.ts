///<reference path="../../typings/app.d.ts" />
///<reference path="../../app/services/DataEntrySvc.ts" />
///<reference path="soentrybase.ts" />

class soentryCtrl extends app.soentrybase {
    // Declare all variables
    listCustomerGridSearch:string = '';
    selectedTab:number = 0;
    ctype:string = 'N';
    sotype:string = 'C';
    sostatus:string = 'O';
    sodatef:Date = new Date();
    sodatet:Date = new Date();
    searchItemType:string = 'I'; // Initial value only for ItemList
    showMoreEdit:boolean;
    fitem:string;
    gHeight:number;
    salesdetailsHeight:number;

    // objects, DS, Grids, arrays
    listCustomerGrid:any;
    listSOGrid:any;
    salesdetailsGrid:any;
    itemcustomersGrid:any;
    itemHistoryGrid:any;
    customerterms:any[];
    salespersons:any[];
    orderstatus: any[];

    // Must be done for minified to work
    static $inject = ['$q', '$scope', '$filter', '$timeout', '$window', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'uiGridConstants', 'itemlistSvc', 'DataEntrySvc', 'companyRules'];
    constructor(private $q:ng.IQService, private $scope:ng.IScope, private $filter:ng.IFilterService, private $timeout:ng.ITimeoutService, private $window:ng.IWindowService, private $mdDialog, private DataSvc, private CompanySvc, private toastr:toastr.IToastrService, private uiGridConstants, private itemlistSvc, private DataEntrySvc, private companyRules) {
        super($q, $scope, $filter, $timeout, $window, $mdDialog, DataSvc, CompanySvc, toastr, DataEntrySvc, companyRules);

        this.orderOrigin = 'SO';
        this.sodatef.setHours(12, 0, 0); // set hours to noon always
        this.sodatet.setHours(12, 0, 0);

        angular.element($window).bind('resize', this.onResizeWindow); //Capture resize event
        this.onResizeWindow(); // Execute at start
        this.initGrids();

        // Get salesperson for DropDown
        DataSvc.serverDataGet('api/SalespersonMaint/GetSalespersonlist').then((dataResponse) => {
            this.salespersons = dataResponse;
        });

        // Get priceclass for DropDown
        DataSvc.serverDataGet('api/PriceClassMaint/GetList').then((dataResponse) => {
            this.priceclasses = dataResponse;

            var npricelcass = angular.copy(dataResponse);
            npricelcass.unshift({fpcid: null, fdescription: ''}); // Add Null Item
            this.salesdetailsGrid.columnDefs[4].editDropdownOptionsArray = npricelcass;
        });

        this.dESrvc.initCodeTable().then((dataResponse) => {
            this.orderstatus = angular.copy($filter('filter')(dataResponse, {fgroupid: 'SOS'}, true));
            this.orderstatus.unshift({fid: 'A', fdescription: 'All'}); // Add All
        });

        // After salesorders.fdiscountp calculate totals
        $scope.$watch('vm.salesorders.items[0].fdiscountp', (newValue, oldValue) => {
            if (this.retrieving) return; // while retrieving exit
            if (oldValue === newValue) return; // no changes exit

            this.salesordersTotals();
        });

        // afterCellEdit + cellnav for grid
        this.salesdetailsGrid.onRegisterApi = (gridApi) => {
            this.salesdetailsGrid.gridApi = gridApi; // Save ref to grid
            // Cell Navigation
            gridApi.cellNav.on.navigate($scope, (newRowcol, oldRowCol) => {
                gridApi.selection.selectRow(newRowcol.row.entity); // select row
            });
            // Change Event
            gridApi.edit.on.afterCellEdit($scope, (rowEntity, colDef, newValue, oldValue) => {
                if (newValue === oldValue) return; // Exit no changes

                switch (colDef.field) {
                    case 'fqty':
                        rowEntity.fqty = this.CompanySvc.validNumber(newValue); // Convert to number
                        this.salesdetailsComputed(rowEntity, rowEntity.fprice, rowEntity.fqty);
                        this.salesordersTotals();
                        break;
                    case 'fpcid':
                        rowEntity.fpcid = newValue;
                        // Find description from seleted value, and when found assign and return
                        rowEntity.cfpcid = this.$filter('filter')(colDef.editDropdownOptionsArray, {fpcid: newValue}, true)[0].fdescription;
                        if (rowEntity.fpcid == null) {
                            // Reset Price
                            this.DataSvc.serverDataGet('api/ItemMaint/GetItemPrice', {pfitem: rowEntity.fitem, pfcid: this.salesorders.items[0].fcid}).then((dataResponse) => {
                                rowEntity.fprice = dataResponse[0].fprice;
                                this.salesdetailsComputed(rowEntity, rowEntity.fprice, rowEntity.fqty);
                                this.salesordersTotals();
                            });

                        }
                        else {
                            this.itemCalcPrice(rowEntity);
                            this.salesdetailsComputed(rowEntity, rowEntity.fprice, rowEntity.fqty);
                            this.salesordersTotals();
                        }
                        break;
                }
            });
        };

        //// afterCellEdit + cellnav for grid
        //this.salespaymentsGrid.onRegisterApi = (gridApi) => {
        //    this.salespaymentsGrid.gridApi = gridApi; // Save ref to grid
        //    // Cell Navigation
        //    gridApi.cellNav.on.navigate($scope, (newRowcol, oldRowCol) => {
        //        gridApi.selection.selectRow(newRowcol.row.entity); // select row
        //    });
        //    // Change Event
        //    gridApi.edit.on.afterCellEdit($scope, (rowEntity, colDef, newValue, oldValue) => {
        //        if (newValue === oldValue) return; // Exit no changes
        //
        //        switch (colDef.field) {
        //            case 'famount':
        //                rowEntity.famount = this.CompanySvc.validNumber(newValue, 2); // Convert to number
        //                // Except for cash, value cannot exceed balance
        //                if (rowEntity.ftype !== 'CSH') {
        //                    rowEntity.famount = Math.min(rowEntity.famount, this.salesorders.items[0].fbalance + oldValue);
        //                }
        //
        //                this.salesordersTotals();
        //                break;
        //            case 'ftype':
        //                // Find description from seleted value, and when found assign and return
        //                for (var i = 0; i < colDef.editDropdownOptionsArray.length; i++) {
        //                    if (colDef.editDropdownOptionsArray[i].fid == newValue) {
        //                        rowEntity.cftype = colDef.editDropdownOptionsArray[i].fdescription;
        //                        return;
        //                    }
        //                }
        //                break;
        //        }
        //    });
        //};
    }

    itemCalcPrice(row?) {
        var mfpcid;
        // 1 row
        if (row) {
            mfpcid = (row.fpcid) ? row.fpcid :  this.salesorders.items[0].fpcid;
            row.fprice = this.companyRules.calcSellPrice(this.priceclasses,
                row.flockclassprice, mfpcid,
                row.fbaseprice,
                row.ffreightcost,
                row.funits,
                row.fusablep,
                row.fcostplus,
                row.flockprice)
        }
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

    // Get SO List
    listSOGridRefresh() {
        if (this.sotype === 'C' && this.listCustomerGrid.selectedRows.length == 0) {
            this.toastr.info('Customer must be selected');
            return;
        }

        var fcid = (this.sotype === 'C') ? this.listCustomerGrid.selectedRows[0].fcid : 0;

        this.CompanySvc.ofSetHourGlass(true);
        this.DataSvc.serverDataGet('api/SO/GetSOList', {
            psotype: this.sotype,
            pfcid: fcid,
            pdatef: this.sodatef,
            pdatet: this.sodatet,
            pfstatus: this.sostatus
        }).then((dataResponse) => {
            this.listSOGrid.rowData = dataResponse;
            this.listSOGrid.api.onNewRows();

            if (dataResponse.length === 0) this.toastr.info('No Rows found');
            this.CompanySvc.ofSetHourGlass(false);
        });
    }

    listGridDoubleClick = (params) => {
        this.createSO(params.data);
        this.selectedTab = 1
    };

    listSOGridDoubleClick = (params) => {
        this.retrieveSO(params.data.fsoid);
        this.selectedTab = 1
    };

    //// Override parent
    //postRetrieveSO() {
    //    this.salesdetailsGrid.mCurrentRow = []; // Reset
    //    this.salespaymentsGrid.mCurrentRow = []; // Reset
    //}
    //
    //// Override parent
    //postCreateSO() {
    //    this.salesdetailsGrid.mCurrentRow = []; // Reset
    //    this.salespaymentsGrid.mCurrentRow = []; // Reset
    //}

    printSO(pType:string) {
        if (!this.validEntry()) return;

        this.CompanySvc.ofSetHourGlass(true);

        var mParms = 'pfsoid=' + this.salesorders.items[0].fsoid;
        this.CompanySvc.ofCreateJasperReport('SODocument.pdf', mParms).then((pResponse) => {
            // Open PDF file
            this.$timeout(() => {this.CompanySvc.ofOpenServerFile(pResponse.data);}, 1000);
        });

        //this.CompanySvc.ofSetHourGlass(true);
        //
        //var mParms = [
        //    {fline: 1, fnumber: this.salesorders.items[0].fsoid}
        //];
        //
        //var rpt = (pType == 'I') ? 'd_salesorder_invoice_rpt' : 'd_salesorder_packinglist_rpt';
        //this.CompanySvc.ofCreateReport(rpt, mParms).then((pResponse) => {
        //    // Open PDF file
        //    setTimeout(() => {
        //        this.CompanySvc.ofOpenServerFile(pResponse.data);
        //    }, 1000);
        //});
    }

    // Show more/less properties
    toggleShowMoreEdit() {
        this.showMoreEdit = !this.showMoreEdit;
        this.onResizeWindow();
    }

    // Resize gridlist to fill window
    onResizeWindow = () => {
        this.$timeout(() => {
            this.gHeight = this.$window.innerHeight - 395;
            var newHeight = (this.showMoreEdit) ? 500 : 310;
            this.salesdetailsHeight = this.$window.innerHeight - newHeight;
        }, 100);
    };

    // Add scanned item
    fitemOnChange() {
        if (this.retrieving) return false; // while retrieving exit
        if (this.fitem.length < 3) return false;

        this.salesdetailsAddItemByFitem(this.fitem).then((row) => {
            if (row) {
                this.fitem = ''; // Clear value
                //this.dESrvc.scrollToLastRow(this.salesdetailsGrid, 4); // Scroll to new row (always last) and park on Price
                this.dESrvc.scrollToRow(this.salesdetailsGrid, 2, row);
            }
        });
    }

    // mdDialog to choose Customer Items
    addCustomerItems(event) {
        if (!this.validEntry()) return;

        this.DataSvc.serverDataGet('api/ItemMaint/GetCustomerItemList', {
            pfcid: this.salesorders.items[0].fcid,
            pfpcid: this.salesorders.items[0].cfpcid
        }).then((dataResponse) => {
            // Display List
            this.itemcustomersGrid.rowData = dataResponse;
            // Set initial value
            for (var i = 0; i < this.itemcustomersGrid.rowData.length; i++) {
                this.itemcustomersGrid.rowData[i].cqty = 0;
            }
            this.$timeout(() => {this.itemcustomersGrid.api.onNewRows();}, 300);

            this.$mdDialog.show({
                targetEvent: event,
                title: 'Customer Items Selection',
                locals: {parent: this},
                controller: angular.noop,
                controllerAs: 'c',
                bindToController: true,
                //escapeToClose: false,
                templateUrl: 'app/templates/itemcustomers_list.tmpl.html'
            }).then(() => {
                var calcTotal = false;
                // Add items with valid cqty
                for (var i = 0; i < this.itemcustomersGrid.rowData.length; i++) {
                    if (this.itemcustomersGrid.rowData[i].cqty > 0) {
                        this.salesdetailsAddItem(this.itemcustomersGrid.rowData[i], false);
                        calcTotal = true;
                    }
                }

                if (calcTotal) this.salesordersTotals();
            });
        });
    }

    // mdDialog to view purchase history for current item
    viewHistory(evt) {
        if (!this.validEntry()) return;
        if (this.salesdetailsGrid.gridApi.selection.getSelectedRows().length == 0) return; // No selected row

        // Get Date
        this.DataSvc.serverDataGet('api/SO/GetItemHistory', {
            pfitem: this.salesdetailsGrid.gridApi.selection.getSelectedRows()[0].fitem,
            pfcid: this.salesorders.items[0].fcid
        }).then((dataResponse) => {
            this.itemHistoryGrid.rowData = dataResponse;
            this.$timeout(() => {
                this.itemHistoryGrid.api.onNewRows();
            }, 300);

            this.$mdDialog.show({
                targetEvent: evt,
                locals: {parent: this},
                controller: angular.noop,
                controllerAs: 'c',
                bindToController: true,
                templateUrl: 'app/templates/itemhistorylist.tmpl.html'
            });
        });

    }

    // mdDialog to select 1 to add to salesdetails
    salesdetailsAdd(evt) {
        if (!this.validEntry()) return;

        // show mdDialog
        this.itemlistSvc.show(event, this.salesorders.items[0].cfpcid).then((row) => {
            // Get Price
            this.DataSvc.serverDataGet('api/ItemMaint/GetItemPrice', {
                pfitem: row.fitem,
                pfcid: this.salesorders.items[0].fcid
            }).then((dataResponse) => {
                row.fprice = dataResponse[0].fprice; // Force non-existing value
                this.salesdetailsAddItem(row, true); //  Add selection to salesdetails
                this.dESrvc.scrollToLastRow(this.salesdetailsGrid, 2); // Scroll to new row (always last) and park on fqty
            });
        });
    }

    // Remove Rows
    salesdetailsRemove(event) {
        if (!this.validEntry()) return;
        if (this.salesdetailsGrid.gridApi.selection.getSelectedRows().length == 0) return; // No selected row

        this.salesdetails.removeRow(event, this.salesdetailsGrid.gridApi.selection.getSelectedRows()[0]).then(() => {
            this.salesordersTotals();
        });
    }

    // Save details to favorites
    saveFavorites() {
        if (!this.validEntry()) return;
        this.CompanySvc.ofSetHourGlass(true);
        // Create array
        var favorites = [];
        for (var i = 0; i < this.salesdetails.items.length; i++) {
            favorites.push({fitem: this.salesdetails.items[i].fitem, fcid: this.salesorders.items[0].fcid});
        }
        // Save
        this.DataSvc.serverDataPost('api/SO/PostFavorites', favorites).then((dataResponse) => {
            this.toastr.success('Customer List Saved.');
            this.CompanySvc.ofSetHourGlass(false);
        });
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
                {field: "fcid", displayName: "ID", width: 200, cellDoubleClicked: this.listGridDoubleClick},
                {field: "fname", displayName: "Name", width: 300, cellDoubleClicked: this.listGridDoubleClick},
                {field: "cfpcid", displayName: "Price Class", width: 150, cellDoubleClicked: this.listGridDoubleClick},
                {field: "faddress1", displayName: "Address", width: 250, cellDoubleClicked: this.listGridDoubleClick},
                {field: "fcontact", displayName: "Contact", width: 200, cellDoubleClicked: this.listGridDoubleClick},
                {field: "fphone1", displayName: "Phone", width: 115, cellRenderer: this.CompanySvc.phoneRenderer, cellDoubleClicked: this.listGridDoubleClick},
                {field: "cfterms", displayName: "Terms", width: 150, cellDoubleClicked: this.listGridDoubleClick},
                {field: "fnotes", displayName: "Notes", width: 350, cellDoubleClicked: this.listGridDoubleClick}
            ]
        };
        // AngularGrid
        this.listSOGrid = {
            rowData: [],
            enableColResize: true,
            enableSorting: true,
            rowSelection: 'single',
            columnDefs: [
                {field: "fdocnumber", displayName: "S.O.#", width: 60, cellDoubleClicked: this.listSOGridDoubleClick},
                {field: "fdate", displayName: "Date", width: 85, cellRenderer: this.CompanySvc.dateRenderer, cellDoubleClicked: this.listSOGridDoubleClick},
                {field: "finvoice_date", displayName: "Invoiced", width: 85, cellRenderer: this.CompanySvc.dateRenderer, cellDoubleClicked: this.listSOGridDoubleClick},
                {field: "cfstatus", displayName: "Status", width: 80, cellDoubleClicked: this.listSOGridDoubleClick},
                {field: "fname", displayName: "Customer", width: 250, cellDoubleClicked: this.listSOGridDoubleClick},
                { field: "ftotal", displayName: "Total", width: 100, cellRenderer: this.CompanySvc.currencyRenderer, cellClass: 'right-text', cellDoubleClicked: this.listSOGridDoubleClick}
            ]
        };
        // ui-grid
        this.salesdetailsGrid = {
            data: 'vm.salesdetails.items',
            enableRowHeaderSelection: false,
            enableSorting: false,
            enableHorizontalScrollbar: 2,
            enableVerticalScrollbar: 2,
            enableColumnMenus: false,
            minRowsToShow: 4,
            enableCellEditOnFocus: true,
            showColumnFooter: true,
            multiSelect: false,
            columnDefs: [
                {field: "fitem", displayName: "Item Number", width: 200, enableCellEdit: false},
                {field: "fdescription", displayName: "Description", width: 300},
                {
                    field: "fqty", displayName: "Qty", cellFilter: 'number', width: 80, type: 'string',
                    aggregationType: this.uiGridConstants.aggregationTypes.sum,
                    aggregationHideLabel: true,
                },
                {
                    field: "fshipqty", displayName: "Ship Qty", cellFilter: 'number', width: 80, type: 'string',
                    aggregationType: this.uiGridConstants.aggregationTypes.sum,
                    aggregationHideLabel: true,
                },
                {
                    field: "fpcid", displayName: "Price-Class", width: 130,
                    cellTemplate: '<div class="ui-grid-cell-contents"><span>{{row.entity.cfpcid}}</span></div>',
                    editableCellTemplate: 'ui-grid/dropdownEditor',
                    editDropdownIdLabel: 'fpcid',
                    editDropdownValueLabel: 'fdescription'
                },
                {field: "fprice", displayName: "Price", cellFilter: 'currency', width: 80, enableCellEdit: false},
                // Computed column
                {field: "cextended", displayName: "Extended", cellFilter: 'currency', width: 100, cellClass: 'right-text',enableCellEdit: false}
            ]
        };
        // AngularGrid
        this.itemcustomersGrid = {
            rowData: [],
            enableColResize: true,
            enableSorting: true,
            rowSelection: 'single',
            columnDefs: [
                {field: "cqty", displayName: "Qty", width: 50, editable: true}, // Non Existing Column
                {field: "fitem", displayName: "Item Number", width: 200},
                {field: "fdescription", displayName: "Description", width: 300},
                {field: "fuomdescription", displayName: "UOM Description", width: 200},
                {field: "fprice", displayName: "Price", cellRenderer: this.CompanySvc.currencyRenderer, width: 100},
                {field: "funits", displayName: "# Units", width: 80}
            ]
        };
        // AngularGrid
        this.itemHistoryGrid = {
            rowData: [],
            enableColResize: true,
            enableSorting: true,
            rowSelection: 'single',
            columnDefs: [
                {field: "fdocnumber", displayName: "S.O.#", width: 100},
                {field: "finvoice_date", displayName: "Invoice Date", cellRenderer: this.CompanySvc.dateRenderer, width: 120},
                {field: "fprice", displayName: "Price", cellRenderer: this.CompanySvc.currencyRenderer, width: 100},
                {field: "fitem", displayName: "Item Number", width: 200},
                {field: "fdescription", displayName: "Description", width: 300},
                {field: "fshipqty", displayName: "Qty", width: 100}
            ]
        };
    }
}

// Must be done after class is declared for it to work
angular.module('app').controller('soentryCtrl', soentryCtrl);
