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
    public class UserMaintController : BaseController
    {
        public dynamic Getlist()
        {
            var ret = from usr in _db.users
                   from grp in _db.groups.Where(t => t.fgroupid == usr.fgroupid)
                   select new
                   {
                       usr.fuid,
                       usr.factive,
                       usr.ffirst,
                       usr.fgroupid,
                       usr.fisadmin,
                       usr.flast,
                       usr.fpassword,
                       usr.fuserid,
                       cfgroupid = grp.fname
                   };
            return ret.OrderBy(t => t.fuid);
        }

        public dynamic GetUserList()
        {
            var ret = from usr in _db.users
                      select new
                      {
                          usr.fuid,
                          cfname = usr.ffirst + " " + usr.flast
                      };
            return ret.OrderBy(t => t.cfname);
        }

        public dynamic GetGroups()
        {
            return _db.groups.OrderBy(p => p.fname);
        }

        // Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        public dynamic Postupdate(JArray pPostedData)
        {
            bool mCommit = true;
            _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

            var serializer = new JsonSerializer();

            var usersinsert = new List<user>();
            var usersupdate = new List<user>();

            ofPopulateModel(pPostedData, usersinsert, "userinsert", "ServerData.user, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, usersupdate, "userupdate", "ServerData.user, ServerData", serializer); // Fill Updates

            // Update using transaction
            using (TransactionScope transaction = new TransactionScope())
            {
                try
                {
                    // merchants
                    ofDBSave(usersinsert, _db.users, "I"); // Insert
                    ofDBSave(usersupdate, _db.users, "U"); // Update

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
