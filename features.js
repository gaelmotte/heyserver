/*this module will describe custom routes or middleware on /api to interract with the salesforce instance */

const randomstring = require('randomstring')
const shortid = require('shortid')


module.exports = function (server, router, ss, oauth) {

  server.use("/me", ss.authNMiddleware)
  server.get("/me", function (req, res) {
    if (req.administrator) {
      res.send({
        "isAdmin": true,
        "username": req.administrator.username,
        "organization_id": null,
        "sfdc_instanceUrl": null
      })
    } else if (req.user || req.organization) {
      res.send({
        "isAdmin": false,
        "username": req.user ? req.user.username : null,
        "organization_id": req.organization.id,
        "sfdc_instanceUrl": req.organization.sfdc_instanceUrl
      })
    } else {
      res.sendStatus(401)
    }
  });

  server.use("/testback", ss.authNMiddleware)
  server.get("/testback", function (req, res) {
    res.send(req.organization.validateState);
  });

  server.use("/test", ss.authNMiddleware)
  server.get("/test", function (req, res) {
    var conn = oauth.getConnection(req.organization);
    try {
      conn.identity(function (err, ret) {
        if (err) {
          console.error(err);
          res.status(500).send(err)
        } else {
          //call rest endpoint to make sure reciprocal calls do work
          //generate temp state for echo service
          let a = router.db.get("organization").find({ "id": req.organization.id }).value();
          a.validateState = randomstring.generate();
          //store in db
          router.db.get("organization").find({ "id": req.organization.id }).assign(a).write();

          let result = {
            "user_id": ret.user_id,
            "organization_id": ret.organization_id,
            "username": ret.username,
            "display_name": ret.display_name
          }

          //call testback
          conn.apex.get("/hey/api/v1/test/", function (err2, ret2) {
            if (err) {
              console.error(err2, ret2);
              res.sendStatus(500, err2)
            } else {
              console.log("call successfull: ", ret2);
              //check for errors found at apex side :
              // - NamedCredNotFound ?
              // - Unauthorized ?

              if (ret2.error == "APPEXCHANGE_NOT_INSTALLED") {
                result.error = ret2.err
              } else if (ret2.error == "NAMED_CREDENTIALS_UNAUTHORIZED") {
                result.error = ret2.err
              } else if (ret2.error) {
                result.error = "UNKNOWN_ERROR"
              } else {
                if (result.validateState == a.validateState) {
                  //validation passes
                  delete a.validateState;
                  router.db.get("organization").find({ "id": req.organization.id }).assign(a).write();

                } else {
                  //validaiton fails ?? We are not refering to the correct org
                  result.error = "WRONG_ORG"
                }
              }
            }
            res.send(result);
          });
        }
      });

    } catch (e) {
      res.status(500).send(e);
    }
  })

  server.use("/installpackage", ss.authNMiddleware)
  server.get("/installpackage", (req, res) => {

    let a = router.db.get("organization").find({ id: req.organization.id }).value()
    a.ncUsername = req.organization.id;
    a.ncPassword = randomstring.generate(32);
    router.db.get("organization").find({ id: req.organization.id }).assign(a).write()

    res.send({
      "ncUsername": req.organization.ncUsername,
      "ncPassword": req.organization.ncPassword,
      "redirectTo": req.organization.sfdc_instanceUrl + "/packagingSetupUI/ipLanding.app?apvId=" + process.env.PACKAGE_ID,
    });
  })

  server.use("/work/leads", ss.authNMiddleware)
  server.get("/work/leads", (req, res) => {
    //send lead to SFDC
    let conn = oauth.getConnection(req.organization);
    try {
      conn.apex.get("/hey/api/v1/lead/", function (err, ret) {
        if (err) {
          console.error(err, ret);
          res.sendStatus(500, err)
        } else {
          console.log("call successfull: " + ret);

          res.send(ret);

        }
      });
    } catch (e) {
      res.status(500).send(e);
    }
  });

  server.use("/work/lead", ss.authNMiddleware)
  server.post("/work/lead", (req, res) => {
    //send lead to SFDC
    let conn = oauth.getConnection(req.organization);
    let lead = {
      id: shortid.generate(),
      FirstName: req.body.leadFirstName,
      LastName: req.body.leadLastName,
      Company: req.body.leadCompany,
      Description: req.body.leadDescription
    };

    console.log(lead)
    try {
      conn.sobject("Lead").create({
        FirstName: lead.FirstName,
        LastName: lead.LastName,
        Company: lead.Company,
        Description: lead.Description,
        Hey_Id__c: lead.id
      }, function (err, ret) {
        if (err || !ret.success) {
          console.error(err, ret);
          res.sendStatus(500, err)
        } else {
          console.log("Created record id : " + ret.id);
          lead.sfdcId = ret.id;
          router.db.get("leads").push(lead).write();

          res.send(lead);

        }
      });
    } catch (e) {
      res.status(500).send(e);
    }

  });

}