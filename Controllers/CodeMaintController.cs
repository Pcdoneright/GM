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

namespace pcdr.Controllers
{
    public class CodeMaintController : BaseController
    {
        public dynamic GetCode()
        {
            return new
            {
                code_master = _db.code_master,
                code_detail = _db.code_detail
            };
        }

        // Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        public dynamic Postupdate(JArray pPostedData)
        {
            bool mCommit = true;
            _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

            var serializer = new JsonSerializer();

            var code_mastersinsert = new List<code_master>();
            var code_mastersupdate = new List<code_master>();
            var code_mastersdelete = new List<code_master>();
            var code_detailsinsert = new List<code_detail>();
            var code_detailsupdate = new List<code_detail>();
            var code_detailsdelete = new List<code_detail>();

            // Master
            ofPopulateModel(pPostedData, code_mastersinsert, "code_masterinsert", "ServerData.code_master, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, code_mastersupdate, "code_masterupdate", "ServerData.code_master, ServerData", serializer); // Fill Update
            ofPopulateModel(pPostedData, code_mastersdelete, "code_masterdelete", "ServerData.code_master, ServerData", serializer); // Fill Deletes
            // Detail
            ofPopulateModel(pPostedData, code_detailsinsert, "code_detailinsert", "ServerData.code_detail, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, code_detailsupdate, "code_detailupdate", "ServerData.code_detail, ServerData", serializer); // Fill Update
            ofPopulateModel(pPostedData, code_detailsdelete, "code_detaildelete", "ServerData.code_detail, ServerData", serializer); // Fill Deletes

            // Update using transaction
            using (TransactionScope transaction = new TransactionScope())
            {
                try
                {
                    // TOPDOWN insert,update
                    ofDBSave(code_mastersinsert, _db.code_master, "I"); // Insert
                    ofDBSave(code_mastersupdate, _db.code_master, "U"); // Update

                    ofDBSave(code_detailsinsert, _db.code_detail, "I"); // Insert
                    ofDBSave(code_detailsupdate, _db.code_detail, "U"); // Update

                    // BOTTOMUP delete
                    foreach (code_detail sc in code_detailsdelete) _db.code_detail.Remove(_db.code_detail.Find(sc.fgroupid, sc.fid));
                    foreach (code_master sc in code_mastersdelete) _db.code_master.Remove(_db.code_master.Find(sc.fgroupid));
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