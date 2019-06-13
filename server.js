// server.js
const jsonServer = require('json-server')
const securitysetup = require('./securitysetup')
const sfdcoauth = require("./sfdcoauth")
const features = require("./features")
const OAuthServer = require("express-oauth-server")
const oauthmodel = require('./model.js');


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
let ss = securitysetup(server,router)

let oauth = sfdcoauth(server,router,ss)

let f = features(server, router, ss, oauth)

server.use("/api",router)


server.oauth = OAuthServer({
	model: oauthmodel
  });

server.all('/oauth/token', obtainToken);

app.get('/someendpoint', authenticateRequest, function(req, res) {

	res.send({"someData":"someValue"});
});

function obtainToken(req, res) {

	var request = new Request(req);
	var response = new Response(res);

	return app.oauth.token(request, response)
		.then(function(token) {

			res.json(token);
		}).catch(function(err) {

			res.status(err.code || 500).json(err);
		});
}

function authenticateRequest(req, res, next) {

	var request = new Request(req);
	var response = new Response(res);

	return app.oauth.authenticate(request, response)
		.then(function(token) {

			next();
		}).catch(function(err) {

			res.status(err.code || 500).json(err);
		});
}


server.listen(process.env.PORT || 3000, () => {
  console.log('JSON Server is running on ', process.env.PORT || 3000)
})