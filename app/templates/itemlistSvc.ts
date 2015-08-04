///<reference path="../../typings/app.d.ts" />

module app {
    "use strict";

    export class itemlistSvc {
        searchItemType:string = 'D'; // By description
        searchItem:string;
        itemListGrid:any;
        fpriceclass: string;
        fpcid: number;
        priceclass: any[];

        static $inject = ['$q', '$timeout', '$filter', '$mdDialog', 'DataSvc', 'toastr', 'CompanySvc', 'companyRules'];
        constructor(private $q, private $timeout, private $filter, private $mdDialog, private DataSvc, private toastr, private CompanySvc, private companyRules) {
            this.initGrids();
        }

        // mdDialog
        show(eventt, pfpcid?) {
            // Set Values to display
            this.searchItem = "";
            this.itemListGrid.rowData = [];
            this.fpcid = pfpcid;

            // Get priceclass each time this opens
            this.DataSvc.serverDataGet('api/PriceClassMaint/GetList').then((dataResponse) => {
                this.priceclass = dataResponse;
            });

            return this.$mdDialog.show({
                targetEvent: eventt,
                locals: {parent: this},
                controller: angular.noop,
                controllerAs: 'c',
                bindToController: true,
                templateUrl: 'app/templates/itemlist.tmpl.html'
            }).then(() => {
                if (this.itemListGrid.selectedRows.length == 0) return;
                return this.itemListGrid.selectedRows[0];
            });
        }

        // Retrieve items for ItemList mdDialog
        searchItemOnChange(value) {
            if (value.length < 3 && (this.searchItemType !== 'O' && this.searchItemType !== 'A')) return;

            this.CompanySvc.ofSetHourGlass(true);
            // Get searching data
            var api = '';
            switch (this.searchItemType) {
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

            this.DataSvc.serverDataGet(api, {psearch: value, pActive: true, pType: this.searchItemType}).then((dataResponse) => {
                this.itemListGrid.rowData = dataResponse;
                this.itemListGrid.api.onNewRows();
                this.listGridSetPrice();

                if (dataResponse.length === 0) this.toastr.info('No Rows found');
                this.CompanySvc.ofSetHourGlass(false);
            });
        }

        listGridSetPrice() {
            var rD = this.itemListGrid.rowData;

            // Calculate values
            for (var i = 0; i < rD.length; i++) {
                rD[i].cfcost = this.companyRules.getUnitCost(rD[i].fbaseprice, rD[i].ffreightcost, rD[i].funits, rD[i].fusablep);
                rD[i].cfsaleprice = this.companyRules.calcSellPrice(this.priceclass, rD[i].flockclassprice, this.fpcid, rD[i].fbaseprice, rD[i].ffreightcost, rD[i].funits, rD[i].fusablep, rD[i].fcostplus, 0);
            }

            this.itemListGrid.api.refreshView();
        }

        // Close open dialog
        dialogClose() {
            this.$mdDialog.hide();
        }

        // Close open dialog
        dialogCancel() {
            this.$mdDialog.cancel();
        }

        // Initialize Grid presentation (s/b on html)
        initGrids() {
            // AngularGrid
            this.itemListGrid = {
                rowData: [],
                enableColResize: true,
                enableSorting: true,
                rowSelection: 'single',
                //selectionChanged: this.itemListGridSelectionChanged,
                columnDefs: [
                    {field: "fimid", displayName: "ID", width: 55},
                    {field: "fitem", displayName: "Item", width: 150},
                    {field: "cfdescription", displayName: "Description", width: 250},
                    //{field: "fuomdescription", displayName: "UOM Description", width: 200},
                    {field: "cfcategory", displayName: "Category", width: 120},
                    {field: "fbaseprice", displayName: "Base Price", width: 90, cellRenderer: this.CompanySvc.currencyRenderer},
                    {field: "fusablep", displayName: "Usable %", width: 80},
                    {field: "cfcost", displayName: "Cost", width: 80, cellRenderer: this.CompanySvc.currencyRenderer},
                    {field: "cfsaleprice", displayName: "Sales Price", width: 100, cellRenderer: this.CompanySvc.currencyRenderer},
                    {field: "funits", displayName: "# Units", width: 80},
                    {field: "ffreightcost", displayName: "Freight", width: 80, cellRenderer: this.CompanySvc.currencyRenderer},
                ]
            };
        }
    }
}

angular.module('app').service('itemlistSvc', app.itemlistSvc);