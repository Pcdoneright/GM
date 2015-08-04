using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using ServerData;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Entity;
using System.Linq;
using System.Web;
using System.Web.Http;
//using System.Web.Mvc;

namespace pcdr.Controllers
{
    public class BaseController : ApiController
    {
        public pcdrEntities _db = new pcdrEntities();

        // Fills List<model> with JSON data
        public void ofPopulateModel<T>(JArray pPostedData, List<T> pTable, string pStoreClassName, string pModelName, JsonSerializer pSserializer)
        {
            foreach (JArray mGroup in pPostedData)
            {
                if (mGroup[0].ToString() == pStoreClassName)
                {
                    foreach (JObject mRow in mGroup[1])
                    {
                        pTable.Add((T)pSserializer.Deserialize(mRow.CreateReader(), Type.GetType(pModelName))); // Add each Model(row) to Store(Table
                    }
                }
            }
        }

        // Perform Insert/Update DB Operations
        public void ofDBSave<T>(List<T> pTable, System.Data.Entity.DbSet pDBTable, string pOperation)
        {
            if (pTable.Count() > 0)
            {
                switch (pOperation)
                {
                    case "I": // Insert
                        foreach (object sc in pTable) pDBTable.Add((T)sc);
                        break;
                    case "U": // Update
                        foreach (object sc in pTable) _db.Entry(sc).State = EntityState.Modified;
                        break;
                    //case "D": // Delete
                    //    foreach (object sc in pTable) pDBTable.Remove((T)sc);
                    //    break;
                }
                _db.SaveChanges();
            }
        }

        // Get parameter value
        public string ofGetParm(string pName)
        {
            var httpContext = (HttpContextWrapper)Request.Properties["MS_HttpContext"];
            return httpContext.Request.Params[pName]; // Get Parameter
        }
    }
}
