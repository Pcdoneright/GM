///<reference path="../../typings/app.d.ts" />
///<reference path="../../app/services/DataEntrySvc.ts" />

class companymaint {
    dESrvc: app.IDataEntrySrvc;
    companies: app.IDataStore;

    static $inject = ['$scope', '$filter', '$timeout', '$window', '$mdDialog', 'DataSvc', 'CompanySvc', 'toastr', 'DataEntrySvc'];
    constructor(private $scope, private $filter:ng.IFilterService, private $timeout:ng.ITimeoutService, private $window:ng.IWindowService, private $mdDialog, private DataSvc, private CompanySvc, private toastr:toastr.IToastrService, private DataEntrySvc) {
        // New Data Entry Service Instance
        this.dESrvc = DataEntrySvc.Instance();

        // Data Stores, Unique Keys, updatable, validate fields
        this.companies = this.dESrvc.newDataStore('companies', ['fcmpid'], true, ['fname', 'faddress1', 'freportserver', 'fphone']);

        // Get salespersons for DropDown
        DataSvc.serverDataGet('api/CompanyMaint/GetCompany').then((dataResponse) => {
            this.companies.loadData(dataResponse);
        });
    }

    // Valid Entry
    validEntry():boolean {
        return (this.companies.items.length === 1);
    }

    update() {
        if (!this.validEntry()) return;
        if (!this.dESrvc.checkForChanges()) return;

        var msg = this.dESrvc.validate();
        if (msg !== '') {
            this.showValidateMsg(msg);
            return;
        }

        this.CompanySvc.ofSetHourGlass(true);

        // Last Update
        this.companies.items[0].ts = new Date();
        this.companies.items[0].fby = this.CompanySvc.userInfo.fname;

        // Send to Server
        this.dESrvc.update('api/CompanyMaint/Postupdate').then((dataResponse) => {
            this.CompanySvc.ofSetHourGlass(false);
        });
    }

    // Parse Error Msg
    showValidateMsg(msg) {
        var fieldmsg = '', tablemsg = '';

        switch (msg.table) {
            case 'companies':
                tablemsg = 'PROPERTIES';
                switch (msg.field) {
                    case 'fname':
                        fieldmsg = "NAME";
                        break;
                    case 'faddress1':
                        fieldmsg = "ADDRESS1";
                        break;
                    case 'freportserver':
                        fieldmsg = "REPORT SERVER";
                        break;
                    case 'fphone':
                        fieldmsg = "PHONE";
                        break;
                }
                break;
        }

        this.toastr.error(fieldmsg + ' value missing in ' + tablemsg);
    }

}

// Must be done after class is declared for it to work
angular.module('app').controller('companymaint', companymaint);
