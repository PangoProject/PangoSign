Router.route('/', function () {
    this.render('WalletBallance');
});

Router.route('WalletBallance', function () {
    this.render('WalletBallance');
});

Router.route('CandidateSearch', function () {
    this.render('CandidateSearch');
});

Router.route('createCertificate', function () {
    this.render('createCertificate');
});

Router.route('DeleteCertificate', function () {
    this.render('DeleteCertificate');
});

Router.route('UpdateCertificate', function () {
    this.render('UpdateCertificate');
});

// Router.route('/', function () {
//     this.render('main');
// });

Router.configure({
    layoutTemplate: 'main'
});

