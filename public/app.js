/* this file handles client side behavior

*/

let appState = {}

$(function () {

  /* Log-in */
  $("#loginForm").submit(function (event) {
    event.preventDefault();
    let form = $(this);


    //get credentials
    let username = $("#username_input").val()
    let password = $("#password_input").val()

    //XHR call /me
    $.ajax({
      url: form.attr('action'),
      method: form.attr('method'),
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Authorization", "Basic " + btoa(username + ":" + password));
      }
    }).done(data => {
      console.log(data)
      appState.userData = data;
      appState.authHeader = "Basic " + btoa(username + ":" + password)
      let fields = $("#userInfo dd");
      fields[0].innerHTML = data.username;
      fields[1].innerHTML = data.isAdmin;
      fields[2].innerHTML = data.organization_id;
      fields[3].innerHTML = data.sfdc_instanceUrl;
      $("#userInfo").toggleClass("slds-hide");
      $("#loginForm").toggleClass("slds-hide");

      // show related features
      if (data.isAdmin) {
        $(".adminFeature").toggleClass("slds-hide")
      } else {
        $(".userFeature").toggleClass("slds-hide")
      }
    })

  })

  /* log-out */
  $("#logoutButton").click(function (event) {
    delete appState.userData;
    //hide Features
    $(".adminFeature").addClass("slds-hide");

    //show login form
    $("#userInfo").toggleClass("slds-hide");
    $("#loginForm").toggleClass("slds-hide");

    //reset forms
    //TODO

  })

  /* Provision new Org */
  $("#newOrgForm").submit(function (event) {
    event.preventDefault();
    let form = $(this);
    console.log("serialiazed form", form.serialize())
    $.ajax({
      url: form.attr('action'),
      method: form.attr('method'),
      dataType: 'json',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Authorization", appState.authHeader);
      },
      data: form.serialize()
    }).done(data => {
      console.log(data)
      form.find(".output").text(JSON.stringify(data));

      // Provision default user
      $.ajax({
        url: "/api/organization/" + data.id + "/user",
        method: form.attr('method'),
        dataType: 'json',
        beforeSend: function (xhr) {
          xhr.setRequestHeader("Authorization", appState.authHeader);
        },
        data: {
          "username": data.orgName,
          "password": "default"
        }
      }).done(data => {
        console.log(data)
        form.find(".output").text(form.find(".output").text() + JSON.stringify(data));
      });
    });

  })


  /* login to Salesforce Org */
  $("#sfdcLoginForm").submit(function (event) {
    event.preventDefault();
    let form = $(this);

    $.ajax({
      url: form.attr('action'),
      method: form.attr('method'),
      dataType: 'json',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Authorization", appState.authHeader);
      },
      data: form.serialize()
    }).done(data => {
      console.log(data)
      form.find(".output").text(JSON.stringify(data));

      // redirect to salesforce oauth page
      window.setTimeout(() => window.location.replace(data.redirectTo), 1000)
    });

  })

  /* Install package in Salesforce */
  $("#sfdcInstallForm").submit(function (event) {
    event.preventDefault();
    let form = $(this);

    $.ajax({
      url: form.attr('action'),
      method: form.attr('method'),
      dataType: 'json',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Authorization", appState.authHeader);
      },
      data: form.serialize()
    }).done(data => {
      console.log(data)
      form.find(".output").html("<p>Use these credentials when installing the package</p>" +
        "<dl class=\"slds-dl_horizontal\">" +
        "<dt class=\"slds-dl_horizontal__label\">Username:</dt>" +
        "<dd class=\"slds-dl_horizontal__detail\">" + data.ncUsername + "</dd>" +
        "<dt class=\"slds-dl_horizontal__label\">Password :</dt>" +
        "<dd class=\"slds-dl_horizontal__detail\">" + data.ncPassword + "</dd> " +
        "</dl>" +
        "<p>You will soon be redirected to the install page</p>");

      // redirect to salesforce oauth page
      window.setTimeout(() => window.open(data.redirectTo), 2000)
    });
  })

  /* login to Salesforce Org */
  $("#testsfdcForm").submit(function (event) {
    event.preventDefault();
    let form = $(this);

    $.ajax({
      url: form.attr('action'),
      method: form.attr('method'),
      dataType: 'json',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Authorization", appState.authHeader);
      },
      data: form.serialize()
    }).done(data => {
      console.log(data)


      if (!data.error) {
        form.find(".output").text("Connection works just fine");
      } else {
        if (data.error == "APPEXCHANGE_NOT_INSTALLED") {
          form.find(".output").text("A new tab will prompt you to install the package in your org in a couple seconds");
          window.setTimeout(() => window.open(data.packageInstallURL), 2000)
        }else if(data.error == "NAMED_CREDENTIALS_UNAUTHORIZED") {
          form.find(".output").text("A new tab will prompt you to modify a Named Credential. User = " + data.ncUsername + " Password = "+ data.ncPassword );
          window.setTimeout(() => window.open(data.changeNamedCredURL), 2000)
        }else{
          form.find(".output").text("un Unknwon error occured");
        }
      }
    });

  })

  /* get leads */
  $("#leadsForm").submit(function (event) {
    event.preventDefault();
    let form = $(this);

    $.ajax({
      url: form.attr('action'),
      method: form.attr('method'),
      dataType: 'json',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Authorization", appState.authHeader);
      },
      data: form.serialize()
    }).done(data => {
      console.log(data)
      form.find(".output").text(JSON.stringify(data));

    }).fail(data => {
      console.log(data)
      form.find(".output").text(JSON.stringify(data));
    });


  });

  /* New lead */
  $("#newLead").submit(function (event) {
    event.preventDefault();
    let form = $(this);

    $.ajax({
      url: form.attr('action'),
      method: form.attr('method'),
      dataType: 'json',
      beforeSend: function (xhr) {
        xhr.setRequestHeader("Authorization", appState.authHeader);
      },
      data: form.serialize()
    }).done(data => {
      console.log(data)
      form.find(".output").text(JSON.stringify(data));

    }).fail(data => {
      console.log(data)
      form.find(".output").text(JSON.stringify(data));
    });


  });
});