///<reference path="../../typings/app.d.ts" />
///<reference path="../../app/services/DataEntrySvc.ts" />

module app {
    "use strict";

    export class soentrybase {
        orderOrigin:string;
        searchId:string;
        retrieving:boolean = true;
        voidFlag:boolean = false;
        invoiceFlag:boolean = false;

        dESrvc:app.IDataEntrySrvc;
        salesorders:app.IDataStore;
        salesdetails:app.IDataStore;

        customerlocations:any[];
        priceclasses:any[];
        taxrate:number;

        // Must be done for minified to work
        //static $inject = ['$q', '$scope', '$filter', '$timeout', '$window', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'uiGridConstants', 'itemlistSvc', 'DataEntrySvc'];
        constructor(private $q:ng.IQService, private $scope:ng.IScope, private $filter:ng.IFilterService, private $timeout:ng.ITimeoutService, private $window:ng.IWindowService, private $mdDialog, private DataSvc, private CompanySvc, private toastr:toastr.IToastrService, private DataEntrySvc, private companyRules) {
            // New Data Entry Service Instance
            this.dESrvc = DataEntrySvc.Instance();

            // Data Stores, Unique Keys, updatable, validate fields
            this.salesorders = this.dESrvc.newDataStore('salesorders', ['fsoid'], true, ['fspid', 'fterms', 'fshiptoid']);
            this.salesdetails = this.dESrvc.newDataStore('salesdetails', ['fsoid', 'fsodid'], true, ['fitem', 'fdescription']);
        }

        // Valid Entry
        validEntry():boolean {
            if (this.salesorders.items.length !== 1) return false;
            return (this.salesorders.items[0].fsoid > 0);
        }

        // Calculate totals for salesorders
        salesordersTotals() {
            var sorow = this.salesorders.items[0];
            sorow.ftaxabletotal = 0;
            sorow.fnontaxabletotal = 0;
            sorow.fdiscount = 0;
            sorow.fchange = 0;
            sorow.ftotalpayment = 0;

            // Loop details
            var len = this.salesdetails.items.length;
            for (var i = 0; i < len; i++) {
                if (this.salesdetails.items[i].fistaxable)
                    sorow.ftaxabletotal += this.salesdetails.items[i].cextended;
                else
                    sorow.fnontaxabletotal += this.salesdetails.items[i].cextended;
            }
            sorow.fnontaxabletotal = r2d(sorow.fnontaxabletotal);

            var trate = this.taxrate / 100; // Get proper decimal
            sorow.ftax = r2d(sorow.ftaxabletotal * trate);
            sorow.ftotal = r2d(sorow.ftaxabletotal + sorow.ftax + sorow.fnontaxabletotal);

            // Computed
            sorow.cfsubtotal = sorow.ftaxabletotal + sorow.fnontaxabletotal;

            // if discount rate is specified, discount is % of ftotal
            if (sorow.fdiscountp > 0) {
                var drate = sorow.fdiscountp / 100;
                sorow.fdiscount = r2d(sorow.ftotal * drate);
                sorow.ftotal = r2d(sorow.ftotal - sorow.fdiscount);
            }

            // Calculate change and re-assign ftotalpayment
            if (sorow.ftotalpayment > sorow.ftotal) {
                sorow.fchange = r2d(sorow.ftotalpayment - sorow.ftotal);
                sorow.ftotalpayment = sorow.ftotal;
            }

            sorow.fbalance = r2d(sorow.ftotal - sorow.ftotalpayment);
        }

        // Retrieve specific po
        searchSONumber() {
            if (!this.searchId) return;
            this.searchId = this.searchId.replace(/[^0-9\.-]/g, '');
            if (this.searchId === '') return; //Remove non-numeric, period or minus char

            this.CompanySvc.ofSetHourGlass(true);
            this.DataSvc.serverDataGet('api/SO/GetValidateSonumber', {pfsonumber: this.searchId}).then((dataResponse)=> {
                if (dataResponse.length > 0) {
                    this.retrieveSO(dataResponse[0].fsoid);
                    this.searchId = '';
                }
                else
                    this.toastr.info('S.O. Number Not Found');

                this.CompanySvc.ofSetHourGlass(false);
            });
        }

        // Get PO for EDIT
        retrieveSO(afsoid:number):void {
            if (!afsoid) return;
            this.retrieving = true; // Global flag set on

            this.CompanySvc.ofSetHourGlass(true);
            this.DataSvc.serverDataGet('api/SO/GetSO', {pfsoid: afsoid}).then((dataResponse) => {
                this.salesorders.loadData(dataResponse.salesorders);
                this.salesdetails.loadData(dataResponse.salesdetails);

                // Get Contacts
                this.getCustomerRelated(this.salesorders.items[0].fcid);
                // Calculate Computed Columns
                this.salesdetailsComputedAll();

                this.postRetrieveSO();

                this.$timeout(() => { this.retrieving = false }, 300); // Global flag set off
                this.CompanySvc.ofSetHourGlass(false);
            });
        }

        // After retrieve action must override
        postRetrieveSO() {
        }

        // Create SO for particular customer
        createSO(pCustomer) {
            if (!pCustomer) return;

            this.CompanySvc.ofSetHourGlass(true);
            this.retrieving = true; // Global flag set on
            this.salesorders.loadData([]);
            this.salesdetails.loadData([]);

            this.DataSvc.serverDataGet('api/Company/Getnextsequence', {seq: 'salesorder'}).then((dataResponse) => {
                var dt = new Date();
                dt.setHours(12, 0, 0);// Remove time

                this.salesorders.addRow({
                    fsoid: dataResponse.data,
                    fcid: pCustomer.fcid,
                    cfcid: pCustomer.fname,
                    fstatus: 'O', // Open
                    forigin: this.orderOrigin,
                    fspid: pCustomer.fspid, // salesperson
                    fshipmethod: pCustomer.fshipmethod,
                    fterms: pCustomer.fterms,
                    cfpcid: pCustomer.fpcid, // Price Class
                    cfdescription: pCustomer.cfpcid, // Price Class Descr.
                    fistaxexcempt: pCustomer.fistaxexcempt,
                    fdate: dt,
                    fdocnumber: -1,
                    ftaxabletotal: 0,
                    fnontaxabletotal: 0,
                    ftax: 0,
                    fdiscount: 0,
                    fdiscountp: 0,
                    ftotal: 0,
                    ftotalpayment: 0,
                    fbalance: 0,
                    fchange: 0,
                    fcommission: 0,
                    cfsubtotal: 0
                });

                // Get Contacts, billto, shipto and assign its first row
                this.getCustomerRelated(pCustomer.fcid).then(() => {
                    // Select 1st instance of locations
                    if (this.customerlocations.length > 0)
                        this.salesorders.items[0].fshiptoid = this.customerlocations[0].flocid;
                });

                this.postCreateSO(); // Call Post

                this.$timeout(() => {this.retrieving = false}, 300); // Global flag set off
                this.CompanySvc.ofSetHourGlass(false);
            });
        }

        // After create action must override
        postCreateSO() {
        }

        // Save the SO
        update() {
            if (!this.validEntry()) return;
            if (!this.dESrvc.checkForChanges()) return;
            if (this.salesorders.items[0].fstatus !== 'O') {
                this.toastr.info('Only OPEN orders can be modified.');
                return;
            }

            var msg = this.dESrvc.validate();
            if (msg !== '') {
                this.showValidateMsg(msg);
                return;
            }

            // Balance must be zero for POS
            if (this.orderOrigin === 'POS' && this.salesorders.items[0].fbalance !== 0) {
                this.toastr.error('Balance amount must be Zero');
                return;
            }

            this.CompanySvc.ofSetHourGlass(true);

            // Void order if requested
            if (this.voidFlag) {
                this.voidFlag = false;
                this.salesorders.items[0].fstatus = 'V';
            }

            // Complete order if requested
            if (this.invoiceFlag) {
                this.invoiceFlag = false;
                this.salesorders.items[0].fstatus = 'I';
                // Set date if not set
                if (!this.salesorders.items[0].finvoice_date) {
                    this.salesorders.items[0].finvoice_date = new Date();
                    this.salesorders.items[0].finvoice_date.setHours(12, 0, 0);// Remove time
                }
            }

            // Last Update
            this.salesorders.items[0].ts = new Date();
            this.salesorders.items[0].fby = this.CompanySvc.userInfo.fname;

            // Send to Server
            this.dESrvc.update('api/SO/Postupdate').then((dataResponse) => {
                if (dataResponse.success) {
                    // Assign fdocnumber from server
                    if (this.salesorders.items[0].fdocnumber === -1) {
                        if (dataResponse.fdocnumber) {
                            // Assign to current & original flag as no changes
                            this.salesorders.items[0].fdocnumber = dataResponse.fdocnumber;
                            this.salesorders._orgData[0].fdocnumber = dataResponse.fdocnumber;
                        }
                    }
                    this.postUpdate();
                }
                else {
                    // Reverse status
                    this.salesorders.items[0].fstatus = 'O';
                }
                this.CompanySvc.ofSetHourGlass(false);
            });
        }

        // Override if necessary
        postUpdate() {
        }

        // Invoice open order
        complete(event, prompt?:boolean) {
            this.invoiceFlag = false;
            if (!this.validEntry()) return;
            if (this.salesorders.items[0].fstatus !== 'S') {
                this.toastr.info('Only OPEN orders can be Invoiced.');
                return;
            }

            // Check if prompt is requested
            if (prompt) {
                var confirm = this.$mdDialog.confirm()
                    .parent(angular.element(document.body))
                    .title('Invoice and Finalize this Sales Order?')
                    .ok('Yes')
                    .cancel('No')
                    .targetEvent(event);

                this.$mdDialog.show(confirm).then(() => {
                    this.invoiceFlag = true; // Set flag
                    this.salesorders.items[0].ts = new Date(); // Force update if nothing was changed
                    this.update();
                });
            }
            else {
                this.invoiceFlag = true; // Set flag
                this.salesorders.items[0].ts = new Date(); // Force update if nothing was changed
                this.update();
            }
        }

        // Void open order
        voidSO(event) {
            this.voidFlag = false;
            if (!this.validEntry()) return;
            if (this.salesorders.items[0].fdocnumber === -1) return; // Only existing orders

            if (this.salesorders.items[0].fstatus !== 'O') {
                this.toastr.info('Only OPEN orders can be void.');
                return;
            }

            var confirm = this.$mdDialog.confirm()
                .parent(angular.element(document.body))
                .title('Void this Sales Order?')
                .ok('Yes')
                .cancel('No')
                .targetEvent(event);

            this.$mdDialog.show(confirm).then(() => {
                this.voidFlag = true; // Set flag
                this.salesorders.items[0].ts = new Date(); // Force update if nothing was changed
                this.update();
            });
        }

        // Parse Error Msg
        showValidateMsg(msg) {
            var fieldmsg = '', tablemsg = '';

            switch (msg.table) {
                case 'salesorders':
                    tablemsg = 'PROPERTIES';
                    switch (msg.field) {
                        case 'fspid':
                            fieldmsg = "SALES PERSON";
                            break;
                        case 'fterms':
                            fieldmsg = "TERMS";
                            break;
                        case 'fshiptoid':
                            fieldmsg = "SHIP TO";
                            break;
                    }
                    break;
                case 'salesdetails':
                    tablemsg = 'DETAILS';
                    switch (msg.field) {
                        case 'fdescription':
                            fieldmsg = 'DESCRIPTION';
                            break;
                        case 'fitem':
                            fieldmsg = 'ITEM';
                            break;
                    }
                    break;
            }

            this.toastr.error(fieldmsg + ' value missing in ' + tablemsg);
        }

        // Check if item is valid and add it
        salesdetailsAddItemByFitem(pfitem) {
            return this.DataSvc.serverDataGet('api/ItemMaint/GetValidateItemWithPrice', {pfitem: pfitem, pfcid: this.salesorders.items[0].fcid}).then((dataResponse) => {
                if (dataResponse.length == 0) {
                    this.toastr.warning('Item not found!');
                    return false;
                }
                return this.salesdetailsAddItem(dataResponse[0], true);
            });
        }

        // Add a record to salesdetails
        salesdetailsAddItem(pitem, calcTotal: boolean) {
            // Increment Qty if item found
            var row = this.$filter('filter')(this.salesdetails.items, {fitem: pitem.fitem}, true)[0];
            if (row) {
                row.fqty += parseInt(pitem.cqty || 1); // if pitem.cqty doesn't exist increment by 1
            }
            else {
                var rowIndex = this.salesdetails.addRow({
                    fsoid: this.salesorders.items[0].fsoid,
                    fsodid: this.dESrvc.getMaxValue(this.salesdetails.items, 'fsodid') + 1,
                    fcid: this.salesorders.items[0].fcid,
                    fitem: pitem.fitem,
                    fdescription: pitem.fdescription + ' ' + pitem.fuomdescription + ' ' + pitem.fcountryorg,
                    fqty: parseInt(pitem.cqty || 1), // if pitem.cqty doesn't exist use 1
                    fshipqty: 0,
                    fistaxable: (this.salesorders.items[0].fistaxexcempt) ? false : pitem.fistaxable,
                    fprice: pitem.fprice,
                    // For price calc.
                    flockclassprice: pitem.flockclassprice,
                    fbaseprice: pitem.fbaseprice,
                    ffreightcost: pitem.ffreightcost,
                    funits: pitem.funits,
                    fusablep: pitem.fusablep,
                    fcostplus: pitem.fcostplus,
                    flockprice: pitem.flockprice
                });
                row = this.salesdetails.items[rowIndex - 1];
            }

            this.salesdetailsComputed(row, row.fprice, row.fqty);
            if (calcTotal) this.salesordersTotals();

            return row;
        }

        // Get customer contacts, shipto, billto
        getCustomerRelated(fcid:string) {
            // Get for DropDown
            return this.DataSvc.serverDataGet('api/CustomerMaint/GetCustomerRelatedDD', {pfcid: fcid}).then((dataResponse) => {
                this.customerlocations = dataResponse.customerlocations;
                this.taxrate = dataResponse.taxrate;

                return dataResponse;
            });
        }

        // Calculate salesdetails computed fields for all rows
        salesdetailsComputedAll() {
            this.salesdetails.items.forEach((item) => {
                this.salesdetailsComputed(item, item.fprice, item.fqty);
            });
        }

        // Calculate salesdetails computed fields 1 row
        salesdetailsComputed(row, fprice:number, fqty:number) {
            row.cextended = r2d(fprice * fqty);
        }

    }

}