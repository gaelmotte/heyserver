// server.js
const jsonServer = require('json-server')
const securitysetup = require('./securitysetup')
const sfdcoauth = require("./sfdcoauth")
const features = require("./features")


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




server.listen(process.env.PORT || 3000, () => {
  console.log('JSON Server is running on ', process.env.PORT || 3000)
})