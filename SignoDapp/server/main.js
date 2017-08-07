import {Meteor} from "meteor/meteor";

var Web3 = require('web3');
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:30305"));

Certificates = new Mongo.Collection('certificates');

CertificatesProducedData = new Mongo.Collection('certificatesProducedData');

CertificatesProducedGraph = new Mongo.Collection('certificatesProducedGraph');

UniqueIssuerData = new Mongo.Collection('uniqueIssuerData');

UniqueIssuerGraph = new Mongo.Collection('uniqueIssuerGraph');

UniqueRecipientData = new Mongo.Collection('uniqueRecipientData');

UniqueRecipientGraph = new Mongo.Collection('uniqueRecipientGraph');

NumberOfPageHits = new Mongo.Collection('numberOfPageHits');

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

const BYTE_CODE = "6060604052341561000f57600080fd5b6040516104b13803806104b1833981016040528080519060200190919080518201919050505b336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550816001816000191690555080600290805190602001906100969291906100ba565b506000600360006101000a81548160ff0219169083151502179055505b505061015f565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106100fb57805160ff1916838001178555610129565b82800160010185558215610129579182015b8281111561012857825182559160200191906001019061010d565b5b509050610136919061013a565b5090565b61015c91905b80821115610158576000816000905550600101610140565b5090565b90565b6103438061016e6000396000f30060606040526000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff168063083dfe681461006a5780635455e36b146100f9578063aa4107321461014e578063afa936b81461017f578063d7efb6b714610194575b600080fd5b341561007557600080fd5b61007d6101c1565b6040518080602001828103825283818151815260200191508051906020019080838360005b838110156100be5780820151818401525b6020810190506100a2565b50505050905090810190601f1680156100eb5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b341561010457600080fd5b61010c61025f565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b341561015957600080fd5b610161610284565b60405180826000191660001916815260200191505060405180910390f35b341561018a57600080fd5b61019261028a565b005b341561019f57600080fd5b6101a7610304565b604051808215151515815260200191505060405180910390f35b60028054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156102575780601f1061022c57610100808354040283529160200191610257565b820191906000526020600020905b81548152906001019060200180831161023a57829003601f168201915b505050505081565b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60015481565b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161415156102e557600080fd5b6001600360006101000a81548160ff0219169083151502179055505b5b565b600360009054906101000a900460ff16815600a165627a7a7230582009e651caf5d336c4233a93f7dbf345b82f62d77489c9a9cf4183f789750aacad0029";

Meteor.setInterval(buildChart, 1000000);

function getContract(certificateAddress) {
    return web3.eth.contract(ABI_ARRAY).at(certificateAddress);
}

function buildChart() {
    console.log("CHART REBUILD STARTED");
    generateCertificatesProducedData();
    generateUniqueIssuerData();
    generateUniqueRecipientData();
    generateDashboardUsageGraph();
}

function getCertificateFromBlockchain(certificateAddress) {
    return new Promise((resolve, error) => {
        let myContract = getContract(certificateAddress);

        let idHash;
        let certificateIssuer;

        //Dear Gods of programming: We are sorry for our sins, but this is a simplistic double-promise
        myContract.idHash(function (err, res) {
            if (!err) {
                idHash = res;
                if (certificateIssuer !== undefined) resolve({
                    idHash: idHash,
                    certificateIssuer: certificateIssuer,
                    certificateAddress: certificateAddress
                });
            } else error(err);
        });
        myContract.certificateIssuer(function (err, res) {
            if (!err) {
                certificateIssuer = res;
                if (idHash !== undefined) resolve({
                    idHash: idHash,
                    certificateIssuer: certificateIssuer,
                    certificateAddress: certificateAddress
                });
            } else error(err);
        });

    });
}

function generateCertificatesProducedData() {
    Certificates.aggregate([
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": {
                            "$add": [
                                new Date(0),
                                {"$multiply": [1000, "$timeStamp"]}
                            ]
                        }
                    }
                },
                "count": {"$sum": 1}
            }
        }, {$sort: {"_id": 1}},
        {$out: "certificatesProducedData"}
    ]);
}

function generateUniqueIssuerData() {
    //First, select the new issuer addresses with their timeStamps. only take the min as this is first
    Certificates.aggregate([
        {
            "$group": {
                "_id": "$certificateIssuer",
                "dateFirstAdded": {$min: "$timeStamp"}
            }
        },
        {$sort: {"dateFirstAdded": 1}},
        {$out: "uniqueIssuerData"}
    ]);
    //second, sum based on days added to generate the graph data
    UniqueIssuerData.aggregate([
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": {
                            "$add": [
                                new Date(0),
                                {"$multiply": [1000, "$dateFirstAdded"]}
                            ]
                        }
                    }
                },
                "count": {"$sum": 1}
            }
        }, {$sort: {"_id": 1}},
        {$out: "uniqueIssuerData"}
    ]);
}

function generateUniqueRecipientData() {
    //First, select the new issuer addresses with their timeStamps. only take the min as this is first
    Certificates.aggregate([
        {
            "$group": {
                "_id": "$idHash",
                "dateFirstAdded": {$min: "$timeStamp"}
            }
        },
        {$sort: {"dateFirstAdded": 1}},
        {$out: "uniqueRecipientData"}
    ]);
    //second, sum based on days added to generate the graph data
    UniqueRecipientData.aggregate([
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": {
                            "$add": [
                                new Date(0),
                                {"$multiply": [1000, "$dateFirstAdded"]}
                            ]
                        }
                    }
                },
                "count": {"$sum": 1}
            }
        }, {$sort: {"_id": 1}},
        {$out: "uniqueRecipientData"}
    ]);
}

function generateDashboardUsageGraph() {
    //First, we pull the required data from the above queries
    let dateLabelsProduced = _.pluck(CertificatesProducedData.find().fetch(), "_id");
    let dateValuesProduced = _.pluck(CertificatesProducedData.find().fetch(), "count");

    let dateLabelsIssuer = _.pluck(UniqueIssuerData.find().fetch(), "_id");
    let dateValuesIssuer = _.pluck(UniqueIssuerData.find().fetch(), "count");

    let dateLabelsRecipient = _.pluck(UniqueRecipientData.find().fetch(), "_id");
    let dateValuesRecipient = _.pluck(UniqueRecipientData.find().fetch(), "count");

    var endDateMilliseconds = +new Date(dateLabelsProduced[dateLabelsProduced.length - 1]);

    var step = 24 * 60 * 60 * 1000; // milliseconds of one day

    var mapProduced = {};
    var mapIssuer = {};
    var mapRecipient = {};

    //the loops for Issuer and Recipient can be included in produced as you will ALWAYS produce a certificate to get an
    // entry into one of the other two collections. However, the inverse is not always true to the !=undefined check
    for (var i in dateLabelsProduced) {
        mapProduced[+new Date(dateLabelsProduced[i])] = {
            "_id": moment.unix((+new Date(dateLabelsProduced[i])) / 1000).format("YYYY/MM/DD"),
            "count": dateValuesProduced[i]
        };
        if (dateLabelsIssuer[i] != undefined) {
            mapIssuer[+new Date(dateLabelsIssuer[i])] = {
                "_id": moment.unix((+new Date(dateLabelsIssuer[i])) / 1000).format("YYYY/MM/DD"),
                "count": dateValuesIssuer[i]
            };
        }
        if (dateLabelsRecipient[i] != undefined) {
            mapRecipient[+new Date(dateLabelsRecipient[i])] = {
                "_id": moment.unix((+new Date(dateLabelsRecipient[i])) / 1000).format("YYYY/MM/DD"),
                "count": dateValuesRecipient[i]
            };
        }
    }

    //x is the number of days for the period; 30 day chart. this checks if the map is missing the associated day.
    // if so, fill it in
    for (let ms = endDateMilliseconds, x = 1; x < 90; x++) {
        if (!( ms in mapProduced )) {
            mapProduced[ms] = {"_id": moment.unix((+new Date(ms)) / 1000).format("YYYY/MM/DD"), "count": 0};
        }
        if (!( ms in mapIssuer )) {
            mapIssuer[ms] = {"_id": moment.unix((+new Date(ms)) / 1000).format("YYYY/MM/DD"), "count": 0};
        }
        if (!( ms in mapRecipient )) {
            mapRecipient[ms] = {"_id": moment.unix((+new Date(ms)) / 1000).format("YYYY/MM/DD"), "count": 0};
        }
        ms -= step; //Decrement by 1 day
    }

    //last step is to write this to the collection for the client.
    //As this code rebuilds the entire set from scratch, we first need to drop the tables
    CertificatesProducedGraph.remove({});
    UniqueRecipientGraph.remove({});
    UniqueIssuerGraph.remove({});

    //write the approprate values into the collections

    var finalResultProduced = [];
    var finalResultIssuer = [];
    var finalResultRecipient = [];

    //as it stands, I dont know how to write the map to a collection. we go via an array!
    for (var x in mapProduced) {
        finalResultProduced.push(mapProduced[x]);
        finalResultIssuer.push(mapIssuer[x]);
        finalResultRecipient.push(mapRecipient[x]);
    }
        //as we are using a batch insert command, we don't need to iterate through the ordered list at this point
    CertificatesProducedGraph.batchInsert(finalResultProduced);
    UniqueIssuerGraph.batchInsert(finalResultIssuer);
    UniqueRecipientGraph.batchInsert(finalResultRecipient);
    // console.log(CertificatesProducedGraph.find().fetch());
    console.log("CHART REBUILD DONE");
}

Meteor.startup(() => {
});

Meteor.publish('theCertificates', function () {
    return Certificates.find();
});

Meteor.publish('certificatesProducedGraph', function () {
    return CertificatesProducedGraph.find();
});

Meteor.publish('uniqueIssuerGraph', function () {
    return UniqueIssuerGraph.find();
});

Meteor.publish('uniqueRecipientGraph', function () {
    return UniqueRecipientGraph.find();
});

Meteor.methods({
    'insertCertificate': function (certificateAddress) {
        if (BYTE_CODE.includes(web3.eth.getCode(certificateAddress).substr(2))) {
            let timeStamp = Date.now() / 1000;
            getCertificateFromBlockchain(certificateAddress).then((res, err) => {
                    if (!err) {
                        Certificates.insert({
                            idHash: res["idHash"],
                            certificateIssuer: res["certificateIssuer"],
                            certificateAddress: certificateAddress,
                            timeStamp: timeStamp
                        });
                        console.log("Entry successfully added to DB");
                        contractCreationStatus = "Entry " + certificateAddress + " successfully added to db";
                    }
                }
            );
        } else {
            console.log("Byte Codes Don't Match, it looks like you are doing something fishy");
        }
    },
    'pageLoadCount': function (clientInfomation) {
        console.log(clientInfomation);
        console.log(this.connection.clientAddress);
        // buildChart();
    }
});

// Meteor.users.find({ "status.online": true }).observe({
//     added: function(id) {
//         console.log("new User!");
//     },
//     removed: function(id) {
//         console.log("User left");
//     }
// });