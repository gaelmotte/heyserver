const jsforce = require('jsforce')
const randomstring = require('randomstring')

module.exports = function(server, router, ss){



    let oauth2 = new jsforce.OAuth2({
        // you can change loginUrl to connect to sandbox or prerelease env.
        // loginUrl : 'https://test.salesforce.com',
        clientId : process.env.OAUTH_CLIENTID,
        clientSecret : process.env.OAUTH_CLIENTSECRET,
        redirectUri : process.env.APP_DOMAIN+'/oauth2/callback'
    });

    let getConnection = function(organization){
        var conn = new jsforce.Connection({
            oauth2 ,
            instanceUrl : organization.sfdc_instanceUrl,
            accessToken : organization.sfdc_accessToken,
            refreshToken : organization.sfdc_refreshToken
        });
        conn.on("refresh", function(accessToken, res) {
            // Refresh event will be fired when renewed access token
            // to store it in your storage for next request
            console.log("refresh access token", accessToken);
            let a = router.db.get("organization").find({id:req.organization.id}).value();
            a.accessToken = accessToken;
            router.db.get("organization").find({id:req.organization.id}).assign(a).write()
        });

        return conn
    }


    
    server.use("/oauth2/auth",ss.authNMiddleware)
    server.use("/test",ss.authNMiddleware)



    server.get('/oauth2/auth', function(req, res) {

        let state = randomstring.generate()

        let a = router.db.get("organization").find({id:req.organization.id}).value()
        a.sfdc_oauthState = state;
        router.db.get("organization").find({id:req.organization.id}).assign(a).write()

        res.send({
            "organization_id" : req.organization.id,
            "redirectTo":oauth2.getAuthorizationUrl({ scope : 'api' })+"&state="+state,
        });
    });

    //
    // Pass received authorization code and get access token
    //
    server.get('/oauth2/callback', function(req, res) {
    var conn = new jsforce.Connection({ oauth2 : oauth2 });
    var code = req.query.code;
    var state = req.query.state;
    console.log(state)

    conn.authorize(code, function(err, userInfo) {
        if (err) { return console.error(err); }
        // Now you can get the access token, refresh token, and instance URL information.
        // Save them to establish connection next time.	
        console.log("registering a SFDC instance for org ")
        let a = router.db.get("organization").find({"sfdc_oauthState":state}).value()
        console.log("organizaiton to update", a)
        if(a){
            delete a.sfdc_oauthState
            a.sfdc_instanceUrl = conn.instanceUrl
            a.sfdc_refreshToken = conn.refreshToken
            a.sfdc_accessToken = conn.accessToken
            router.db.get("organization").find({"sfdc_oauthState":state}).assign(a).write()
            
            console.log("User ID: " + userInfo.id);
            console.log("Org ID: " + userInfo.organizationId);
            // ...
            res.redirect("/"); // or your desired response
        }else{
            res.status(500).send("COULDN'T FIND ORG WITH SUCH STATE")
        }

    });
    });

    server.get("/test",function(req,res){
        
        var conn = getConnection(req.organization);

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

    

    return {
        getConnection
    }
      
}