// 2014/09/25 PostCreateReport modified to return reportname (filename) created on server. It no longer waits for report to be physically generated
// 2014/07/16 ofGetnextsequence remove 2nd parameter since should always save nextseq
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using pcdr.Controllers;
using ServerData;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Objects;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Transactions;
using System.Web;
using System.Web.Hosting;
using System.Web.Http;
using System.Xml;

namespace pcdr.Controllers
{
    public class CompanyController : BaseController
    {
        //public dynamic Getclockstatus()
        //{
        //    _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'
        //    int pid = int.Parse(ofGetParm("fuid")); // Get Parameter

        //    var ret = _db.employeehours.Where(t => t.empid == pid && t.punchin != null && t.punchout == null);

        //    string mInOut = (ret.Count() > 0) ? "I" : "O";

        //    return new
        //    {
        //        success = true,
        //        data = mInOut
        //    };
        //}

        //public dynamic GetClockinout()
        //{
        //    _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'
        //    int pid = int.Parse(ofGetParm("fuid")); // Get Parameter
        //    string mInOut;

        //    var ret = _db.employeehours.Where(t => t.empid == pid && t.punchin != null && t.punchout == null);
        //    if (ret.Count() > 0)
        //    {
        //        // Clock Out
        //        ret.FirstOrDefault().punchout = DateTime.Now;
        //        ret.FirstOrDefault().totaltime = ret.FirstOrDefault().punchout - ret.FirstOrDefault().punchin; // Get total hours
        //        mInOut = "O";
        //    }
        //    else
        //    {
        //        // Clock In
        //        var mRec = new employeehour();
        //        mRec.empid = pid;
        //        mRec.fbranch = ofGetParm("fbranch");
        //        mRec.punchin = DateTime.Now;
        //        mRec.ehid = ofGetnextsequence("employeehours", true);
        //        _db.employeehours.Add(mRec);
        //        mInOut = "I";
        //    }

        //    _db.SaveChanges();

        //    return new
        //    {
        //        success = true,
        //        data = mInOut
        //    };
        //}

        public dynamic GetCompanyName()
        {
            _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

            return _db.companies.FirstOrDefault().fname;
        }

        public dynamic Getcodedetail()
        {
            return _db.code_detail;
        }

        //// Get specific fgroupid Value
        //public dynamic Getcodedetail(string pfgroupid)
        //{
        //    var result = from cd in _db.code_detail.Where(t => t.FGROUPID == pfgroupid)
        //                 select new
        //                 {
        //                     fid = cd.FID,
        //                     description = cd.FDESCRIPTION,
        //                     cd.forder,
        //                     cd.fopt1
        //                 };

        //    return result;
        //}

        //public dynamic Getcode_master()
        //{
        //    _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

        //    return _db.code_master;
        //}

        //public dynamic Getcode_detail()
        //{
        //    _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

        //    return _db.code_detail;
        //}

        public dynamic Getnextsequence()
        {
            _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

            var httpContext = (HttpContextWrapper)Request.Properties["MS_HttpContext"];
            var sid = httpContext.Request.Params["seq"]; // Get Parameter

            int mNext = ofGetnextsequence(sid);

            return new
            {
                success = true,
                data = mNext
                //data = rec.flastval
            };
        }

        // Local function to Get Next Sequence
        public int ofGetnextsequence(string pTableName)
        {
            // Get last value, increment and save
            var rec = _db.master_sequence.Where(t => t.ftable == pTableName).FirstOrDefault();
            rec.flastval = rec.flastval + 1; // Increment
            _db.SaveChanges(); // Update changes
            return (int)rec.flastval;
        }

        //public dynamic Gettaxrate()
        //{
        //    return _db.taxrates;
        //}

        //// Update in transaction manner TOPDOWN(insert/update), BOTTOMUP(delete)
        //public dynamic Postupdatecodemaster(JArray pPostedData)
        //{
        //    bool mCommit = true;
        //    _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

        //    var serializer = new JsonSerializer();

        //    var code_mastersinsert = new List<code_master>();
        //    var code_mastersupdate = new List<code_master>();
        //    var code_mastersdelete = new List<code_master>();
        //    var code_detailsinsert = new List<code_detail>();
        //    var code_detailsupdate = new List<code_detail>();
        //    var code_detailsdelete = new List<code_detail>();

        //    // Master
        //    ofPopulateModel(pPostedData, code_mastersinsert, "code_masterinsert", "ServerData.code_master, ServerData", serializer); // Fill Inserts
        //    ofPopulateModel(pPostedData, code_mastersupdate, "code_masterupdate", "ServerData.code_master, ServerData", serializer); // Fill Update
        //    ofPopulateModel(pPostedData, code_mastersdelete, "code_masterdelete", "ServerData.code_master, ServerData", serializer); // Fill Deletes
        //    // Detail
        //    ofPopulateModel(pPostedData, code_detailsinsert, "code_detailinsert", "ServerData.code_detail, ServerData", serializer); // Fill Inserts
        //    ofPopulateModel(pPostedData, code_detailsupdate, "code_detailupdate", "ServerData.code_detail, ServerData", serializer); // Fill Update
        //    ofPopulateModel(pPostedData, code_detailsdelete, "code_detaildelete", "ServerData.code_detail, ServerData", serializer); // Fill Deletes

        //    // Update using transaction
        //    using (TransactionScope transaction = new TransactionScope())
        //    {
        //        try
        //        {
        //            // TOPDOWN insert,update
        //            ofDBSave(code_mastersinsert, _db.code_master, "I"); // Insert
        //            ofDBSave(code_mastersupdate, _db.code_master, "U"); // Update

        //            ofDBSave(code_detailsinsert, _db.code_detail, "I"); // Insert
        //            ofDBSave(code_detailsupdate, _db.code_detail, "U"); // Update

        //            // BOTTOMUP delete
        //            foreach (code_detail sc in code_detailsdelete) _db.code_detail.Remove(_db.code_detail.Find(sc.FGROUPID, sc.FID));
        //            foreach (code_master sc in code_mastersdelete) _db.code_master.Remove(_db.code_master.Find(sc.FGROUPID));
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
        //        success = mCommit
        //    };

        //}

        // PowerBuilder Report
        public dynamic PostCreateReport(JArray pPostedData)
        {
            bool mCommit = true;
            _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

            var serializer = new JsonSerializer();

            var reportheadersinsert = new List<reportheader>();
            var reportparametersinsert = new List<reportparameter>();

            // Master
            ofPopulateModel(pPostedData, reportheadersinsert, "reportheaders", "ServerData.reportheader, ServerData", serializer); // Fill Inserts
            // Detail
            ofPopulateModel(pPostedData, reportparametersinsert, "reportparameters", "ServerData.reportparameter, ServerData", serializer); // Fill Inserts
            // Assign id
            int mNextSeq = ofGetnextsequence("reportheader"); // Get next sequence
            reportheadersinsert.First().frptid = mNextSeq;
            foreach (reportparameter rp in reportparametersinsert) rp.frptid = mNextSeq;

            var mfdwname = reportheadersinsert.First().fdwname;

            // Update using transaction
            using (TransactionScope transaction = new TransactionScope())
            {
                try
                {
                    // TOPDOWN insert,update
                    ofDBSave(reportheadersinsert, _db.reportheaders, "I"); // Insert
                    ofDBSave(reportparametersinsert, _db.reportparameters, "I"); // Insert
                    _db.SaveChanges();
                }
                catch (InvalidCastException e)
                {
                    mCommit = false;
                }

                if (mCommit) transaction.Complete();
            }

            //reportresult mRptResult;
            string mFilenameurl = "";

            //// Wait for the report to be generated
            //while (true)
            //{
            //    mRptResult = _db.reportresults.Where(p => p.frptid == mNextSeq).FirstOrDefault();
            //    if (mRptResult != null)
            //    {
            //        // Remove Entry and return filename
            //        mFilenameurl = mRptResult.ffilename;
            //        _db.reportresults.Remove(mRptResult);
            //        _db.SaveChanges();
            //        break;
            //    }
            //    Thread.Sleep(500); // Wait for a 1/2 second
            //}


            //// Loop till the physical file exists to prevent 404 file not found
            ////Thread.Sleep(500); // Wait for a 1/2 second to make sure file gets created
            string mReportfilename = mfdwname + "-" + mNextSeq.ToString() + ".pdf";
            //while (true)
            //{
            //    if (File.Exists(HostingEnvironment.MapPath("~/reports/" + mReportfilename)))
            //    {
            //        break;
            //    }
            //    Thread.Sleep(500); // Wait for a 1/2 second
            //}

            mFilenameurl = "reports/" + mReportfilename;

            return new
            {
                data = mFilenameurl,
                ffilename = mReportfilename
            };

        }

        // Jasper Report
        public dynamic PostCreateJasperReport()
        {
            _db.Configuration.LazyLoadingEnabled = false; // prevents getting 'include'

            // Assign id
            int mNextSeq = ofGetnextsequence("reportheader"); // Get next sequence
            string mReportfilename = "report-" + mNextSeq.ToString() + ".pdf"; // Crate unique filename
            string mFilewithpath = HostingEnvironment.MapPath("~/reports/" + mReportfilename); // Create logical file path
            string mrpt = ofGetParm("rptname");
            // TODO: userid & password
            string sTargetURL = _db.companies.FirstOrDefault().freportserver + ofGetParm("rptname") + "?" + ofGetParm("rptparm") + "&j_username=jasperadmin&j_password=jasperadmin"; // Create url
            //"http://localhost:8080/jasperserver/rest_v2/reports/reports/Daily_Transactions.pdf?pdatef=2014-01-01&pdatet=2014-01-17&pfbranch=SA&pwherebranch=AND expcertheaders.fbranch='SA'&j_username=jasperadmin&j_password=jasperadmin";

            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(sTargetURL);
            HttpWebResponse HttpWResp = (HttpWebResponse)req.GetResponse();

            //Stream fStream = HttpWResp.GetResponseStream();
            //HttpWResp.Close();

            // Save Returned report to local disk - Give 'Write' premission to 'C:\inetpub\wwwroot\xxx\reports' folder for user 'DefaultAppPool'
            using (var stream = File.Create(mFilewithpath))
                HttpWResp.GetResponseStream().CopyTo(stream);

            return new
            {
                data = "reports/" + mReportfilename,
                ffilename = mReportfilename
            };

        }
        
    }
}
