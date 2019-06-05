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
server.use((req, res, next) => {
	if (req.headers.authorization) { 

		let username, password;
		[username, password] = (new Buffer(req.headers.authorization.split(" ")[1], 'base64').toString()).split(":");
		let administrator = router.db.get("administrators").value().filter( u => u.username === username && u.password === password)[0];

		if(administrator){
			req.administrator = administrator
			next()
		}else{
			let customer = router.db.get("customers").value().filter( u => u.username === username && u.password === password)[0];
			if(customer){
				req.customer = customer
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
server.use((req, res, next) => {
	if(!req.customer){
		next()
	}else{

		if(req.method === "GET"){//add a filter in get queries
			console.log("query : ",req.query)
			req.query.customer_id = ""+req.customer.id

			console.log("query : ",req.query)
			next()

		}else if (req.method === "POST"){//

			//force appending customer_id
			req.body.customer_id = req.customer.id

			next()

		}else{
			//prevent access if not owned by correct customer
			//done in the following lines
			next()
		}
	}
});

function secureRoute(resource){

	return function (req, res, next) {

		let elem = router.db.get(resource).filter({"id":parseInt(req.params.id)}).nth(0).value();
	  if(elem && elem.customer_id === req.customer.id){
			next()
	  }else{
	  	res.sendStatus(403)
	  }
	};
}

server.patch("/api/leads/:id", secureRoute("leads"));
server.patch("/api/opportunities/:id", secureRoute("opportunities"));
server.patch("/api/events/:id", secureRoute("events"));

server.put("/api/leads/:id", secureRoute("leads"));
server.put("/api/opportunities/:id", secureRoute("opportunities"));
server.put("/api/events/:id", secureRoute("events"));

server.delete("/api/leads/:id", secureRoute("leads"));
server.delete("/api/opportunities/:id", secureRoute("opportunities"));
server.delete("/api/events/:id", secureRoute("events"));

server.use("/api/",router)



server.listen(process.env.PORT || 3000, () => {
  console.log('JSON Server is running on ', process.env.PORT || 3000)
})