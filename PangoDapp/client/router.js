Router.route("/", function () {
    this.render('WalletBallance');
});

Router.route("home", function () {
    this.render('WalletBallance');
});

Router.route('search', function () {
    this.render('CandidateSearch');
});

Router.route('create', function () {
    this.render('createCertificate');
});

Router.route('change', function () {
    this.render('UpdateCertificate');
});

Router.route('metrics', function () {
    this.render('UsageMetrics');
});

Router.route('faq', function () {
    this.render('faqPage');
});

Router.route('/change/:changeQuery', {
    data: function () {
        let changeQuery = this.params.changeQuery;
        if (changeQuery.substr(0, 2) != "0x") changeQuery = "0x" + changeQuery; // Insert 0x if not supplied
        this.render('UpdateCertificate');
        Meteor.defer(function () {
            $('#updateAddress').val(changeQuery);
            setTimeout(function () {
                $('#updateCertificateForm').submit();
            }, 1000);
        });
    }
});

Router.route('/remove/:removeQuery', {
    data: function () {
        let removeQuery = this.params.removeQuery;
        if (removeQuery.substr(0, 2) != "0x") removeQuery = "0x" + removeQuery; // Insert 0x if not supplied
        this.render('DeleteCertificate');
        Meteor.defer(function () {
            $('#deleteCertificateAddress').val(removeQuery);
        });
    }
});

Router.route('remove', function () {
    this.render('DeleteCertificate');
});

Router.route('/search/:searchType/:searchQuery', {
    data: function () {
        let searchQuery = this.params.searchQuery;
        if (searchQuery.substr(0, 2) != "0x") searchQuery = "0x" + searchQuery; // Insert 0x if not supplied
        let searchType = this.params.searchType;
        let searchResults = [];
        let commonMetaData;
        let commonMetaDataText;
        let idHash;
        switch (searchType) {
            case "cd":
                searchResults = Certificates.find(
                    {idHash: searchQuery},
                    {sort: {timeStamp: -1}}
                ).fetch();
                commonMetaData = searchResults.length;
                commonMetaDataText =
                    "Number of certificates issued to candidate: " + commonMetaData;
                for (result in searchResults) {
                    count = Certificates.find({certificateIssuer: searchResults[result].certificateIssuer}).count();
                    searchResults[result]["issuerMetaData"] = count;
                }
                break;
            case "id":
                Meteor.defer(function () {
                    $('#searchTab a[href="#candidateIdSearch"]').tab('show');
                    $('#searchCandidateIDHash').val(searchQuery);
                });
                searchResults = Certificates.find(
                    {idHash: searchQuery},
                    {sort: {timeStamp: -1}}
                ).fetch();
                commonMetaData = searchResults.length;
                commonMetaDataText =
                    "Number of certificates issued to candidate: " + commonMetaData;
                for (let result in searchResults) {
                    let count = Certificates.find({certificateIssuer: searchResults[result].certificateIssuer}).count();
                    searchResults[result]["issuerMetaData"] = count;
                }
                break;
            case "ca":
                Meteor.defer(function () {
                    $('#searchTab a[href="#certificateAddressSearch"]').tab('show');
                    $('#certificateAddressSearch').val(searchQuery);
                });
                searchResults = Certificates.find(
                    {
                        certificateAddress: searchQuery
                    }
                ).fetch();
                for (let result in searchResults) {
                    let count = Certificates.find({certificateIssuer: searchResults[result].certificateIssuer}).count();
                    searchResults[result]["issuerMetaData"] = count;
                }
                break;
            case "ia":
                Meteor.defer(function () {
                    $('#searchTab a[href="#issuerAddressSearch"]').tab('show');
                    $('#searchCertificateIssuer').val(searchQuery);
                });
                searchResults = Certificates.find(
                    {
                        certificateIssuer: searchQuery
                    },
                    {sort: {timeStamp: -1}}
                ).fetch();
                commonMetaData = searchResults.length;
                commonMetaDataText =
                    "Number of certificates issued by institution: " + commonMetaData;
                break;
            default:
                console.log("other");
        }
        if (searchResults.length == 0 && Session.get("Address") != "0x") {
            sAlert.info("There were no certificates found for your search criteria.")
        }
        Meteor.defer(function () {
            Session.set("certificateSearchResults", searchResults);
            Session.set("commonMetaData", commonMetaData);
            Session.set("commonMetaDataText", commonMetaDataText);
        });
        this.render('CandidateSearch');
    }
});

Router.configure({
    layoutTemplate: 'main',
    notFoundTemplate: 'notFound',
});

