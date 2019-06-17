module.exports = function(server, router){
    
    /* AuthN middleware */
    let authNMiddleware = (req, res, next) => {
        console.log("AuthN middleware called")
        if (req.headers.authorization) { 

            console.log("AuthN middleware called with authorisation header", req.headers.authorization)
            let username, password;
            [username, password] = (new Buffer(req.headers.authorization.split(" ")[1], 'base64').toString()).split(":");
            let administrator = router.db.get("administrator").value().filter( u => u.username === username && u.password === password)[0];

            if(administrator){
                req.administrator = administrator
                console.log("acting as aadministrator", administrator)
                next()
            }else{
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
                    let nc = router.db.get("organization").value().filter( u => u.ncUsername === username && u.ncPassword === password)[0];
                    if(nc){
                        req.nc = nc
                        console.log("acting as nc", nc)
                        let organization = nc;
                        req.organization = organization;
                        next()

                    }else{
                        res.sendStatus(401)
                    }
                }
            }
        } else {
            res.sendStatus(401)
        }
    }

    

    function secureDirectRoute(resource){
        return function (req, res, next) {

            if(req.administrator){ //administrators shouldn't be restricted
                next()
            }else if(req.user || req.organization){ //both should be present

                //force appending organizationId
                req.body.organizationId = req.organization.id
                let elem = router.db.get(resource).filter({"id":parseInt(req.params.id)}).nth(0).value();

                if(elem && resource !== "organization" && elem.organizationId === req.organization.id){
                    next()
                }else if(elem && resource === "organization" && elem.id === req.organization.id){
                    next()
                }else{
                    res.sendStatus(403)
                }
            }else{
                res.status(403).send("SOMETHING WRONG. a 401 should have been sent already");
            }
        }
    }  

    function secureSearchRoute(resource){
        return function (req, res, next) {

            if(req.administrator){ //administrators shouldn't be restricted
                next()
            }else if(req.user || req.organization){ //both should be present

                
                if(req.params.oid && req.params.oid != req.organization.id){
                    res.sendStatus(403);
                }else{
                    if(resource != "organization"){
                        req.query.organizationId = ""+req.organization.id
                    }else{
                        req.query.id = ""+req.organization.id
                    }
                    next()
                }
            }else{
                res.status(403).send("SOMETHING WRONG. a 401 should have been sent already");
            }
        }
    }  

    
    server.use("/api/*",authNMiddleware);

    server.get("/api/organization",secureSearchRoute("organization"))
    server.get("/api/leads",secureSearchRoute("leads"))
    server.get("/api/opportunities",secureSearchRoute("opportunities"))
    server.get("/api/events",secureSearchRoute("events"))

    server.get("/api/organization/:oid/leads",secureSearchRoute("leads"))
    server.get("/api/organization/:oid/opportunities",secureSearchRoute("opportunities"))
    server.get("/api/organization/:oid/events",secureSearchRoute("events"))


    server.all("/api/organization/:id", secureDirectRoute("organization"));

    server.all("/api/leads/:id", secureDirectRoute("leads"));
    server.all("/api/opportunities/:id", secureDirectRoute("opportunities"));
    server.all("/api/events/:id", secureDirectRoute("events"));

    server.all("/api/organization/:oid/leads/:id", secureDirectRoute("leads"));
    server.all("/api/organization/:oid/opportunities/:id", secureDirectRoute("opportunities"));
    server.all("/api/organization/:oid/events/:id", secureDirectRoute("events"));

    return{
        authNMiddleware
    }

}

