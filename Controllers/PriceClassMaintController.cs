using pcdr.Controllers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
//using System.Web.Mvc;
using System.Transactions;
using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using ServerData;

namespace GM.Controllers
{
    public class PriceClassMaintController : BaseController
    {
        public dynamic GetList()
        {
            return _db.priceclasses;
        }

        // Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        public dynamic Postupdate(JArray pPostedData)
        {
            bool mCommit = true;
            _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

            var serializer = new JsonSerializer();

            var priceclassesinsert = new List<priceclass>();
            var priceclassesupdate = new List<priceclass>();
            var priceclassesdelete = new List<priceclass>();

            // inspection
            ofPopulateModel(pPostedData, priceclassesinsert, "priceclassinsert", "ServerData.priceclass, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, priceclassesupdate, "priceclassupdate", "ServerData.priceclass, ServerData", serializer); // Fill Updates
            ofPopulateModel(pPostedData, priceclassesdelete, "priceclassdelete", "ServerData.priceclass, ServerData", serializer); // Fill Deletes

            // Update using transaction
            using (TransactionScope transaction = new TransactionScope())
            {
                try
                {

                    // emails
                    foreach (priceclass sc in priceclassesdelete) _db.priceclasses.Remove(_db.priceclasses.Find(sc.fpcid));
                    ofDBSave(priceclassesinsert, _db.priceclasses, "I"); // Insert
                    ofDBSave(priceclassesupdate, _db.priceclasses, "U"); // Update

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
