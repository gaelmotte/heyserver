// server.js
const jsonServer = require('json-server')
const securitysetup = require('./securitysetup')
const jsforce = require('jsforce')
const randomstring = require('randomstring')

const server = jsonServer.create()
const middlewares = jsonServer.defaults()
const router = jsonServer.router({
	"organization":[
		{
			"id":0,
			"orgName":"StartUp0"
			//SFDC related info goes here
		},
		{
			"id":1,
			"orgName":"StartUp1"
			//SFDC related info goes here
		}
	],
	"user":[
		{
			"id":0,
			"username":"user0",
			"password":"user0",
			"organizationId":0
		}
	],
	"administrator":[
		{
			"id":0,
			"username":"root",
			"password":"root"
		}
	],
	"leads":[
		{
			"id":0,
			"organizationId":0,
			"name":"lead0"
		},
		{
			"id":1,
			"organizationId":1,
			"name":"lead1"
		}
	],
	"opportunities":[],
	"events":[]
})



server.use(middlewares)
server.use(jsonServer.bodyParser)
securitysetup(server,router)
server.use("/api",router)





/*
var SFOauth = {
	instanceUrl : 'https://heydemo-dev-ed.lightning.force.com',
  accessToken : null,//'<your Salesforrce OAuth2 access token is here>',
  refreshToken : null//'<your Salesforce OAuth2 refresh token is here>'
}
*/

var oauth2 = new jsforce.OAuth2({
  // you can change loginUrl to connect to sandbox or prerelease env.
  // loginUrl : 'https://test.salesforce.com',
  clientId : '3MVG9sSN_PMn8tjS0IuFk19MciwVF6rNaUEpyDYe3KFZ.YpXdjaArA7FXKRKhB2WOgw2MRcqFV2UDpv5P9RAA',
  clientSecret : '9C872D467C33CF51CC2C6A761E37C4E95DA9F9253E9A1C39E2FDCC719E38A36A',
  redirectUri : 'https://heyserver-stg.herokuapp.com/oauth2/callback'
});

/*
var conn = new jsforce.Connection({
  oauth2 ,
  instanceUrl : SFOauth.instanceUrl,
  accessToken : SFOauth.accessToken,
  refreshToken : SFOauth.refreshToken
});
conn.on("refresh", function(accessToken, res) {
  // Refresh event will be fired when renewed access token
  // to store it in your storage for next request
  console.log("refresh access token", accessToken);
  SFOauth.accessToken = accessToken;
});
*/

server.get('/oauth2/auth/:oid', function(req, res) {
	let state = randomstring.generate()
	console.log(router.db.get("organization").filter({id: parseInt(req.params.oid)}).nth(0).assign({sfdc_oauthState:state}).write())
	res.redirect(oauth2.getAuthorizationUrl({ scope : 'api' })+"&state="+state);
});

//
// Pass received authorization code and get access token
//
server.get('/oauth2/callback', function(req, res) {
  var conn = new jsforce.Connection({ oauth2 : oauth2 });
  var code = req.param('code');
  var state = req.param("state")
  console.log(state)

  conn.authorize(code, function(err, userInfo) {
    if (err) { return console.error(err); }
    // Now you can get the access token, refresh token, and instance URL information.
    // Save them to establish connection next time.	
	router.db.get("organization").filter({sfdc_oauthState:state}).nth(0).assign({
		sfdc_instanceUrl : conn.instanceUrl,
		sfdc_refreshToken : conn.refreshToken,
		sfdc_accessToken: conn.accessToken
	}).write()

    console.log("User ID: " + userInfo.id);
    console.log("Org ID: " + userInfo.organizationId);
    // ...
    res.send('success'); // or your desired response
  });
});

server.get("/test/:oid",function(req,res){
	let organization = router.db.get("organization").filter({id: req.params.oid}).nth(0).value();
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
		router.db.get("organization").filter({id: req.params.oid}).nth(0).assign({sfdc_accessToken:accessToken}).write()
	  });

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



server.listen(process.env.PORT || 3000, () => {
  console.log('JSON Server is running on ', process.env.PORT || 3000)
})