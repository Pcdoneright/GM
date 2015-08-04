///<reference path="../../typings/app.d.ts" />

module app {
    "use strict";

    export class companyRules {
        static $inject = ['$filter'];
        constructor(private $filter:ng.IFilterService) {}

        // Calculate Selling Price to the next nickel
        calcSellPrice(priceclass: any[], IUflockclassprice:number,  fpcid:number, IMfbaseprice: number, IMffreightcost: number, IUfunits: number, IUfusablep: number, IUfcostplus: number, CIflockprice: number) {
            var pcR;
            // PriceClass To Use:
            // IU-flockclassprice Has Priority
            // CI-fpcid Has Next Priority
            // C-fpcid Has Next Priority
            if (IUflockclassprice) {
                pcR = this.$filter('filter')(priceclass, {fpcid: IUflockclassprice}, true)[0];
            }
            else {
                pcR = this.$filter('filter')(priceclass, {fpcid: fpcid}, true)[0];
            }

            if (CIflockprice > 0 && (!IUflockclassprice)) return CIflockprice; // CI-Lock-Price Has Priority when IUflockclassprice does not exist

            var mUnitCost = this.getUnitCost(IMfbaseprice, IMffreightcost, IUfunits, IUfusablep);
            if (pcR.fusecostplus) return mUnitCost + IUfcostplus; // PC-fusecostplus Has next Priority
            return Math.ceil(mUnitCost / ((100 - pcR.fpercentage) / 100) / 0.05) * 0.05; // Up Nickel
        }

        // Calculate Unit Cost
        getUnitCost(IMfbaseprice: number, IMffreightcost: number, IUfunits: number, IUfusablep: number): number {
            var mUsablep = IUfusablep == 0 ? 100 : IUfusablep; // Prevent div/0
            return r2d((IMfbaseprice + IMffreightcost) / (mUsablep / 100) * IUfunits);
        }
    }
}

angular.module('app').service('companyRules', app.companyRules);