// server.js
const jsonServer = require('json-server')
const server = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()

server.use(middlewares)

/*server.use((req, res, next) => {
	if (req.headers.authorization) { 

		let user, password;
		[user, password] = (new Buffer(req.headers.authorization.split(" ")[1], 'base64').toString()).split(":");
		
		if(user === "root" && password === "root"){
			next()
		}else{
			console.log(router.db.users)
			res.sendStatus(401)
		}

	
	} else {
		res.sendStatus(401)
	}
})
*/


server.use(router)
server.listen(process.env.PORT || 3000, () => {
  console.log('JSON Server is running on ', process.env.PORT)
})