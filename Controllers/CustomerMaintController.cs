using pcdr.Controllers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Transactions;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using ServerData;

namespace pcdr.Controllers
{
    public class CustomerMaintController : BaseController
    {

        // Validate Customer
        public dynamic GetValidateCustomer(string pfcid)
        {
            var ret = from cm in _db.customers.Where(t => t.fcid == pfcid)
                      select new
                      {
                          cm.fcid,
                          cm.fname,
                          cm.fterms,
                          cm.fpcid,
                          cm.fistaxexcempt
                      };

            return ret;
        }

        public dynamic GetCustomer(string pfcid)
        {
            var mci = from ci in _db.customeritems.Where(t => t.fcid == pfcid)
                      from iu in _db.itemunits.Where(t => t.fitem == ci.fitem)
                      from im in _db.itemmasters.Where(t => t.fimid == iu.fimid)
                      from pc in _db.priceclasses.Where(t => t.fpcid == ci.fpcid).DefaultIfEmpty()
                      select new
                      {
                          ci.fcid,
                          ci.fitem,
                          ci.fpcid,
                          cfpcid = pc.fdescription,
                          ci.flockprice,
                          ci.flastprice,
                          cfdescription = im.fdescription + " " + iu.fuomdescription,
                          im.fbaseprice,
                          iu.funits,
                          iu.fusablep,
                          iu.fcostplus,
                          iu.flockclassprice,
                          im.ffreightcost
                      };

            return new {
                customers = _db.customers.Where(t => t.fcid == pfcid),
                customeritems = mci,
                customerlocations = _db.customerlocations.Where(t => t.fcid == pfcid)
            };
        }

        // Customer Grid List By Name
        public dynamic GetCustomerList(bool pActive, string pName, string pType)
        {
            var ret = from cm in _db.customers
                      from pc in _db.priceclasses.Where(t => t.fpcid == cm.fpcid)
                      from cd in _db.code_detail.Where(t => t.fgroupid == "CTR" && t.fid == cm.fterms).DefaultIfEmpty()
                      select new
                      {
                          cm.fcid,
                          cm.factive,
                          cm.fname,
                          cm.fphone1,
                          cm.fresalecertificate,
                          cm.fterms,
                          cfterms = cd.fdescription,
                          cm.fnotes,
                          cm.fpcid,
                          cfpcid = pc.fdescription,
                          cm.fistaxexcempt,
                          cm.fcontact,
                          cm.faddress1,
                          cm.fspid,
                          cm.fshipmethod
                      };

            if (pActive) ret.Where(t => t.factive == true); // Active only
            if (pType == "N") ret = ret.Where(t => t.fname.Contains(pName)); // Vendor name search

            return ret.OrderBy(t => t.fname);
        }

        public dynamic GetCustomerRelatedDD(string pfcid)
        {
            var mcc = from cc in _db.customerlocations.Where(t => t.fcid == pfcid)
                      select new
                      {
                          cc.flocid,
                          cc.fname
                      };

            return new
            {
                customerlocations = mcc,
                taxrate = _db.companies.FirstOrDefault().ftaxrate
            };
        }

        // Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        public dynamic Postupdate(JArray pPostedData)
        {
            bool mCommit = true;
            var serializer = new JsonSerializer();

            var customersinsert = new List<customer>();
            var customersupdate = new List<customer>();

            var customerlocationsinsert = new List<customerlocation>();
            var customerlocationsupdate = new List<customerlocation>();
            var customerlocationsdelete = new List<customerlocation>();

            var customeritemsinsert = new List<customeritem>();
            var customeritemsupdate = new List<customeritem>();
            var customeritemsdelete = new List<customeritem>();

            ofPopulateModel(pPostedData, customersinsert, "customersinsert", "ServerData.customer, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, customersupdate, "customersupdate", "ServerData.customer, ServerData", serializer); // Fill Updates

            ofPopulateModel(pPostedData, customerlocationsinsert, "customerlocationsinsert", "ServerData.customerlocation, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, customerlocationsupdate, "customerlocationsupdate", "ServerData.customerlocation, ServerData", serializer); // Fill Updates
            ofPopulateModel(pPostedData, customerlocationsdelete, "customerlocationsdelete", "ServerData.customerlocation, ServerData", serializer); // Fill Deletes

            ofPopulateModel(pPostedData, customeritemsinsert, "customeritemsinsert", "ServerData.customeritem, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, customeritemsupdate, "customeritemsupdate", "ServerData.customeritem, ServerData", serializer); // Fill Updates
            ofPopulateModel(pPostedData, customeritemsdelete, "customeritemsdelete", "ServerData.customeritem, ServerData", serializer); // Fill Deletes

            // Update using transaction
            using (TransactionScope transaction = new TransactionScope())
            {
                try
                {
                    // Header
                    ofDBSave(customersinsert, _db.customers, "I"); // Insert
                    ofDBSave(customersupdate, _db.customers, "U"); // Update

                    // Delete
                    foreach (customeritem sc in customeritemsdelete) _db.customeritems.Remove(_db.customeritems.Find(sc.fcid, sc.fitem));
                    foreach (customerlocation sc in customerlocationsdelete) _db.customerlocations.Remove(_db.customerlocations.Find(sc.fcid, sc.flocid));

                    // customerlocation
                    ofDBSave(customerlocationsinsert, _db.customerlocations, "I"); // Insert
                    ofDBSave(customerlocationsupdate, _db.customerlocations, "U"); // Update

                    // customeritem
                    ofDBSave(customeritemsinsert, _db.customeritems, "I"); // Insert
                    ofDBSave(customeritemsupdate, _db.customeritems, "U"); // Update

                    _db.SaveChanges();
                }
                catch (InvalidCastException e)
                {
                    mCommit = false;
                }

                if (mCommit) transaction.Complete();
            }

            return new
            {
                success = mCommit,
            };
        }
    }
}