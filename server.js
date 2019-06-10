// server.js
const jsonServer = require('json-server')
const securitysetup = require('./securitysetup')
const jsforce = require('jsforce')
const randomstring = require('randomstring')

console.log(process.env)

const server = jsonServer.create()
const middlewares = jsonServer.defaults()
const router = jsonServer.router({
	"organization":[
		{
			"id":"org0",
			"orgName":"StartUp0"
			//SFDC related info goes here
		},
		{
			"id":"org1",
			"orgName":"StartUp1"
			//SFDC related info goes here
		}
	],
	"user":[
		{
			"id":"sample",
			"username":"user0",
			"password":"user0",
			"organizationId":0
		}
	],
	"administrator":[
		{
			"id":"root",
			"username":process.env.ADMIN_USERNAME,
			"password":process.env.ADMIN_PASSWORD
		}
	],
	"leads":[
		/*{
			"id":0,
			"organizationId":0,
			"name":"lead0"
		},
		{
			"id":1,
			"organizationId":1,
			"name":"lead1"
		}*/
	],
	"opportunities":[],
	"events":[]
})



server.use(middlewares)
server.use(jsonServer.bodyParser)
securitysetup(server,router)
server.use("/api",router)




var oauth2 = new jsforce.OAuth2({
  // you can change loginUrl to connect to sandbox or prerelease env.
  // loginUrl : 'https://test.salesforce.com',
  clientId : process.env.OAUTH_CLIENTID,
  clientSecret : process.env.OAUTH_CLIENTSECRET,
  redirectUri : process.env.APP_DOMAIN+'/oauth2/callback'
});






/* AuthN middleware */
let authNMiddleware = (req, res, next) => {
	console.log("middleware called", req.headers.authorization, router.db.get("administrator").value())
	if (req.headers.authorization) { 


		let username, password;
		[username, password] = (new Buffer(req.headers.authorization.split(" ")[1], 'base64').toString()).split(":");
		let administrator = router.db.get("administrator").value().filter( u => u.username === username && u.password === password)[0];
		console.log(username, password)
		if(administrator){
			req.administrator = administrator
			console.log("acting as aadministrator", administrator)
			next()
		}else{
			console.log(router.db.get("user").value())
			let user = router.db.get("user").value().filter( u => u.username === username && u.password === password)[0];
			if(user){
				req.user = user
				console.log("acting as user", user)
				let organization = router.db.get("organization").value().filter( o => o.id === user.organizationId)[0];
				if(organization){
					req.organization = organization;
					next()
				}else{
					res.status(401).send("No Org found four this user ?!")
				}
			}else{
				res.sendStatus(401)
			}
		}
	} else {
		res.sendStatus(401)
	}
}

server.use("/me",authNMiddleware)
server.use("/oauth2/auth",authNMiddleware)
server.use("/test",authNMiddleware)



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
  var code = req.params.code;
  var state = req.params.state;
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
	let organization = router.db.get("organization").find({"id": req.organization.id}).value();
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

server.get("/me",function (req,res){
	if(req.administrator){
		res.send({
			"isAdmin":true,
			"username":req.administrator.username,
			"organization_id":null,
			"sfdc_instanceUrl":null
		})
	}else if(req.user){
		res.send({
			"isAdmin":false,
			"username":req.user.username,
			"organization_id":req.organization.id,
			"sfdc_instanceUrl":req.organization.sfdc_instanceUrl
		})
	}else{
		res.sendStatus(401)
	}
});

server.get("/raw/:r",(req,res)=>{
	res.send(router.db.get(req.params.r).value());
})

server.get("/edit/:r/:id",(req,res)=>{

	let a = router.db.get(req.params.r).find({id:req.params.id}).value()
	a.somethind = "lol";
	router.db.get(req.params.r).find({id:req.params.id}).assign(a).write()
	
	res.send(router.db.get(req.params.r).value());
})

server.listen(process.env.PORT || 3000, () => {
  console.log('JSON Server is running on ', process.env.PORT || 3000)
})