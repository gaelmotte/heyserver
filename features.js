/*this module will describe custom routes or middleware on /api to interract with the salesforce instance */

module.exports = function(server, router, ss, oauth){
    server.use("/test",ss.authNMiddleware)
    
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
}