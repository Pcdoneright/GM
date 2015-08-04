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
    public class SOController : BaseController
    {
        // SO
        public dynamic GetSO(int pfsoid)
        {
            var mso = from so in _db.salesorders.Where(t => t.fsoid == pfsoid)
                      from cm in _db.customers.Where(t => t.fcid == so.fcid)
                      from pc in _db.priceclasses.Where(t => t.fpcid == cm.fpcid).DefaultIfEmpty()
                      select new
                      {
                          so.fsoid,
                          so.ts,
                          so.fby,
                          so.fcid,
                          so.fspid,
                          so.fshipmethod,
                          so.fterms,
                          so.fshiptoid,
                          so.fdate,
                          so.finvoice_date,
                          so.fshipdate,
                          so.fduedate,
                          so.fstatus,
                          so.fdocnumber,
                          so.fponumber,
                          so.ftaxabletotal,
                          so.fnontaxabletotal,
                          so.ftax,
                          so.fdiscount,
                          so.fdiscountp,
                          so.ftotal,
                          so.ftotalpayment,
                          so.fbalance,
                          so.fchange,
                          so.fcommission,
                          so.fnotes,
                          so.fpackingnotes,
                          so.finvoicenotes,
                          so.forigin,
                          cfcid = cm.fname,
                          cm.fpcid,
                          cm.fistaxexcempt,
                          cfdescription = pc.fdescription,
                          cfsubtotal = so.ftaxabletotal + so.fnontaxabletotal
                      };

            var msd = from sd in _db.salesdetails.Where(t => t.fsoid == pfsoid)
                      from iu in _db.itemunits.Where(t => t.fitem == sd.fitem)
                      from im in _db.itemmasters.Where(t => t.fimid == iu.fimid)
                      from pc in _db.priceclasses.Where(t => t.fpcid == sd.fpcid).DefaultIfEmpty() // Outer Join
                      from ci in _db.customeritems.Where(t => t.fcid == sd.fcid && t.fitem == sd.fitem).DefaultIfEmpty() // Outer Join
                      select new
                      {
                          sd.fsoid,
                          sd.fsodid,
                          sd.fitem,
                          sd.fcid,
                          sd.fdescription,
                          sd.fqty,
                          sd.fshipqty,
                          sd.fprice,
                          sd.fistaxable,
                          sd.fpcid,
                          sd.fcommission,
                          imfistaxable = im.fistaxable,
                          cfpcid = pc.fdescription,
                          // To calculate new price
                          iu.flockclassprice,
                          im.fbaseprice,
                          im.ffreightcost,
                          iu.funits,
                          iu.fusablep,
                          iu.fcostplus,
                          ci.flockprice
                      };

            return new
            {
                salesorders = mso,
                salesdetails = msd
            };
        }

        // Validate by sonumber
        public dynamic GetValidateSonumber(long pfsonumber)
        {
            return from so in _db.salesorders.Where(t => t.fdocnumber == pfsonumber)
                   select new
                   {
                       so.fsoid,
                       so.fdocnumber,
                       so.fstatus
                   };
        }

        // SO Grid List
        public dynamic GetSOList(string psotype, string pfcid, DateTime pdatef, DateTime pdatet, string pfstatus)
        {
            //if (pfstatus == "O") pfstatus = "S"; // Set status

            //var ret = from vm in _db.vendors.Where(t => t.fname.Contains(pName))
            var ret = from so in _db.salesorders
                      from cm in _db.customers.Where(t => t.fcid == so.fcid)
                      from cc in _db.code_detail.Where(t => t.fgroupid == "SOS" && t.fid == so.fstatus).DefaultIfEmpty()
                      select new
                      {
                          so.fsoid,
                          so.fdocnumber,
                          so.fdate,
                          so.finvoice_date,
                          so.ftotal,
                          so.fcid,
                          cm.fname,
                          so.fstatus,
                          cfstatus = cc.fdescription
                      };

            if (psotype == "C") ret = ret.Where(t => t.fcid == pfcid); // Choose vendor

            if (pfstatus != "A") ret = ret.Where(t => t.fstatus == pfstatus); // Particular Status

            if (pfstatus == "I")
                ret = ret.Where(t => t.finvoice_date >= pdatef && t.finvoice_date <= pdatet); // By freceivedate
            else
                ret = ret.Where(t => t.fdate >= pdatef && t.fdate <= pdatet); // By fdate

            return ret.OrderByDescending(t => t.fdate);
        }

        // Get sale history for an Item last 10
        public dynamic GetItemHistory(string pfitem, string pfcid)
        {
            var ret = from sod in _db.salesdetails.Where(t => t.fitem == pfitem && t.fcid == pfcid && t.fqty > 0)
                      from so in _db.salesorders.Where(t => t.fsoid == sod.fsoid && t.fstatus == "I")
                      select new
                      {
                          so.fdocnumber,
                          so.finvoice_date,
                          sod.fitem,
                          sod.fdescription,
                          sod.fshipqty,
                          sod.fprice
                      };

            return ret.OrderByDescending(t => t.finvoice_date).Take(10);
        }

        // Assign price class to items
        //public dynamic PostsalesdetailsPrice(JArray pPostedData)
        //{
        //    var fitem = "";
        //    var fclass = "";

        //    foreach (JObject item in pPostedData.Children<JObject>())
        //    {
        //        fitem = item["fitem"].ToString();
        //        fclass = item["fpriceclass"].ToString();
        //        item["fprice"] = _db.itemsalesprices.Where(t => t.fitem == fitem && t.fclass == fclass).FirstOrDefault().fsaleprice;
        //    }
            
        //    return new
        //    {
        //        plist = pPostedData
        //    };
        //}


        // Save customer favorites
        public dynamic PostFavorites(JArray pPostedData)
        {
            bool mCommit = true;
            var customeritemsinsert = new List<customeritem>();
            customeritem ctrx;

            // Update using transaction
            using (TransactionScope transaction = new TransactionScope())
            {
                try
                {
                    foreach (JObject mrow in pPostedData)
                    {
                        string fitem = (string)mrow["fitem"];
                        string fcid = (string)mrow["fcid"];

                        // Only new items
                        if (_db.customeritems.Where(t => t.fcid == fcid && t.fitem == fitem).Count() == 0) // See if exists
                        {
                            ctrx = new customeritem();
                            ctrx.fcid = fcid;
                            ctrx.fitem = fitem;
                            ctrx.flockprice = 0;
                            ctrx.flastprice = 0;
                            customeritemsinsert.Add(ctrx);
                        }
                    }
                    
                    ofDBSave(customeritemsinsert, _db.customeritems, "I"); // Insert
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


        // Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        public dynamic Postupdate(JArray pPostedData)
        {
            bool mCommit = true;
            var serializer = new JsonSerializer();
            int mfdocnumber = 0;
            string mErrMsg = "";

            var salesordersinsert = new List<salesorder>();
            var salesordersupdate = new List<salesorder>();

            var salesdetailsinsert = new List<salesdetail>();
            var salesdetailsupdate = new List<salesdetail>();
            var salesdetailsdelete = new List<salesdetail>();

            var inventorytrxinsert = new List<inventorytrx>();

            // Get Data From JSON
            ofPopulateModel(pPostedData, salesordersinsert, "salesordersinsert", "ServerData.salesorder, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, salesordersupdate, "salesordersupdate", "ServerData.salesorder, ServerData", serializer); // Fill Updates

            ofPopulateModel(pPostedData, salesdetailsinsert, "salesdetailsinsert", "ServerData.salesdetail, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, salesdetailsupdate, "salesdetailsupdate", "ServerData.salesdetail, ServerData", serializer); // Fill Updates
            ofPopulateModel(pPostedData, salesdetailsdelete, "salesdetailsdelete", "ServerData.salesdetail, ServerData", serializer); // Fill Deletes

            // Update using transaction
            using (TransactionScope transaction = new TransactionScope())
            {
                try
                {
                    // Header Inserting Assign Next document #
                    if (salesordersinsert.Count() > 0)
                    {
                        var mCmpny = new pcdr.Controllers.CompanyController();
                        mfdocnumber = mCmpny.ofGetnextsequence("soticket"); // Get Next seq
                        salesordersinsert.First().fdocnumber = mfdocnumber;
                        _db.salesorders.Add(salesordersinsert.First());
                        _db.SaveChanges();
                    }
                    ofDBSave(salesordersupdate, _db.salesorders, "U"); // Update

                    // Delete
                    foreach (salesdetail sc in salesdetailsdelete) _db.salesdetails.Remove(_db.salesdetails.Find(sc.fsoid, sc.fsodid));

                    // salesdetail
                    ofDBSave(salesdetailsinsert, _db.salesdetails, "I"); // Insert
                    ofDBSave(salesdetailsupdate, _db.salesdetails, "U"); // Update

                    _db.SaveChanges();
                }
                catch (InvalidCastException e)
                {
                    mCommit = false;
                    mErrMsg = e.Message;
                }

                if (mCommit) transaction.Complete();
            }

            return new
            {
                success = mCommit,
                fdocnumber = mfdocnumber,
                errmsg = mErrMsg
            };
        }

        // Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        //public dynamic Postupdate(JArray pPostedData)
        //{
        //    bool mCommit = true;
        //    var serializer = new JsonSerializer();
        //    int mfdocnumber = 0;
        //    string mErrMsg = "";

        //    var salesordersinsert = new List<salesorder>();
        //    var salesordersupdate = new List<salesorder>();

        //    var salesdetailsinsert = new List<salesdetail>();
        //    var salesdetailsupdate = new List<salesdetail>();
        //    var salesdetailsdelete = new List<salesdetail>();

        //    var inventorytrxinsert = new List<inventorytrx>();

        //    // Get Data From JSON
        //    ofPopulateModel(pPostedData, salesordersinsert, "salesordersinsert", "ServerData.salesorder, ServerData", serializer); // Fill Inserts
        //    ofPopulateModel(pPostedData, salesordersupdate, "salesordersupdate", "ServerData.salesorder, ServerData", serializer); // Fill Updates

        //    ofPopulateModel(pPostedData, salesdetailsinsert, "salesdetailsinsert", "ServerData.salesdetail, ServerData", serializer); // Fill Inserts
        //    ofPopulateModel(pPostedData, salesdetailsupdate, "salesdetailsupdate", "ServerData.salesdetail, ServerData", serializer); // Fill Updates
        //    ofPopulateModel(pPostedData, salesdetailsdelete, "salesdetailsdelete", "ServerData.salesdetail, ServerData", serializer); // Fill Deletes

        //    // Update using transaction
        //    using (TransactionScope transaction = new TransactionScope())
        //    {
        //        try
        //        {
        //            // Header Inserting Assign Next document #
        //            if (salesordersinsert.Count() > 0)
        //            {
        //                var mCmpny = new pcdr.Controllers.CompanyController();
        //                mfdocnumber = mCmpny.ofGetnextsequence("soticket"); // Get Next seq
        //                salesordersinsert.First().fdocnumber = mfdocnumber;
        //                _db.salesorders.Add(salesordersinsert.First());
        //                _db.SaveChanges();
        //            }
        //            ofDBSave(salesordersupdate, _db.salesorders, "U"); // Update

        //            // Get ponumber
        //            var row = (salesordersinsert.Count() > 0) ? salesordersinsert.First() : salesordersupdate.First();
        //            string mfdoctype = row.fstatus;

        //            // Create inventorytrx for each detail
        //            inventorytrx mtrx;
        //            salesdetail morgtrx;
        //            itemunit mitemunit;
        //            itemmaster mitemmaster;

        //            // If VOID reverse original Qty's
        //            if (mfdoctype == "V")
        //            {
        //                var mNotChanged = _db.salesdetails.AsNoTracking().Where(t => t.fsoid == row.fsoid).ToList(); // Get Details not modified ToList() to prevent creating nesting DataReader
        //                foreach (salesdetail sc in mNotChanged)
        //                {
        //                    if (sc.fqty != 0) // Valid Qty
        //                    {
        //                        mitemunit = _db.itemunits.AsNoTracking().Where(t => t.fitem == sc.fitem).FirstOrDefault();
        //                        mitemmaster = _db.itemmasters.AsNoTracking().Where(t => t.fimid == mitemunit.fimid).FirstOrDefault();
        //                        // Only 'I'nventory
        //                        if (mitemmaster.ftype == "I")
        //                        {
        //                            // Reversal Trx with fqty * -1
        //                            mtrx = new inventorytrx();
        //                            mtrx.fuser = row.fusername;
        //                            mtrx.fdate = row.fdate;
        //                            mtrx.fdocid = sc.fsoid;
        //                            mtrx.fdoctype = "S";
        //                            mtrx.fitem = sc.fitem;
        //                            mtrx.flocation = (int)row.flocation;
        //                            mtrx.fqty = (sc.fqty * mitemunit.funits) * -1;
        //                            mtrx.famount = sc.fprice / mitemunit.funits;
        //                            inventorytrxinsert.Add(mtrx);
        //                        }
        //                    }
        //                }
        //            }
        //            else
        //            {
        //                // Insert
        //                foreach (salesdetail sc in salesdetailsinsert)
        //                {
        //                    mitemunit = _db.itemunits.AsNoTracking().Where(t => t.fitem == sc.fitem).FirstOrDefault(); // Itemunits funits
        //                    mitemmaster = _db.itemmasters.AsNoTracking().Where(t => t.fimid == mitemunit.fimid).FirstOrDefault();
        //                    // Only 'I'nventory
        //                    if (mitemmaster.ftype == "I")
        //                    {
        //                        mtrx = new inventorytrx();
        //                        mtrx.fuser = row.fusername;
        //                        mtrx.fdate = row.fdate;
        //                        mtrx.fdocid = sc.fsoid;
        //                        mtrx.fdoctype = mfdoctype;
        //                        mtrx.fitem = sc.fitem;
        //                        mtrx.flocation = (int)row.flocation;
        //                        mtrx.fqty = sc.fqty * mitemunit.funits;
        //                        mtrx.famount = sc.fprice / mitemunit.funits;
        //                        inventorytrxinsert.Add(mtrx);
        //                    }
        //                }

        //                // Delete
        //                foreach (salesdetail sc in salesdetailsdelete)
        //                {
        //                    // Retrieve original and reverse
        //                    morgtrx = _db.salesdetails.AsNoTracking().Where(t => t.fsoid == sc.fsoid && t.fsodid == sc.fsodid).FirstOrDefault();
        //                    // Only if valid qty
        //                    if (morgtrx.fqty != 0)
        //                    {
        //                        mitemunit = _db.itemunits.AsNoTracking().Where(t => t.fitem == sc.fitem).FirstOrDefault(); // Itemunits funits
        //                        mitemmaster = _db.itemmasters.AsNoTracking().Where(t => t.fimid == mitemunit.fimid).FirstOrDefault();
        //                        // Only 'I'nventory
        //                        if (mitemmaster.ftype == "I")
        //                        {

        //                            mtrx = new inventorytrx();
        //                            mtrx.fuser = row.fusername;
        //                            mtrx.fdate = row.fdate;
        //                            mtrx.fdocid = morgtrx.fsoid;
        //                            mtrx.fdoctype = "S"; // Only 'S'ales trx
        //                            mtrx.fitem = morgtrx.fitem;
        //                            mtrx.flocation = (int)row.flocation;
        //                            mtrx.fqty = (morgtrx.fqty * mitemunit.funits) * -1; // Reverse Qty
        //                            mtrx.famount = morgtrx.fprice / mitemunit.funits;
        //                            inventorytrxinsert.Add(mtrx);
        //                        }
        //                    }
        //                }

        //                // Update
        //                foreach (salesdetail sc in salesdetailsupdate)
        //                {
        //                    // Get original rec 'AsNoTracking' but no plan to update it
        //                    morgtrx = _db.salesdetails.AsNoTracking().Where(t => t.fsoid == sc.fsoid && t.fsodid == sc.fsodid).FirstOrDefault();
        //                    mitemunit = _db.itemunits.AsNoTracking().Where(t => t.fitem == sc.fitem).FirstOrDefault();
        //                    mitemmaster = _db.itemmasters.AsNoTracking().Where(t => t.fimid == mitemunit.fimid).FirstOrDefault();
        //                    // Only 'I'nventory
        //                    if (mitemmaster.ftype == "I")
        //                    {

        //                        // Open Orders and Qty was modified
        //                        if (mfdoctype == "S" && sc.fqty != morgtrx.fqty)
        //                        {
        //                            mtrx = new inventorytrx();
        //                            mtrx.fuser = row.fusername;
        //                            mtrx.fdate = row.fdate;
        //                            mtrx.fdocid = morgtrx.fsoid;
        //                            mtrx.fdoctype = mfdoctype;
        //                            mtrx.fitem = sc.fitem;
        //                            mtrx.flocation = (int)row.flocation;
        //                            mtrx.fqty = (sc.fqty - morgtrx.fqty) * mitemunit.funits; // Difference
        //                            mtrx.famount = sc.fprice / mitemunit.funits;
        //                            inventorytrxinsert.Add(mtrx);
        //                        }
        //                        else if (mfdoctype == "I")
        //                        {
        //                            if (morgtrx.fqty != 0) // Reverse only if valid Qty
        //                            {
        //                                mtrx = new inventorytrx();
        //                                mtrx.fuser = row.fusername;
        //                                mtrx.fdate = row.fdate;
        //                                mtrx.fdocid = morgtrx.fsoid;
        //                                mtrx.fdoctype = "S";
        //                                mtrx.fitem = sc.fitem;
        //                                mtrx.flocation = (int)row.flocation;
        //                                mtrx.fqty = (morgtrx.fqty * mitemunit.funits) * -1; // Reverse
        //                                mtrx.famount = sc.fprice / mitemunit.funits;
        //                                inventorytrxinsert.Add(mtrx);
        //                            }

        //                            if (sc.fqty != 0) // New Valid Qty
        //                            {
        //                                mtrx = new inventorytrx();
        //                                mtrx.fuser = row.fusername;
        //                                mtrx.fdate = row.fdate;
        //                                mtrx.fdocid = morgtrx.fsoid;
        //                                mtrx.fdoctype = mfdoctype;
        //                                mtrx.fitem = sc.fitem;
        //                                mtrx.flocation = (int)row.flocation;
        //                                mtrx.fqty = sc.fqty * mitemunit.funits;
        //                                mtrx.famount = sc.fprice / mitemunit.funits;
        //                                inventorytrxinsert.Add(mtrx);
        //                            }
        //                        }
        //                    }
        //                }

        //                // Records not modified must also create transactions if 'I'nvocing
        //                if (mfdoctype == "I")
        //                {
        //                    var mNotChanged = _db.salesdetails.AsNoTracking().Where(t => t.fsoid == row.fsoid).ToList(); // Get Details not modified ToList() to prevent creating nesting DataReader
        //                    foreach (salesdetail sc in mNotChanged)
        //                    {
        //                        if (salesdetailsupdate.Where(t => t.fsodid == sc.fsodid).Count() == 0) // Not found under modified
        //                        {
        //                            if (sc.fqty != 0) // Valid Qty
        //                            {
        //                                mitemunit = _db.itemunits.AsNoTracking().Where(t => t.fitem == sc.fitem).FirstOrDefault();
        //                                mitemmaster = _db.itemmasters.AsNoTracking().Where(t => t.fimid == mitemunit.fimid).FirstOrDefault();
        //                                // Only 'I'nventory
        //                                if (mitemmaster.ftype == "I")
        //                                {
        //                                    // Invoice Trx
        //                                    mtrx = new inventorytrx();
        //                                    mtrx.fuser = row.fusername;
        //                                    mtrx.fdate = row.fdate;
        //                                    mtrx.fdocid = sc.fsoid;
        //                                    mtrx.fdoctype = mfdoctype;
        //                                    mtrx.fitem = sc.fitem;
        //                                    mtrx.flocation = (int)row.flocation;
        //                                    mtrx.fqty = sc.fqty * mitemunit.funits;
        //                                    mtrx.famount = sc.fprice / mitemunit.funits;
        //                                    inventorytrxinsert.Add(mtrx);

        //                                    // Reversal Trx with fqty * -1
        //                                    mtrx = new inventorytrx();
        //                                    mtrx.fuser = row.fusername;
        //                                    mtrx.fdate = row.fdate;
        //                                    mtrx.fdocid = sc.fsoid;
        //                                    mtrx.fdoctype = "S";
        //                                    mtrx.fitem = sc.fitem;
        //                                    mtrx.flocation = (int)row.flocation;
        //                                    mtrx.fqty = (sc.fqty * mitemunit.funits) * -1;
        //                                    mtrx.famount = sc.fprice / mitemunit.funits;
        //                                    inventorytrxinsert.Add(mtrx);
        //                                }
        //                            }
        //                        }
        //                    }
        //                }

        //                // Delete
        //                foreach (salesdetail sc in salesdetailsdelete) _db.salesdetails.Remove(_db.salesdetails.Find(sc.fsoid, sc.fsodid));

        //                // salesdetail
        //                ofDBSave(salesdetailsinsert, _db.salesdetails, "I"); // Insert
        //                ofDBSave(salesdetailsupdate, _db.salesdetails, "U"); // Update
        //            }

        //            // Save inventorytrx
        //            ofDBSave(inventorytrxinsert, _db.inventorytrxes, "I"); // Always Insert

        //            _db.SaveChanges();
        //        }
        //        catch (InvalidCastException e)
        //        {
        //            mCommit = false;
        //            mErrMsg = e.Message;
        //        }

        //        if (mCommit) transaction.Complete();
        //    }

        //    return new
        //    {
        //        success = mCommit,
        //        fdocnumber = mfdocnumber,
        //        errmsg = mErrMsg
        //    };
        //}
    }
}
