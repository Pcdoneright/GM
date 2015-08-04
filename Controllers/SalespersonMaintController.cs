using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using pcdr.Controllers;
using ServerData;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Transactions;
using System.Web;
using System.Web.Http;

namespace pcdr.Controllers
{
    public class SalespersonMaintController : BaseController
    {
        public dynamic Getlist()
        {
            var ret = from sp in _db.salespersons
                      from cd in _db.code_detail.Where(t => t.fgroupid == "REG" && t.fid == sp.fregion).DefaultIfEmpty()
                      from usr in _db.users.Where(t => t.fuid == sp.fuid).DefaultIfEmpty()
                      select new
                      {
                          sp.fspid,
                          sp.factive,
                          sp.fname,
                          sp.faddress,
                          sp.fcity,
                          sp.fstate,
                          sp.fzip,
                          sp.fphone1,
                          sp.fphone2,
                          sp.fregion,
                          sp.fuid,
                          cfregion = cd.fdescription,
                          cfuid = usr.ffirst + " " + usr.flast
                      };
            return ret.OrderBy(t => t.fspid);
        }

        public dynamic GetSalespersonlist()
        {
            return from sp in _db.salespersons.Where(t => t.factive == true)
                      select new
                      {
                          sp.fspid,
                          sp.factive,
                          sp.fname
                      };
        }

        // Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        public dynamic Postupdate(JArray pPostedData)
        {
            bool mCommit = true;
            _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

            var serializer = new JsonSerializer();

            var salespersonsinsert = new List<salesperson>();
            var salespersonsupdate = new List<salesperson>();

            ofPopulateModel(pPostedData, salespersonsinsert, "salespersoninsert", "ServerData.salesperson, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, salespersonsupdate, "salespersonupdate", "ServerData.salesperson, ServerData", serializer); // Fill Updates

            // Update using transaction
            using (TransactionScope transaction = new TransactionScope())
            {
                try
                {
                    // merchants
                    ofDBSave(salespersonsinsert, _db.salespersons, "I"); // Insert
                    ofDBSave(salespersonsupdate, _db.salespersons, "U"); // Update

                    // TOPDOWN delete,insert,update
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
                success = mCommit
            };
        }
    }
}
