import { Meteor } from 'meteor/meteor';
Certificates = new Mongo.Collection('certificates');

const ABI_ARRAY = [{
    "constant": true,
    "inputs": [],
    "name": "sundryData",
    "outputs": [{"name": "", "type": "string"}],
    "payable": false,
    "type": "function"
}, {
    "constant": true,
    "inputs": [],
    "name": "certificateIssuer",
    "outputs": [{"name": "", "type": "address"}],
    "payable": false,
    "type": "function"
}, {
    "constant": true,
    "inputs": [],
    "name": "idHash",
    "outputs": [{"name": "", "type": "bytes32"}],
    "payable": false,
    "type": "function"
}, {
    "constant": false,
    "inputs": [],
    "name": "deleteCertificate",
    "outputs": [],
    "payable": false,
    "type": "function"
}, {
    "constant": true,
    "inputs": [],
    "name": "isDeleted",
    "outputs": [{"name": "", "type": "bool"}],
    "payable": false,
    "type": "function"
}, {
    "inputs": [{"name": "hash", "type": "bytes32"}, {"name": "sundry", "type": "string"}],
    "payable": false,
    "type": "constructor"
}];

function getContract(certificateAddress) {
    return web3.eth.contract(ABI_ARRAY).at(certificateAddress);
}

Meteor.startup(() => {
  // code to run on server at startup
});

Meteor.publish('theCertificates', function () {
    return Certificates.find();
});

Meteor.methods({'insertCertificate': function (certificateAddress) {
    if (typeof web3 !== 'undefined') {
       console.log("there is no web3")
    } else {
        // set the provider you want from Web3.providers
        console.log("we Win")
    }
    let timeStamp = Date.now() / 1000;
    getCertificateFromBlockchain(certificateAddress);

    // Certificates.insert({
    //     idHash: idHash,
    //     certificateIssuer: certificateIssuer,
    //     certificateAddress: certificateAddress,
    //     timeStamp: timeStamp
    // });
}
});

function getCertificateFromBlockchain(certificateAddress) {
    console.log(certificateAddress);
    let myContract = getContract(certificateAddress);
    let idHash;
    let certificateIssuer;
    let sundryData;
    let error;

    myContract.idHash(function (err, res) {
       idHash = res;
    });
    myContract.certificateIssuer(function (err, res) {
        certificateIssuer = res;
    });
    myContract.sundryData(function (err, res) {
        sundryData = res;
        error = err;
    });
    console.log(idHash)
    //return {idHash:idHash, certificateIssuer:certificateIssuer, sundryData:sundryData, certificateAddress, error:error};
}