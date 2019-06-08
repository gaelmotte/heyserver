// server.js
const jsonServer = require('json-server')
const server = jsonServer.create()
const middlewares = jsonServer.defaults()
const router = jsonServer.router({
	"customers":[
		{
			"id":0,
			"username":"cust0",
			"password":"cust0"
		}
	],
	"administrators":[
		{
			"id":0,
			"username":"root",
			"password":"root"
		}
	],
	"leads":[
		{
			"id":0,
			"customer_id":0,
			"name":"lead0"
		},
		{
			"id":1,
			"customer_id":1,
			"name":"lead1"
		}
	],
	"opportunities":[],
	"events":[]
})



server.use(middlewares)

server.use(jsonServer.bodyParser)


/* AuthN middleware */
server.use("/api/*",(req, res, next) => {
	if (req.headers.authorization) { 


		let username, password;
		[username, password] = (new Buffer(req.headers.authorization.split(" ")[1], 'base64').toString()).split(":");
		let administrator = router.db.get("administrators").value().filter( u => u.username === username && u.password === password)[0];

		if(administrator){
			req.administrator = administrator
			console.log("acting as aadministrator", administrator)
			next()
		}else{
			let customer = router.db.get("customers").value().filter( u => u.username === username && u.password === password)[0];
			if(customer){
				req.customer = customer
				console.log("acting as customer", customer)
				next()
			}else{
				res.sendStatus(401)
			}
		}
	} else {
		res.sendStatus(401)
	}
})

/* AuthZ middleware */
server.use("/api/*",(req, res, next) => {
	if(!req.customer){
		next()
	}else{


		
		if(req.method === "GET"){//add a filter in get queries
			console.log("query : ",req.query)
			req.query.customer_id = ""+req.customer.id

			console.log("query : ",req.query)
			next()

		}else{//prevent access if not owned by correct customer

			//force appending customer_id
			req.body.customer_id = req.customer.id

			next()

		}
	}
});

function secureRoute(resource){
	return function (req, res, next) {
		console.log("secrutity Middleware executed")
		let elem = router.db.get(resource).filter({"id":parseInt(req.params.id)}).nth(0).value();
		if(elem && elem.customer_id === req.customer.id){
			next()
		}else{
			res.sendStatus(403)
		}
	}
}      

server.all("/api/leads/:id", secureRoute("leads"));
server.all("/api/opportunities/:id", secureRoute("opportunities"));
server.all("/api/events/:id", secureRoute("events"));



server.use("/api",router)



var jsforce = require('jsforce');


var SFOauth = {
	instanceUrl : 'https://heydemo-dev-ed.lightning.force.com',
  accessToken : null,//'<your Salesforrce OAuth2 access token is here>',
  refreshToken : null//'<your Salesforce OAuth2 refresh token is here>'
}

var oauth2 = new jsforce.OAuth2({
  // you can change loginUrl to connect to sandbox or prerelease env.
  // loginUrl : 'https://test.salesforce.com',
  clientId : '3MVG9sSN_PMn8tjS0IuFk19MciwVF6rNaUEpyDYe3KFZ.YpXdjaArA7FXKRKhB2WOgw2MRcqFV2UDpv5P9RAA',
  clientSecret : '9C872D467C33CF51CC2C6A761E37C4E95DA9F9253E9A1C39E2FDCC719E38A36A',
  redirectUri : 'https://heyserver-stg.herokuapp.com/oauth2/callback'
});


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

server.get('/oauth2/auth', function(req, res) {
  res.redirect(oauth2.getAuthorizationUrl({ scope : 'api' }));
});

//
// Pass received authorization code and get access token
//
server.get('/oauth2/callback', function(req, res) {
  var conn = new jsforce.Connection({ oauth2 : oauth2 });
  var code = req.param('code');
  conn.authorize(code, function(err, userInfo) {
    if (err) { return console.error(err); }
    // Now you can get the access token, refresh token, and instance URL information.
    // Save them to establish connection next time.
    console.log(conn.accessToken);
    SFOauth.accessToken = conn.accessToken;
    console.log(conn.refreshToken);
    SFOauth.refreshToken = conn.refreshToken;
    console.log(conn.instanceUrl);
    SFOauth.instanceUrl = conn.instanceUrl;
    console.log("User ID: " + userInfo.id);
    console.log("Org ID: " + userInfo.organizationId);
    // ...
    res.send('success'); // or your desired response
  });
});



server.listen(process.env.PORT || 3000, () => {
  console.log('JSON Server is running on ', process.env.PORT || 3000)
})