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
    public class VendorMaintController : BaseController
    {
        public dynamic GetList() //, int pfpcid)
        {
            bool mActiveOnly = (ofGetParm("pfactiveonly") == null); // if parameter is pass then show all.

            var ret = from vm in _db.vendors
                      from vc in _db.vendorcontacts.Where(t => t.fvid == vm.fvid)
                      from cc in _db.code_detail.Where(t => t.fgroupid == "CT" && t.fid == vc.ftype)
                      select new
                      {
                          vm.fvid,
                          vm.factive,
                          vm.fname,
                          vm.fcity,
                          vm.fstate,
                          vm.fvtid,
                          cftype = cc.fdescription,
                          vc.fvcid,
                          vc.fphone,
                          vc.fextension,
                          cfname = vc.fname,
                          vc.femail,
                          vc.fdepartment
                      };

            if (mActiveOnly)
                ret = ret.Where(t => t.factive == true);

            return ret.OrderBy(t => t.fname);
        }

        public dynamic GetVendors()
        {
            return  _db.vendors.Where(t => t.factive == true).OrderBy(t => t.fname);
        }

        public dynamic GetVendor()
        {
            int pfvid = int.Parse(ofGetParm("pfvid")); // Get Parameter

            var mVc = from vc in _db.vendorcontacts.Where(t => t.fvid == pfvid)
                      from cc in _db.code_detail.Where(t => t.fgroupid == "CT" && t.fid == vc.ftype)
                      select new
                      {
                          vc.fvid,
                          vc.fvcid,
                          vc.ftype,
                          vc.fname,
                          vc.fphone,
                          vc.fextension,
                          vc.femail,
                          vc.fdepartment,
                          cftype = cc.fdescription
                      };

            var mIv = from iv in _db.itemvendors.Where(t => t.fvid == pfvid)
                      from iu in _db.itemunits.Where(t => t.fitem == iv.fitem)
                      from im in _db.itemmasters.Where(t => t.fimid == iv.fimid)
                      select new {
                          iv.fitem,
                          iv.fimid,
                          iv.fvid,
                          iv.fdescription,
                          iv.fvitem,
                          iv.flastprice,
                          cfdescription = im.fdescription + " " + iu.fuomdescription
                      };

            return new
            {
                vendors = _db.vendors.Where(t => t.fvid == pfvid),
                vendorcontacts = mVc,
                itemvendors = mIv
            };
        }

        // Get vendorcontacts
        public dynamic GetContacts(int pfvid)
        {
            return _db.vendorcontacts.Where(t => t.fvid == pfvid);
        }

        public dynamic GetVendorItem(string pfitem, int pfvid)
        {
            return _db.itemvendors.Where(t => t.fitem == pfitem && t.fvid == pfvid);
        }

        // Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        public dynamic Postupdate(JArray pPostedData)
        {
            bool mCommit = true;
            var serializer = new JsonSerializer();

            var vendorssinsert = new List<vendor>();
            var vendorsupdate = new List<vendor>();

            var vendorcontactsinsert = new List<vendorcontact>();
            var vendorcontactsupdate = new List<vendorcontact>();
            var vendorcontactsdelete = new List<vendorcontact>();

            var itemvendorsinsert = new List<itemvendor>();
            var itemvendorsupdate = new List<itemvendor>();
            var itemvendorsdelete = new List<itemvendor>();

            ofPopulateModel(pPostedData, vendorssinsert, "vendorinsert", "ServerData.vendor, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, vendorsupdate, "vendorupdate", "ServerData.vendor, ServerData", serializer); // Fill Updates

            ofPopulateModel(pPostedData, vendorcontactsinsert, "vendorcontactinsert", "ServerData.vendorcontact, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, vendorcontactsupdate, "vendorcontactupdate", "ServerData.vendorcontact, ServerData", serializer); // Fill Updates
            ofPopulateModel(pPostedData, vendorcontactsdelete, "vendorcontactdelete", "ServerData.vendorcontact, ServerData", serializer); // Fill Deletes

            ofPopulateModel(pPostedData, itemvendorsinsert, "itemvendorinsert", "ServerData.itemvendor, ServerData", serializer); // Fill Inserts
            ofPopulateModel(pPostedData, itemvendorsupdate, "itemvendorupdate", "ServerData.itemvendor, ServerData", serializer); // Fill Updates
            ofPopulateModel(pPostedData, itemvendorsdelete, "itemvendordelete", "ServerData.itemvendor, ServerData", serializer); // Fill Deletes

            // Update using transaction
            using (TransactionScope transaction = new TransactionScope())
            {
                try
                {
                    // Header
                    ofDBSave(vendorssinsert, _db.vendors, "I"); // Insert
                    ofDBSave(vendorsupdate, _db.vendors, "U"); // Update

                    // Details
                    foreach (vendorcontact sc in vendorcontactsdelete) _db.vendorcontacts.Remove(_db.vendorcontacts.Find(sc.fvid, sc.fvcid));
                    ofDBSave(vendorcontactsinsert, _db.vendorcontacts, "I"); // Insert
                    ofDBSave(vendorcontactsupdate, _db.vendorcontacts, "U"); // Update

                    // Details
                    foreach (itemvendor sc in itemvendorsdelete) _db.itemvendors.Remove(_db.itemvendors.Find(sc.fitem, sc.fvid));
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

    }
}
