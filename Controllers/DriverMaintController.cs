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
    public class DriversMaintController : BaseController
    {
        public dynamic Getlist()
        {
            return from drv in _db.drivers
                   from usr in _db.users.Where(t => t.fuid == drv.fuid).DefaultIfEmpty()
                   from cd in _db.code_detail.Where(t => t.fgroupid == "REG" && t.fid == drv.fregion).DefaultIfEmpty()
                   select new
                   {
                       drv.fdvid,
                       drv.factive,
                       drv.fuid,
                       drv.fname,
                       drv.fphone,
                       drv.fregion,
                       drv.fnotes,
                       cfname = usr.ffirst + " " + usr.flast,
                       cfregion = cd.fdescription
                   };
        }

        // Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        public dynamic Postupdate(JArray pPostedData)
        {
            bool mCommit = true;
            _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

            var serializer = new JsonSerializer();

            var driversinsert = new List<driver>();
            var driversupdate = new List<driver>();

            ofPopulateModel(pPostedData, driversinsert, "driversinsert", "ServerData.driver, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, driversupdate, "driversupdate", "ServerData.driver, ServerData", serializer); // Fill Updates

            // Update using transaction
            using (TransactionScope transaction = new TransactionScope())
            {
                try
                {
                    // merchants
                    ofDBSave(driversinsert, _db.drivers, "I"); // Insert
                    ofDBSave(driversupdate, _db.drivers, "U"); // Update

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
