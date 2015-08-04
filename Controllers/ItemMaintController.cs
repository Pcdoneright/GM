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
    public class ItemMaintController : BaseController
    {

        // Items List (deprecated)
        public dynamic GetList(bool pfactive, string pfcategory, string pfsubcategory) //, int pfpcid)
        {
            var ret = from iu in _db.itemunits
                      from im in _db.itemmasters.Where(t => t.fimid == iu.fimid)
                      from cc in _db.code_detail.Where(t => t.fgroupid == "IC" && t.fid == im.fcategory)
                      from csc in _db.code_detail.Where(t => t.fgroupid == "ISC" && t.fid == im.fsubcategory).DefaultIfEmpty() // Left Outer Join
                      select new
                      {
                          iu.fitem,
                          iu.fimid,
                          iu.factive,
                          iu.funits,
                          iu.fwastep,
                          iu.fusablep,
                          iu.fuomdescription,
                          im.fdescription,
                          //cfdescription = im.fdescription + " " + iu.fuomdescription,
                          im.fcategory,
                          im.fsubcategory,
                          cfcategory = cc.fdescription,
                          cfsubcategory = csc.fdescription,
                          im.freorderpoint,
                          im.freorderqty,
                          im.ffreightcost,
                          im.fbaseprice,
                          iu.flockclassprice
                      };

            // Filter
            if (pfactive)
                ret = ret.Where(t => t.factive == true);

            if (pfcategory != "A")
                ret = ret.Where(t => t.fcategory == pfcategory);

            if (pfsubcategory != "A")
                ret = ret.Where(t => t.fsubcategory == pfsubcategory);

            return ret.OrderBy(t => t.fdescription).ThenBy(t => t.fimid);
        }

        public dynamic GetListByDescription()
        {
            bool pfactive = false;
            if (ofGetParm("pActive") != "") pfactive = bool.Parse(ofGetParm("pActive"));
            string psearch = ofGetParm("psearch"); // Get Parameter

            var ret = from im in _db.itemmasters.Where(t => t.fdescription.Contains(psearch))
                      from iu in _db.itemunits.Where(t => t.fimid == im.fimid)
                      from cc in _db.code_detail.Where(t => t.fgroupid == "IC" && t.fid == im.fcategory).DefaultIfEmpty() // Left Outer Join
                      select new
                      {
                          iu.fitem,
                          iu.fimid,
                          iu.factive,
                          iu.funits,
                          iu.fwastep,
                          iu.fusablep,
                          iu.fuomdescription,
                          iu.fcostplus,
                          im.fdescription,
                          cfdescription = im.fdescription + " " + iu.fuomdescription,
                          im.fcategory,
                          im.fsubcategory,
                          cfcategory = cc.fdescription,
                          //cfsubcategory = csc.fdescription,
                          im.freorderpoint,
                          im.freorderqty,
                          im.ffreightcost,
                          im.fbaseprice,
                          fcountryorg = im.fcountryorg == null ? "" : im.fcountryorg,
                          iu.flockclassprice
                      };

            // Filter
            if (pfactive)
                ret = ret.Where(t => t.factive == true);

            //if (pfcategory != "A")
            //    ret = ret.Where(t => t.fcategory == pfcategory);

            //if (pfsubcategory != "A")
            //    ret = ret.Where(t => t.fsubcategory == pfsubcategory);

            return ret.OrderBy(t => t.fdescription).ThenBy(t => t.fimid);
        }

        public dynamic GetListByItem()
        {
            bool pfactive = false;
            if (ofGetParm("pActive") != "") pfactive = bool.Parse(ofGetParm("pActive"));
            string psearch = ofGetParm("psearch"); // Get Parameter

            var ret = from iu in _db.itemunits.Where(t => t.fitem.StartsWith(psearch))
                      from im in _db.itemmasters.Where(t => t.fimid == iu.fimid)
                      from cc in _db.code_detail.Where(t => t.fgroupid == "IC" && t.fid == im.fcategory).DefaultIfEmpty() // Left Outer Join
                      select new
                      {
                          iu.fitem,
                          iu.fimid,
                          iu.factive,
                          iu.funits,
                          iu.fwastep,
                          iu.fusablep,
                          iu.fuomdescription,
                          iu.fcostplus,
                          im.fdescription,
                          cfdescription = im.fdescription + " " + iu.fuomdescription,
                          im.fcategory,
                          im.fsubcategory,
                          cfcategory = cc.fdescription,
                          //cfsubcategory = csc.fdescription,
                          im.freorderpoint,
                          im.freorderqty,
                          im.ffreightcost,
                          im.fbaseprice,
                          fcountryorg = im.fcountryorg == null ? "" : im.fcountryorg,
                          iu.flockclassprice
                      };

            // Filter
            if (pfactive)
                ret = ret.Where(t => t.factive == true);

            //if (pfcategory != "A")
            //    ret = ret.Where(t => t.fcategory == pfcategory);

            //if (pfsubcategory != "A")
            //    ret = ret.Where(t => t.fsubcategory == pfsubcategory);

            return ret.OrderBy(t => t.fdescription).ThenBy(t => t.fimid);
        }

        public dynamic GetListOther()
        {
            bool pfactive = false;
            if (ofGetParm("pActive") != "") pfactive = bool.Parse(ofGetParm("pActive"));
            string pType = ofGetParm("pType"); // Get Parameter

            var ret = from im in _db.itemmasters
                      from iu in _db.itemunits.Where(t => t.fimid == im.fimid)
                      from cc in _db.code_detail.Where(t => t.fgroupid == "IC" && t.fid == im.fcategory).DefaultIfEmpty() // Left Outer Join
                      select new
                      {
                          iu.fitem,
                          iu.fimid,
                          iu.factive,
                          iu.funits,
                          iu.fwastep,
                          iu.fusablep,
                          iu.fuomdescription,
                          iu.fcostplus,
                          iu.fonsale,
                          im.fdescription,
                          cfdescription = im.fdescription + " " + iu.fuomdescription,
                          im.fcategory,
                          im.fsubcategory,
                          cfcategory = cc.fdescription,
                          //cfsubcategory = csc.fdescription,
                          im.freorderpoint,
                          im.freorderqty,
                          im.ffreightcost,
                          im.fbaseprice,
                          fcountryorg = im.fcountryorg == null ? "" : im.fcountryorg,
                          iu.flockclassprice
                      };

            // Filter
            if (pfactive)
                ret = ret.Where(t => t.factive == true);

            switch (pType)
            {
                case "O":
                    ret = ret.Where(t => t.fonsale == true);
                    break;
                case "L":
                    ret = ret.Where(t => t.flockclassprice != null );
                    break;
            }

            return ret.OrderBy(t => t.fdescription).ThenBy(t => t.fimid);
        }

        public dynamic GetCustomerItemList(string pfcid)
        {
            var sql = "select fcalcsellprice(ci.fcid, ci.fitem) as fprice," +
                        "iu.fitem, im.fdescription, IFNULL(im.fcountryorg, '') as fcountryorg, iu.funits, iu.fuomdescription, im.fistaxable, " +
                        "iu.flockclassprice, im.fbaseprice, im.ffreightcost, iu.fusablep, iu.fcostplus, ci.flockprice " +
                        "from customeritems ci " +
                        "JOIN itemunits iu ON iu.fitem = ci.fitem " +
                        "JOIN itemmasters im ON im.fimid = iu.fimid " +
                        "WHERE ci.fcid = {0} " +
                        "ORDER BY im.fdescription";

            return _db.Database.SqlQuery<dummyItem>(sql, pfcid).ToArray();
        }

        public dynamic GetItemPrice(string pfitem, string pfcid)
        {
            var sql = "select fcalcsellprice({0}, {1}) as fprice";
            return _db.Database.SqlQuery<dummyItem>(sql, pfcid, pfitem).ToArray();
        }

        public dynamic GetValidateItemWithPrice(string pfitem, string pfcid)
        {
            var sql = "select fcalcsellprice({1}, iu.fitem) as fprice," +
                        "iu.fitem, im.fdescription, IFNULL(im.fcountryorg, '') as fcountryorg, iu.funits, iu.fuomdescription, im.fistaxable, " +
                        "iu.flockclassprice, im.fbaseprice, im.ffreightcost, iu.fusablep, iu.fcostplus, ci.flockprice " +
                        "from itemunits iu " +
                        "JOIN itemmasters im ON im.fimid = iu.fimid " +
                        "RIGHT JOIN customeritems ci ON ci.fcid = {1} AND ci.fitem = iu.fitem " +
                        "WHERE iu.fitem = {0}";

            return _db.Database.SqlQuery<dummyItem>(sql, pfitem, pfcid).ToArray();
        }

        public class dummyItem
        {
            public string fitem { get; set; }
            public string fdescription { get; set; }
            public string fuomdescription { get; set; }
            public string fcountryorg { get; set; }
            public bool fistaxable { get; set; }
            public decimal funits { get; set; }
            public decimal fprice { get; set; }
            public int? flockclassprice { get; set; } // Allow nulls
            public decimal fbaseprice { get; set; }
            public decimal ffreightcost { get; set; }
            public decimal fusablep { get; set; }
            public decimal fcostplus { get; set; }
            public decimal flockprice { get; set; }
        }

        public dynamic GetValidateItem()
        {
            string pfitem = ofGetParm("pfitem"); // Get Parameter

            return from iu in _db.itemunits.Where(t => t.fitem == pfitem)
                   from im in _db.itemmasters.Where(t => t.fimid == iu.fimid)
                   from cc in _db.code_detail.Where(t => t.fgroupid == "IC" && t.fid == im.fcategory).DefaultIfEmpty() // Left Outer Join
                   select new
                   {
                       iu.fitem,
                       iu.fimid,
                       iu.factive,
                       iu.funits,
                       iu.fwastep,
                       iu.fusablep,
                       iu.fuomdescription,
                       iu.fcostplus,
                       im.fdescription,
                       cfdescription = im.fdescription + " " + iu.fuomdescription,
                       im.fcategory,
                       im.fsubcategory,
                       cfcategory = cc.fdescription,
                       //cfsubcategory = csc.fdescription,
                       im.freorderpoint,
                       im.freorderqty,
                       im.ffreightcost,
                       im.fbaseprice,
                       iu.flockclassprice
                   };
        }

        public dynamic GetValidateItemmasters()
        {
            long pfimid = int.Parse(ofGetParm("pfitem")); // Get Parameter

            return _db.itemmasters.Where(t => t.fimid == pfimid);
        }

        // ItemMaint Edit
        public dynamic GetItem()
        {
            int pid = int.Parse(ofGetParm("pfimid")); // Get Parameter

            var mIV = from im in _db.itemvendors.Where(t => t.fimid == pid)
                      from vdr in _db.vendors.Where(t => t.fvid == im.fvid)
                      select new
                      {
                          im.fitem,
                          im.fvid,
                          im.fimid,
                          im.fdescription,
                          im.fvitem,
                          im.flastprice,
                          cfname = vdr.fname
                      };

            var mIU = from iu in _db.itemunits.Where(t => t.fimid == pid)
                      from pc in _db.priceclasses.Where(t => t.fpcid == iu.flockclassprice).DefaultIfEmpty()
                      select new
                      {
                          iu.fitem,
                          iu.fimid,
                          iu.factive,
                          iu.fuomdescription,
                          iu.funits,
                          iu.fwastep,
                          iu.fusablep,
                          iu.fonsale,
                          iu.fcostplus,
                          iu.flockclassprice,
                          cflockclassprice = pc.fdescription
                      };

            return new
            {
                itemmasters = _db.itemmasters.Where(t => t.fimid == pid),
                itemunits = mIU,
                inventories = _db.inventories.Where(t => t.fimid == pid),
                itemvendors = mIV
            };
        }

        //public dynamic GetListAll()
        //{
        //    bool pfactive = false;
        //    if (ofGetParm("pActive") != "") pfactive = bool.Parse(ofGetParm("pActive"));

        //    var ret = from im in _db.itemmasters
        //              from iu in _db.itemunits.Where(t => t.fimid == im.fimid)
        //              from cc in _db.code_detail.Where(t => t.fgroupid == "IC" && t.fid == im.fcategory).DefaultIfEmpty() // Left Outer Join
        //              select new
        //              {
        //                  iu.fitem,
        //                  iu.fimid,
        //                  iu.factive,
        //                  iu.funits,
        //                  iu.fwastep,
        //                  iu.fusablep,
        //                  iu.fuomdescription,
        //                  im.fdescription,
        //                  cfdescription = im.fdescription + " " + iu.fuomdescription,
        //                  im.fcategory,
        //                  im.fsubcategory,
        //                  cfcategory = cc.fdescription,
        //                  //cfsubcategory = csc.fdescription,
        //                  im.freorderpoint,
        //                  im.freorderqty,
        //                  im.ffreightcost,
        //                  im.fbaseprice,
        //                  iu.flockclassprice
        //              };

        //    // Filter
        //    if (pfactive)
        //        ret = ret.Where(t => t.factive == true);

        //    //if (pfcategory != "A")
        //    //    ret = ret.Where(t => t.fcategory == pfcategory);

        //    //if (pfsubcategory != "A")
        //    //    ret = ret.Where(t => t.fsubcategory == pfsubcategory);

        //    return ret.OrderBy(t => t.fdescription).ThenBy(t => t.fimid);
        //}

        //// Items List For PO only
        //public dynamic GetListPO(bool pfactive, string pfcategory, string pfsubcategory) //, int pfpcid)
        //{
        //    var ret = from iu in _db.itemunits.Where(t => t.fusablep == 100 & t.funits == 1)
        //              from im in _db.itemmasters.Where(t => t.fimid == iu.fimid)
        //              from cc in _db.code_detail.Where(t => t.fgroupid == "IC" && t.fid == im.fcategory)
        //              from csc in _db.code_detail.Where(t => t.fgroupid == "ISC" && t.fid == im.fsubcategory).DefaultIfEmpty() // Left Outer Join
        //              select new
        //              {
        //                  iu.fitem,
        //                  iu.fimid,
        //                  iu.factive,
        //                  iu.funits,
        //                  iu.fwastep,
        //                  iu.fusablep,
        //                  iu.fuomdescription,
        //                  im.fdescription,
        //                  cfdescription = im.fdescription + " " + iu.fuomdescription,
        //                  im.fcategory,
        //                  im.fsubcategory,
        //                  cfcategory = cc.fdescription,
        //                  cfsubcategory = csc.fdescription,
        //                  im.freorderpoint,
        //                  im.freorderqty,
        //                  im.ffreightcost,
        //                  im.fbaseprice,
        //                  iu.flockclassprice
        //              };

        //    // Filter
        //    if (pfactive)
        //        ret = ret.Where(t => t.factive == true);

        //    if (pfcategory != "A")
        //        ret = ret.Where(t => t.fcategory == pfcategory);

        //    if (pfsubcategory != "A")
        //        ret = ret.Where(t => t.fsubcategory == pfsubcategory);

        //    return ret.OrderBy(t => t.fdescription).ThenBy(t => t.fimid);
        //}

        // Get Combobox List (Active only)
        //public dynamic GetCBList()
        //{
        //    var ret = from iu in _db.itemunits.Where(t => t.factive == true)
        //              from im in _db.itemmasters.Where(t => t.fimid == iu.fimid)
        //              select new
        //              {
        //                  iu.fitem,
        //                  cfdescription = im.fdescription + " " + iu.fuomdescription,
        //              };

        //    return ret.OrderBy(t => t.fitem);
        //}

        //public dynamic GetEditList(string pfcategory, string pfsubcategory)
        //{
        //    var ret = from im in _db.itemmasters.Where(t => t.factive == true)
        //              from cc in _db.code_detail.Where(t => t.fgroupid == "IC" && t.fid == im.fcategory)
        //              from csc in _db.code_detail.Where(t => t.fgroupid == "ISC" && t.fid == im.fsubcategory).DefaultIfEmpty()
        //              select new
        //              {
        //                  im.fimid,
        //                  im.factive,
        //                  im.ftype,
        //                  im.fdescription,
        //                  im.fcategory,
        //                  im.fsubcategory,
        //                  im.fistaxable,
        //                  im.freorderpoint,
        //                  im.freorderqty,
        //                  im.fnotes,
        //                  im.ffreightcost,
        //                  im.fbaseprice,
        //                  im.ts,
        //                  im.fby,
        //                  cfcategory = cc.fdescription,
        //                  cfsubcategory = csc.fdescription
        //              };

        //    if (pfcategory != "A")
        //        ret = ret.Where(t => t.fcategory == pfcategory);

        //    if (pfsubcategory != "A")
        //        ret = ret.Where(t => t.fsubcategory == pfsubcategory);

        //    return ret.OrderBy(t => t.fdescription);
        //}

        //public dynamic GetItemInventory()
        //{
        //    int pid = int.Parse(ofGetParm("pfimid")); // Get Parameter
        //    // Get Inventory Info for the item
        //    return from inv in _db.inventories.Where(t => t.fimid == pid)
        //           select new
        //           {
        //               inv.fimid,
        //               // Get Sum on-hand-qty with anything <> 0
        //               //cfonhand = _db.inventorybatches.Where(t => t.fimid == pid && t.fonhand != 0).Sum(t => (decimal)t.fonhand),
        //               inv.fonhand,
        //               inv.fsalesorders,
        //               inv.fpurchaseorders,
        //               inv.flastcost,
        //               inv.flastsale
        //           };
        //}

        //public dynamic GetPriceList()
        //{
        //    return _db.priceclasses;
        //}

        //public dynamic GetItemUnits(int pfimid)
        //{
        //    return _db.itemunits.Where(t => t.fimid == pfimid).OrderBy(t => t.fuomdescription);
        //}

        // Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        public dynamic Postupdate(JArray pPostedData)
        {
            bool mCommit = true;
            _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

            var serializer = new JsonSerializer();

            var itemmasterssinsert = new List<itemmaster>();
            var itemmastersupdate = new List<itemmaster>();

            var itemunitsinsert = new List<itemunit>();
            var itemunitsupdate = new List<itemunit>();
            var itemunitsdelete = new List<itemunit>();

            var itemvendorsinsert = new List<itemvendor>();
            var itemvendorsupdate = new List<itemvendor>();
            var itemvendorsdelete = new List<itemvendor>();

            ofPopulateModel(pPostedData, itemmasterssinsert, "itemmasterinsert", "ServerData.itemmaster, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, itemmastersupdate, "itemmasterupdate", "ServerData.itemmaster, ServerData", serializer); // Fill Updates

            ofPopulateModel(pPostedData, itemunitsinsert, "itemunitinsert", "ServerData.itemunit, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, itemunitsupdate, "itemunitupdate", "ServerData.itemunit, ServerData", serializer); // Fill Updates
            ofPopulateModel(pPostedData, itemunitsdelete, "itemunitdelete", "ServerData.itemunit, ServerData", serializer); // Fill Deletes

            ofPopulateModel(pPostedData, itemvendorsinsert, "itemvendorinsert", "ServerData.itemvendor, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, itemvendorsupdate, "itemvendorupdate", "ServerData.itemvendor, ServerData", serializer); // Fill Updates
            ofPopulateModel(pPostedData, itemvendorsdelete, "itemvendordelete", "ServerData.itemvendor, ServerData", serializer); // Fill Deletes

            // Update using transaction
            using (TransactionScope transaction = new TransactionScope())
            {
                try
                {
                    // Header
                    ofDBSave(itemmasterssinsert, _db.itemmasters, "I"); // Insert
                    ofDBSave(itemmastersupdate, _db.itemmasters, "U"); // Update

                    // Delete
                    foreach (itemvendor sc in itemvendorsdelete) _db.itemvendors.Remove(_db.itemvendors.Find(sc.fitem, sc.fvid));
                    foreach (itemunit sc in itemunitsdelete) _db.itemunits.Remove(_db.itemunits.Find(sc.fitem));

                    // itemunit
                    ofDBSave(itemunitsinsert, _db.itemunits, "I"); // Insert
                    ofDBSave(itemunitsupdate, _db.itemunits, "U"); // Update

                    // itemvendor
                    ofDBSave(itemvendorsinsert, _db.itemvendors, "I"); // Insert
                    ofDBSave(itemvendorsupdate, _db.itemvendors, "U"); // Update

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

        // Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        //public dynamic PostupdateEdit(JArray pPostedData)
        //{
        //    bool mCommit = true;
        //    _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

        //    var serializer = new JsonSerializer();

        //    var itemmastersupdate = new List<itemmaster>();
        //    var itemunitsupdate = new List<itemunit>();

        //    ofPopulateModel(pPostedData, itemmastersupdate, "itemmasterupdate", "ServerData.itemmaster, ServerData", serializer); // Fill Updates
        //    ofPopulateModel(pPostedData, itemunitsupdate, "itemunitupdate", "ServerData.itemunit, ServerData", serializer); // Fill Updates

        //    // Update using transaction
        //    using (TransactionScope transaction = new TransactionScope())
        //    {
        //        try
        //        {
        //            // Header
        //            ofDBSave(itemmastersupdate, _db.itemmasters, "U"); // Update
        //            // Details
        //            ofDBSave(itemunitsupdate, _db.itemunits, "U"); // Update

        //            _db.SaveChanges();
        //        }
        //        catch (InvalidCastException e)
        //        {
        //            mCommit = false;
        //        }

        //        if (mCommit) transaction.Complete();
        //    }

        //    return new
        //    {
        //        success = mCommit,
        //    };
        //}

    }
}
