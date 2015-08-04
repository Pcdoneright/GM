///<reference path="../../typings/app.d.ts" />

module app {
    "use strict";

    export interface IDataEntrySrvc {
        codeTable:any[];
        initCodeTable(): ng.IPromise<any[]>;
        newDataStore(tableName:string, arrayId:string[], updateAble:boolean, arrayValidate:string[]): IDataStore;
        checkForChanges() : boolean;
        validate(): any;
        update(api:string): ng.IPromise<any>;
        getMaxValue(items:any[], field:string, pathToField?:string):number;
        getSumValue(items:any[], field:string, pathToField?:string):number;
        scrollToLastRow(pGrid, col:number, nofocus?: boolean): void;
        scrollToRow(pGrid: any, col: number, row: any, nofocus?: boolean): void;
        pendingChangesContinue(): ng.IPromise<any>;
    }

    export class DataEntrySvc implements IDataEntrySrvc{
        //counter:number = 0;
        codeTable:any[];
        updateStores:IDataStore[] = [];

        constructor(private $q, private $timeout, private $filter, private $mdDialog, private DataSvc, private toastr) {
            //this.counter++;
            //console.log("DataEntrySvc:" + this.counter);
        }

        // Populate Code Detail
        initCodeTable() {
            return this.DataSvc.serverDataGet('api/Company/Getcodedetail').then((dataResponse) => {
                this.codeTable = dataResponse; // Save for further reference
                return dataResponse;
            });
            //var deferred = this.$q.defer();
            //
            //this.DataSvc.serverDataGet('api/Company/Getcodedetail').then((dataResponse) => {
            //    this.codeTable = dataResponse; // Save for further reference
            //    deferred.resolve(this.codeTable);
            //});
            //
            //return deferred.promise;
        }

        // Create data stores
        newDataStore(tableName:string, arrayId:string[], updateAble:boolean, arrayValidate:string[]) {
            //var dstore = new this.DataStoreSvc.Instance(tableName, arrayId, arrayValidate); // Data Store Service
            var dstore = new DataStoreSvc(this.$q, this.$filter, this.DataSvc, this.$mdDialog, tableName, arrayId, arrayValidate); // Data Store Service
            if (updateAble) this.updateStores.push(dstore); // Add to updateable array
            return dstore;
        }

        // Check if changes are pending and prompt to continue
        pendingChangesContinue() {
            var deferred = this.$q.defer();

            if (this.checkForChanges()) {
                var confirm = this.$mdDialog.confirm()
                    .parent(angular.element(document.body))
                    .title('Lose Current Changes?')
                    .ariaLabel('Changes')
                    .ok('No')
                    .cancel('Yes');
                    //.targetEvent(event);
                this.$mdDialog.show(confirm).then(function() {
                    //console.log('no');
                }, function() {
                    //console.log('yes');
                    deferred.resolve(); // Lose changes
                });
            }
            else {
                deferred.resolve(); // No changes continue
            }

            return deferred.promise;
        }

        // Check for changes, returns true on the 1st occurrance of changes
        checkForChanges(){
            for (var i = 0; i < this.updateStores.length; i++) {
                if (this.updateStores[i].getChanges()) return true;
            }

            return false;
        }

        // Validate updateable store, returns table, field on first occurrance
        validate(): any {
            var field = null, row = null, store = null;

            for (var i = 0; i < this.updateStores.length; i++) {
                store = this.updateStores[i];
                if (store.getChanges()) {
                    // Loop each field to validate
                    if (!store.arrayValidate) break; // Exit if current store doesn't have validation
                    for (var f = 0; f < store.arrayValidate.length; f++) {
                        // _modified
                        for (var m = 0; m < store._modified.length; m++) {
                            row = store._modified[m];
                            field = row[store.arrayValidate[f]];
                            if (field === undefined || field === '' || field === null) {
                                return {table: store.tableName, field: store.arrayValidate[f]}
                            }
                        }
                        // _inserted
                        for (var m = 0; m < store._inserted.length; m++) {
                            row = store._inserted[m];
                            field = row[store.arrayValidate[f]];
                            if (field === undefined || field === '' || field === null) {
                                return {table: store.tableName, field: store.arrayValidate[f]}
                            }
                        }
                    }
                }
            }

            return '';
        }

        // Update Stores with Server
        update(api:string) {
            var deferred = this.$q.defer();
            var mData = []; // Server Data

            for (var i = 0; i < this.updateStores.length; i++) {
                if (this.updateStores[i].getChanges()) {
                    // Create Array
                    if (this.updateStores[i]._modified.length > 0) mData.push([this.updateStores[i].tableName + 'update', this.updateStores[i]._modified]);
                    if (this.updateStores[i]._inserted.length > 0) mData.push([this.updateStores[i].tableName + 'insert', this.updateStores[i]._inserted]);
                    if (this.updateStores[i]._deleted.length > 0) mData.push([this.updateStores[i].tableName + 'delete', this.updateStores[i]._deleted]);
                }
            }
            // Send Array
            if (mData.length > 0) {
                this.DataSvc.serverDataPost(api, mData).then((dataResponse) => {
                    if (dataResponse.success) {
                        // Commit Changes
                        for (var i = 0; i < this.updateStores.length; i++) {
                            this.updateStores[i].commit();
                        }
                        this.toastr.success('Save was succesful!');
                    }
                    else {
                        this.toastr.error('Error Saving: ' + dataResponse.errmsg);
                    }
                    deferred.resolve(dataResponse);
                });
            }
            else deferred.resolve(false); // No changes

            return deferred.promise;
        }

        // For ui-grid scroll to last row and focus on specific column
        scrollToLastRow(pGrid: any, col: number, nofocus?: boolean) {
            // Use timeout since ui-grid will only add the row after scope leaves
            this.$timeout(() => {
                var row = pGrid.gridApi.grid.rows.length;
                if (row == 0) return;

                var curRow = pGrid.gridApi.grid.rows[row - 1];

                if (nofocus) {
                    pGrid.gridApi.core.scrollTo(curRow.entity, pGrid.columnDefs[col]); // Only Scroll Grid
                    // Select Row & Assign to current prop.
                    pGrid.mCurrentRow = curRow; // Assign current row to this created property
                    pGrid.gridApi.selection.selectRow(curRow.entity);
                    //$scope.$evalAsync(); // used since sometimes its called outside of ng
                }
                else {
                    pGrid.gridApi.cellNav.scrollToFocus(curRow.entity, pGrid.columnDefs[col]);
                }
            }, 50);
        }

        // Scroll ui-grid to a row and column and select it unless 'nofucus = true'
        scrollToRow(pGrid: any, col: number, row: any, nofocus?: boolean) {
            // Use timeout since ui-grid will only add the row after scope leaves
            this.$timeout(() => {
                if (pGrid.gridApi.grid.rows.length == 0) return; // No rows return

                if (nofocus) {
                    pGrid.gridApi.core.scrollTo(row, pGrid.columnDefs[col]); // Only Scroll Grid
                    // Select Row & Assign to current prop.
                    pGrid.mCurrentRow = row; // Assign current row to this created property
                    pGrid.gridApi.selection.selectRow(row);
                }
                else {
                    pGrid.gridApi.cellNav.scrollToFocus(row, pGrid.columnDefs[col]);
                }
            }, 50);
        }

        // Get MaxValue of a property in an array optional pathToField
        getMaxValue(items:any[], field:string, pathToField?:string):number {
            var val = 0;
            items.forEach(function (row) {
                if (pathToField) {
                    if (row[pathToField][field] > val) val = row[pathToField][field];
                }
                else if (row[field] > val) val = row[field];
            });

            return val;
        }

        // Get Sum of a property in an array optional pathToField
        getSumValue(items:any[], field:string, pathToField?:string):number {
            var sum = 0, length = items.length;
            // Fast Loop
            for (var i = 0; i < length; i++) {
                if (pathToField)
                    sum += items[i][pathToField][field];
                else
                    sum += items[i][field];
            }

            return sum;
        }

        // Close open dialog
        mdDialogClose() {
            this.$mdDialog.hide();
        }

        // Close open dialog
        mdDialogCancel() {
            this.$mdDialog.cancel();
        }
    }

    // Inject and make function to register factory
    factory_DataEntrySvc.$inject = ['$q', '$timeout', '$filter', '$mdDialog', 'DataSvc', 'toastr'];
    function factory_DataEntrySvc($q, $timeout, $filter, $mdDialog, DataSvc, toastr) {
        function Instance() {
            return new DataEntrySvc($q, $timeout, $filter, $mdDialog, DataSvc, toastr);
        }

        return {
            Instance: Instance
        }
    }
    // Register Factory
    angular.module('app').factory('DataEntrySvc', factory_DataEntrySvc);

//--------------------------------------------
// DataStores
//--------------------------------------------
//angular.module('app').factory('DataStoreSvc', ['$q', '$filter', 'DataSvc', '$mdDialog', function ($q, $filter, DataSvc, $mdDialog) {

    export interface IDataStore {
        tableName:string;
        items: any[]; // Current rows
        _orgData: any[];
        _modified: any[];
        _inserted: any[];
        _deleted: any[];
        //tableName: string;
        loadData(data: any[]): void;
        addRow(data: {}): number;
        removeRow(ev, data: {}, noprompt?:boolean): ng.IPromise<void>;
        _removeRow(item: {}): void;
        getChanges(): boolean;
        commit(): void;
    }

    export class DataStoreSvc implements IDataStore{
        tableName:string;
        //counter:number = 0;
        items = []; // Current rows
        _orgData = []; // Original rows
        _deleted = []; // Deleted rows
        _modified = []; // Modified rows
        _inserted = []; // New rows

        // Create ds
        constructor(public $q, public $filter, public DataSvc, public $mdDialog, tableName: string, public arrayId, public arrayValidate) {
            this.tableName = tableName;
            //this.counter++;
            //console.log("DataStoreSvc:" + this.counter);
        }

        // Sets Data and Reset property arrays
        loadData(data: any[]) {
            this.items = data;
            this._orgData = angular.copy(data);
            this._deleted = [];
            this._modified = [];
            this._inserted = [];
        }

        // Add Row
        addRow(data) {
            return this.items.push(data); // Append to end
        }

        // Remove row, will prompt to confirm, returns a promise
        removeRow(ev, data, noprompt) {
            //var deferred = this.$q.defer();

            if (noprompt) {
                this._removeRow(data); // Remove from Grid
                return;
            }

            // Ask to remove row
            // Appending dialog to document.body to cover sidenav in docs app
            var confirm = this.$mdDialog.confirm()
                .parent(angular.element(document.body))
                .title('Remove Current Row?')
                .ok('Yes')
                .cancel('No')
                .targetEvent(ev);

            return this.$mdDialog.show(confirm).then(() => {
                return this._removeRow(data); // Remove from Grid
            });

            //this.$mdDialog.show(confirm).then(() => {
            //    this._removeRow(data); // Remove from Grid
            //    deferred.resolve();
            //});
            //
            //return deferred.promise;
        }

        // Must be called when an item is removed
        _removeRow(item) {
            var keys = this.createKeyProperty(item); // Use for finding row by its keys
            var results = this.$filter('filter')(this._orgData, keys, true);
            // if Found in orgData add it to _deleted rows
            if (results.length > 0) {
                results = this.$filter('filter')(this._deleted, keys, true); // Find it again in the _deleted rows in case same key was created and removed
                if (results.length === 0) this._deleted.push(angular.copy(item));
            }

            // Now remove it from items
            results = this.$filter('filter')(this.items, keys, true);
            if (results.length > 0) this.items.splice(this.items.indexOf(results[0]), 1);
        }

        // Populate _arrays with changes
        getChanges() {
            this._modified = [];
            this._inserted = [];
            var keys = {};
            var items = [];

            // For each item
            for (var i = 0; i < this.items.length; i++) {
                keys = this.createKeyProperty(this.items[i]); // Use for finding row by its keys
                items = this.$filter('filter')(this._orgData, keys, true);
                if (items.length > 0) {
                    if (!this.compareOrg(items[0], this.items[i])) this._modified.push(angular.copy(this.items[i])); // Add row to modified it it changed
                }
                else
                    this._inserted.push(angular.copy(this.items[i])); // Add to inserted if not found on original
            }

            return (this._modified.length + this._inserted.length + this._deleted.length > 0);
        }

        // Commit Changes
        commit(): void {
            // Check if changes were made
            if (this._deleted.length + this._inserted.length + this._modified.length > 0) {
                // Clear pending
                this._deleted = [];
                this._inserted = [];
                this._modified = [];
                this._orgData = angular.copy(this.items); // Make original = current
            }
        }

        createKeyProperty(item) {
            var mProperty = {};

            // For each index field
            for (var f = 0; f < this.arrayId.length; f++) {
                mProperty[this.arrayId[f]] = item[this.arrayId[f]];
            }

            return mProperty;
        }

        // Compare each field from original since new may have new 'properties' added
        compareOrg(orgData, newData) {
            var found;

            for (var key in orgData) {
                if (orgData[key] instanceof Date)
                    found = (orgData[key].toString() === newData[key].toString());
                else
                    found = (orgData[key] === newData[key]);

                if (!found) break; // exit as soon as something is different
            }

            return found;
        }
    }
}

//// Inject and make function to register factory
//factory_DataStoreSvc.$inject = ['$q', '$filter', 'DataSvc', '$mdDialog'];
//function factory_DataStoreSvc($q, $filter, DataSvc, $mdDialog) {
//    function Instance() {
//        return new DataStoreSvc($q, $filter, DataSvc, $mdDialog);
//    }
//    return {
//        Instance: Instance
//    }
//}
//// Register Factory
//angular.module('app').factory('DataStoreSvc', factory_DataStoreSvc);


//(function () {
//    "use strict";

    //angular.module('app').factory('DataEntrySvc', ['$q', '$timeout', '$filter', '$mdDialog', 'DataSvc', 'DataStoreSvc', 'toastr', function ($q, $timeout, $filter, $mdDialog, DataSvc, DataStoreSvc, toastr) {
    //    //console.log("DataEntrySvc");
    //
    //    // Define object here to create new instances for each controller
    //    function Instance() {
    //        var me = this;
    //        me.codeTable = [];
    //        me.updateStores = [];
    //
    //        // Populate Code Detail
    //        this.initCodeTable = function () {
    //            var deferred = $q.defer();
    //
    //            DataSvc.serverDataGet('api/Company/Getcodedetail').then(function (dataResponse) {
    //                me.codeTable = dataResponse; // Save for further reference
    //                deferred.resolve(me.codeTable);
    //            });
    //
    //            return deferred.promise;
    //        };
    //
    //        // Create data stores
    //        this.dataStore = function (tableName: string, arrayId: string[], updateAble: boolean, arrayValidate: string[]) {
    //            var dstore = new DataStoreSvc.Instance(tableName, arrayId, arrayValidate); // Data Store Service
    //            if (updateAble) me.updateStores.push(dstore); // Add to updateable array
    //            return dstore;
    //        };
    //
    //        // Check for changes, returns true on the 1st occurrance of changes
    //        this.checkForChanges = function () {
    //            for (var i = 0; i < me.updateStores.length; i++) {
    //                if (me.updateStores[i].getChanges()) return true;
    //            }
    //
    //            return false;
    //        };
    //
    //        // Validate updateable store, returns table, field on first occurrance
    //        this.validate = function () {
    //            var field = null, row = null, store = null;
    //
    //            for (var i = 0; i < me.updateStores.length; i++) {
    //                store = me.updateStores[i];
    //                if (store.getChanges()) {
    //                    // Loop each field to validate
    //                    if (!store.arrayValidate) break; // Exit if current store doesn't have validation
    //                    for (var f = 0; f < store.arrayValidate.length; f++) {
    //                        // _modified
    //                        for (var m = 0; m < store._modified.length; m++) {
    //                            row = store._modified[m];
    //                            field = row[store.arrayValidate[f]];
    //                            if (field === undefined || field === '' || field === null) {
    //                                return {table: store.tableName, field: store.arrayValidate[f]}
    //                            }
    //                        }
    //                        // _inserted
    //                        for (var m = 0; m < store._inserted.length; m++) {
    //                            row = store._inserted[m];
    //                            field = row[store.arrayValidate[f]];
    //                            if (field === undefined || field === '' || field === null) {
    //                                return {table: store.tableName, field: store.arrayValidate[f]}
    //                            }
    //                        }
    //                    }
    //                }
    //            }
    //
    //            return {};
    //        };
    //
    //
    //        // Update Stores with Server
    //        this.update = function (api) {
    //            var deferred = $q.defer();
    //            var mData = []; // Server Data
    //
    //            for (var i = 0; i < me.updateStores.length; i++) {
    //                if (me.updateStores[i].getChanges()) {
    //                    // Create Array
    //                    if (me.updateStores[i]._modified.length > 0) mData.push([me.updateStores[i].tableName + 'update', me.updateStores[i]._modified]);
    //                    if (me.updateStores[i]._inserted.length > 0) mData.push([me.updateStores[i].tableName + 'insert', me.updateStores[i]._inserted]);
    //                    if (me.updateStores[i]._deleted.length > 0) mData.push([me.updateStores[i].tableName + 'delete', me.updateStores[i]._deleted]);
    //                }
    //            }
    //            // Send Array
    //            if (mData.length > 0) {
    //                // Synch JSON will use format 'Date.prototype.toJSON' found in 'extend.js'
    //                //DataSvc.serverDataPost(api, JSON.stringify(mData)).then(function (dataResponse) {
    //                DataSvc.serverDataPost(api, mData).then(function (dataResponse) {
    //                    if (dataResponse.success) {
    //                        // Commit Changes
    //                        for (var i = 0; i < me.updateStores.length; i++) {
    //                            me.updateStores[i].commit();
    //                        }
    //                        toastr.success('Save was succesful!');
    //                    }
    //                    deferred.resolve(dataResponse);
    //                });
    //            }
    //            else deferred.resolve(false); // No changes
    //
    //            return deferred.promise;
    //        };
    //
    //        // For Angular-Grid
    //        this.currencyRenderer = function (params) {
    //            //if (params.value===null || params.value===undefined) {
    //            //    return null;
    //            //} else if (isNaN(params.value)) {
    //            //    return 'NaN';
    //            //} else {
    //            //    return $filter('currency')(params.value);
    //            //}
    //            return $filter('currency')(params.value);
    //        };
    //
    //        // For Angular-Grid
    //        this.dateRenderer = function (params) {
    //            if (params.value === null || params.value === undefined) return null;
    //
    //            return $filter('date')(params.value, 'MM/dd/yyyy');
    //        };
    //
    //        // For Angular-Grid
    //        this.phoneRenderer = function (params) {
    //            if (params.value === null || params.value === undefined) return null;
    //            return params.value.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
    //        };
    //
    //        // For ui-grid scroll to last row and focus on specific column
    //        this.scrollToLastRow = function (pGrid, col) {
    //            $timeout(function () {
    //                var row = pGrid.gridApi.grid.rows.length - 1;
    //                pGrid.gridApi.cellNav.scrollToFocus(pGrid.gridApi.grid.rows[row].entity, pGrid.columnDefs[col]);
    //            }, 500);
    //        };
    //
    //        // Get MaxValue of a property in an array optional pathToField
    //        this.getMaxValue = function (items, field, pathToField) {
    //            var val = 0;
    //            items.forEach(function (row) {
    //                if (pathToField) {
    //                    if (row[pathToField][field] > val) val = row[pathToField][field];
    //                }
    //                else if (row[field] > val) val = row[field];
    //            });
    //
    //            return val;
    //        };
    //
    //        // Get Sum of a property in an array optional pathToField
    //        this.getSumValue = function (items, field, pathToField) {
    //            var sum = 0, i = 0, length = items.length;
    //            // Fast Loop
    //            for (i = 0; i < length; i++) {
    //                if (pathToField)
    //                    sum += items[i][pathToField][field];
    //                else
    //                    sum += items[i][field];
    //            }
    //
    //            return sum;
    //        };
    //
    //        // Close open dialog
    //        this.mdDialogClose = function () {
    //            $mdDialog.hide();
    //        };
    //
    //        // Close open dialog
    //        this.mdDialogCancel = function () {
    //            $mdDialog.cancel();
    //        };
    //    }
    //
    //    return {
    //        Instance: Instance
    //    }
    //}]);

    ////--------------------------------------------
    //// DataStores
    ////--------------------------------------------
    //angular.module('app').factory('DataStoreSvc', ['$q', '$filter', 'DataSvc', '$mdDialog', function ($q, $filter, DataSvc, $mdDialog) {
    //    //console.log("DataStoreSvc");
    //
    //    // Create ds
    //    function Instance(tableName, arrayId, arrayValidate) {
    //        var me = this;
    //        me.tableName = tableName; // Save Table name to create json for update
    //        me.arrayId = arrayId; // How to identify unique rows
    //        me.arrayValidate = arrayValidate; // Array with fields that must have a value
    //        me.items = []; // Current rows
    //        me._orgData = []; // Original rows
    //        me._deleted = []; // Deleted rows
    //        me._modified = []; // Modified rows
    //        me._inserted = []; // New rows
    //
    //        // Sets Data and Reset property arrays
    //        this.loadData = function (data) {
    //            me.items = data;
    //            me._orgData = angular.copy(data);
    //            me._deleted = [];
    //            me._modified = [];
    //            me._inserted = [];
    //        };
    //
    //        // Add Row
    //        this.addRow = function (data) {
    //            return me.items.push(data); // Append to end
    //        };
    //
    //        // Remove row, will prompt to confirm, returns a promise
    //        this.removeRow = function (ev, data) {
    //            var deferred = $q.defer();
    //
    //            // Ask to remove row
    //            // Appending dialog to document.body to cover sidenav in docs app
    //            var confirm = $mdDialog.confirm()
    //                .parent(angular.element(document.body))
    //                .title('Remove Current Row?')
    //                //.content('All of the banks have agreed to forgive you your debts.')
    //                //.ariaLabel('Lucky day')
    //                .ok('Yes')
    //                .cancel('No')
    //                .targetEvent(ev);
    //
    //            $mdDialog.show(confirm).then(function () {
    //                //console.log('You decided to get rid of your debt.');
    //                me._removeRow(data); // Remove from Grid
    //                deferred.resolve();
    //            });
    //
    //            return deferred.promise;
    //        };
    //
    //        // Must be called when an item is removed
    //        this._removeRow = function (item) {
    //            var keys = createKeyProperty(item); // Use for finding row by its keys
    //            var results = $filter('filter')(me._orgData, keys);
    //            // if Found in orgData add it to _deleted rows
    //            if (results.length > 0) {
    //                results = $filter('filter')(me._deleted, keys); // Find it again in the _deleted rows in case same key was created and removed
    //                if (results.length === 0) me._deleted.push(angular.copy(item));
    //            }
    //
    //            // Now remove it from items
    //            results = $filter('filter')(me.items, keys);
    //            if (results.length > 0) me.items.splice(me.items.indexOf(results[0]), 1);
    //        };
    //        //this._removeRow = function(item) {
    //        //    var f, o, found = false;
    //        //
    //        //    // For each orgData
    //        //    for (o = 0; o < me._orgData.length; o++) {
    //        //        // For each arrayId-loop
    //        //        for (f = 0; f < me.arrayId.length; f++) {
    //        //            found = (item[me.arrayId[f]] === me._orgData[o][me.arrayId[f]]);
    //        //            if (!found) break; // if not found break away from arrayId-loop
    //        //        }
    //        //
    //        //        // if row was found no need to look for more.
    //        //        if (found) {
    //        //            me._deleted.push(angular.copy(item)); // add it to _deleted
    //        //            break;
    //        //        }
    //        //    }
    //        //
    //        //    // Now remove it from items
    //        //    for (o = 0; o < me.items.length; o++) {
    //        //        // For each arrayId-loop
    //        //        for (f = 0; f < me.arrayId.length; f++) {
    //        //            found = (item[me.arrayId[f]] === me.items[o][me.arrayId[f]]);
    //        //            if (!found) break; // if not found break away from arrayId-loop
    //        //        }
    //        //        // if row was found no need to look for more.
    //        //        if (found) {
    //        //            me.items.splice(o, 1); // remove it from items
    //        //            break;
    //        //        }
    //        //    }
    //        //
    //        //};
    //
    //        // Populate _arrays with changes
    //        this.getChanges = function () {
    //            me._modified = [];
    //            me._inserted = [];
    //            var keys = {};
    //            var items = [];
    //
    //            // For each item
    //            for (var i = 0; i < me.items.length; i++) {
    //                keys = createKeyProperty(me.items[i]); // Use for finding row by its keys
    //                items = $filter('filter')(me._orgData, keys);
    //                if (items.length > 0) {
    //                    if (!compareOrg(items[0], me.items[i])) me._modified.push(angular.copy(me.items[i])); // Add row to modified it it changed
    //                }
    //                else
    //                    me._inserted.push(angular.copy(me.items[i])); // Add to inserted if not found on original
    //            }
    //
    //            return (me._modified.length + me._inserted.length + me._deleted.length > 0)
    //        };
    //        //this.getChanges = function () {
    //        //    var i, o, f, found;
    //        //    me._modified = [];
    //        //    me._inserted = [];
    //        //
    //        //    // For each item
    //        //    for (i = 0; i < me.items.length; i++) {
    //        //        // For each orgData
    //        //        for (o = 0; o < me._orgData.length; o++) {
    //        //            // For each index field
    //        //            for (f = 0; f < me.arrayId.length; f++) {
    //        //                found = (me.items[i][me.arrayId[f]] === me._orgData[o][me.arrayId[f]]);
    //        //                if (!found) break; // if not found break away from arrayId-loop
    //        //            }
    //        //            if (!found) break; // if not found break away from orgData-loop
    //        //            // Compare items, if equal break away from items-loop
    //        //            //if (JSON.stringify(me.items[i]) === JSON.stringify(me._orgData[o])) break;
    //        //            if (compareOrg(me._orgData[o], me.items[i])) break;
    //        //            // Not same insert me.items in _modified
    //        //            me._modified.push(me.items[i]);
    //        //        }
    //        //        // Not found insert me.items in _inserted
    //        //        if (!found) me._inserted.push(me.items[i]);
    //        //    }
    //        //};
    //
    //        // Commit Changes
    //        this.commit = function () {
    //            // Check if changes were made
    //            if (me._deleted.length + me._inserted.length + me._modified.length > 0) {
    //                // Clear pending
    //                me._deleted = [];
    //                me._inserted = [];
    //                me._modified = [];
    //                me._orgData = angular.copy(me.items); // Make original = current
    //            }
    //        };
    //
    //        function createKeyProperty(item) {
    //            var mProperty = {};
    //
    //            // For each index field
    //            for (var f = 0; f < me.arrayId.length; f++) {
    //                mProperty[me.arrayId[f]] = item[me.arrayId[f]];
    //            }
    //
    //            return mProperty;
    //        }
    //
    //        // Compare each field from original since new may have new 'properties' added
    //        function compareOrg(orgData, newData) {
    //            var found;
    //
    //            for (var key in orgData) {
    //                if (orgData[key] instanceof Date)
    //                    found = (orgData[key].toString() === newData[key].toString());
    //                else
    //                    found = (orgData[key] === newData[key]);
    //
    //                if (!found) break; // exit as soon as something is different
    //            }
    //
    //            return found;
    //        };
    //    }
    //
    //    return {
    //        Instance: Instance
    //    }
    //}]);
//})();