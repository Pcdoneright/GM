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
    public class CompanyMaintController : BaseController
    {

        // Validate companie
        public dynamic GetCompany()
        {
            return _db.companies;
        }

        // Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        public dynamic Postupdate(JArray pPostedData)
        {
            bool mCommit = true;
            var serializer = new JsonSerializer();

            var companiesupdate = new List<company>();

            ofPopulateModel(pPostedData, companiesupdate, "companiesupdate", "ServerData.company, ServerData", serializer); // Fill Updates

            // Update using transaction
            using (TransactionScope transaction = new TransactionScope())
            {
                try
                {
                    // Header
                    ofDBSave(companiesupdate, _db.companies, "U"); // Update
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