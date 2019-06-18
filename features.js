/*this module will describe custom routes or middleware on /api to interract with the salesforce instance */

const randomstring = require('randomstring')
const shortid = require('shortid')


module.exports = function(server, router, ss, oauth){

    server.use("/me",ss.authNMiddleware)
    server.get("/me",function (req,res){
        if(req.administrator){
            res.send({
                "isAdmin":true,
                "username":req.administrator.username,
                "organization_id":null,
                "sfdc_instanceUrl":null
            })
        }else if(req.user || req.organization){
            res.send({
                "isAdmin":false,
                "username":req.user ? req.user.username : null,
                "organization_id":req.organization.id,
                "sfdc_instanceUrl":req.organization.sfdc_instanceUrl
            })
        }else{
            res.sendStatus(401)
        }
    });

        
    server.use("/test",ss.authNMiddleware)
    server.get("/test",function(req,res){
        
        var conn = oauth.getConnection(req.organization);

        conn.identity(function(err, res2) {
            if (err) { return console.error(err); }
            res.send({
                "user_id" : res2.user_id,
                "organization_id" : res2.organization_id,
                "username" : res2.username,
                "display_name" : res2.display_name
            })
        });
    })

    server.use("/installpackage",ss.authNMiddleware)
    server.get("/installpackage", (req,res)=>{

        let a = router.db.get("organization").find({id:req.organization.id}).value()
        a.ncUsername = req.organization.id; 
        a.ncPassword = randomstring.generate(32);
        router.db.get("organization").find({id:req.organization.id}).assign(a).write()

        res.send({
            "ncUsername" : req.organization.ncUsername,
            "ncPassword" : req.organization.ncPassword,
            "redirectTo":req.organization.sfdc_instanceUrl+"/packagingSetupUI/ipLanding.app?apvId="+ process.env.PACKAGE_ID,
        });
    })

    server.use("/work/leads",ss.authNMiddleware)
    server.get("/work/leads",(req,res)=>{
        //send lead to SFDC
        let conn = oauth.getConnection(req.organization);

        conn.apex.get("/hey/api/v1/lead/", function(err, ret) {
            if (err || !ret.success) { 
                return console.error(err, ret); 
                res.sendStatus(500, err)
            }else{
                console.log("call successfull: " + ret);
               
                res.send(ret);
    
            }            
        });
    });

    server.use("/work/lead",ss.authNMiddleware)
    server.post("/work/lead",(req,res)=>{
        //send lead to SFDC
        let conn = oauth.getConnection(req.organization);
        let lead = {
            id : shortid.generate(),
            FirstName : req.body.leadFirstName,
            LastName : req.body.leadLastName,
            Company : req.body.leadCompany,
            Description : req.body.leadDescription        
        };

        console.log(lead)
        conn.sobject("Lead").create({
            FirstName : lead.FirstName,
            LastName : lead.LastName,
            Company : lead.Company,
            Description: lead.Description,
            Hey_Id__c : lead.id
        }, function(err, ret) {
            if (err || !ret.success) { 
                return console.error(err, ret); 
                res.sendStatus(500, err)
            }else{
                console.log("Created record id : " + ret.id);
                lead.sfdcId = ret.id;
                router.db.get("leads").push(lead).write();
    
                res.send(lead);
    
            }            
        });
    });

}