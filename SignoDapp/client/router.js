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

// Router.route('/change/:searchQuery', {
//     data: function () {
//         let searchQuery = this.params.searchQuery;
//         console.log(searchQuery);
//         $('#updateAddress').val(searchQuery);
//         this.render('UpdateCertificate');
//     }
// });

// Router.route('/remove/:searchQuery', {
//     data: function() {
//         let searchQuery = this.params.searchQuery;
//         console.log(searchQuery);
//
//
//
//         this.render('DeleteCertificate');
//         $('#deleteCertificateAddress').val("hello");
//         console.log(document.getElementById('deleteCertificateAddress'));
//     }
// });

// Router.route('/remove/:searchType/:searchQuery', {
//     data: function(){
//         this.render('DeleteCertificate');
//     }
// });

Router.configure({
    layoutTemplate: 'main'
});



Router.route('remove', function () {
    this.render('DeleteCertificate');
});

Router.route('/search/:searchType/:searchQuery', {
    data: function(){
        $('#deleteCertificateAddress').val("hello");
        let searchQuery = this.params.searchQuery;
        let searchType = this.params.searchType;
        let searchResults = [];
        let commonMetaData;
        let commonMetaDataText;
        let idHash;
        switch (searchType){
            case "cd":
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
            case "id":
                $('#searchTab a[href="#candidateIdSearch"]').tab('show');
                $('#candidateIdSearch').val(searchQuery);
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
                $('#searchTab a[href="#certificateAddressSearch"]').tab('show');
                $('#certificateAddressSearch').val(searchQuery);
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
                $('#searchTab a[href="#issuerAddressSearch"]').tab('show');
                $('#searchCertificateIssuer').val(searchQuery);
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
        if (searchResults.length == 0 && Session.get("Address")!="0x") {
            sAlert.info("There were no certificates found for your search criteria.")
        }
        Session.set("certificateSearchResults", searchResults);
        Session.set("commonMetaData", commonMetaData);
        Session.set("commonMetaDataText", commonMetaDataText);
        this.render('CandidateSearch');
    }
});

Router.configure({
    layoutTemplate: 'main'
});

