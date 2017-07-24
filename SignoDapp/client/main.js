import {Template} from "meteor/templating";
import {Session} from "meteor/session";
import "./main.html";

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

let Address;

Certificates = new Mongo.Collection("certificates");
try {
    Meteor.subscribe('theCertificates');
}
catch (err) {
    console.log("Could not connect to DB: " + err);
}

function getContract(certificateAddress) {
    try {
        return web3.eth.contract(ABI_ARRAY).at(certificateAddress);
    }
    catch (err) {
        console.log(err);
    }
}

function createContract(candidateName, candidateDOB, sundryData) {
    // Meteor.call('insertCertificate', (err, res) => {
    //     if (!err) console.log(res);
    // });
    const hash =
        "0x" +
        SHA256(
            candidateName.toString().toLowerCase() +
            candidateDOB.toString().toLowerCase()
        )
            .toString()
            .toLowerCase();
    const sundry = sundryData;
    try {
        let certificateContract = web3.eth.contract(ABI_ARRAY);
        let certificate = certificateContract.new(
            hash,
            sundry,
            {
                from: Address,
                data: BYTE_CODE,
                gas: "4000000"
            },
            function (e, contract) {
                console.log(e, contract);
                if (typeof contract.address !== "undefined") {
                    console.log(
                        "Contract mined! address: " +
                        contract.address +
                        " transactionHash: " +
                        contract.transactionHash
                    );
                    try {
                        Meteor.call('insertCertificate', contract.address);
                    }
                    catch (err) {
                        console.log("DB Connection failed: " + err);
                    }
                }
            }
        );
    }
    catch (err) {
        console.log("There was an error creating your certificate: " + err);
    }
}

function getCertificateFromBlockchain(certificateAddress, template) {
    try {
        //So that certificates aren't shown when the db loads before the blockchain query returns
        TemplateVar.set(template, "isDeleted", true);
        let myContract = getContract(certificateAddress);

        TemplateVar.set(template, "certificateAddress", certificateAddress);

        myContract.idHash(function (err, res) {
            TemplateVar.set(template, "idHash", res);
        });
        myContract.certificateIssuer(function (err, res) {
            TemplateVar.set(template, "certificateIssuer", res);
        });
        myContract.sundryData(function (err, res) {
            let mapOfJSON = JSONToMap(res);
            TemplateVar.set(template, "sundryData", mapOfJSON);
        });
        myContract.isDeleted(function (err, res) {
            TemplateVar.set(template, "isDeleted", res);
        });

    }
    catch (err) {
        console.log("Unable to retrieve certificate from Blockchain: " + err);
    }
}

function deleteCertificate(certificateAddress) {
    let myContract = getContract(certificateAddress);
    myContract.deleteCertificate(function (err, res) {
        console.log(err);
        if (!err) console.log("Certificate Successfully deleted " + res);
    });
}

Template.registerHelper("objectToPairs", function (object) {
    return _.map(object, function (value, key) {
        return {
            key: key,
            value: value
        };
    });
});

Template.registerHelper("compare", function (v1, v2) {
    if (typeof v1 === "object" && typeof v2 === "object") {
        return _.isEqual(v1, v2);
    } else {
        return v1 === v2;
    }
});

Template.registerHelper("formatDate", function (date) {
    const timeStamp = new Date(date * 1000);
    return moment(timeStamp).format("YYYY-MM-DD");
});

Template.CandidateSearch.onCreated(function () {
    Session.set("certificateSearchResults", null);
    Session.set("searchType", "candidateNameDOB");
    Session.set("commonMetaData", null);
});

Template.ChildCertificate.onCreated(function () {
    let template = Template.instance();
    let address = template.data.resultCertificateAddress;
    TemplateVar.set(template, "issuerMetaData", template.data.issuerMetaData);
    getCertificateFromBlockchain(address, template);
});

Template.UpdateCertificateFormChild.onCreated(function () {
    let template = Template.instance();
    let searchResults = template.data.updateCertificateSearchResults;
    let address = searchResults[0].certificateAddress;

    getCertificateFromBlockchain(address, template);
});

Template.WalletBallance.helpers({
    getEthBallance: function () {
        try {
            let template = Template.instance();
            web3.eth.getAccounts(function (err, res) {
                if (!err) {
                    Address = res[0];
                    TemplateVar.set(template, "walletAddress", Address);
                    web3.eth.getBalance(Address, function (err, res) {
                        let ethBlance = web3.fromWei(res, "ether");
                        TemplateVar.set(template, "walletBallance", ethBlance);
                    });
                } else {
                    console.log("There was an error fetching wallet ballance: " + err);
                }
            });
        } catch (err) {
            console.log("There was an error retrieving web3.")
        }
    }
});

Template.CandidateSearch.helpers({
    searchResults: function () {
        return Session.get("certificateSearchResults");
    },
    commonMetaData: function () {
        return Session.get("commonMetaData");
    },
    commonMetaDataText: function () {
        return Session.get("commonMetaDataText");
    },
    searchType: function () {
        return Session.get("searchType");
    },
    issuerMetaData: function () {
        return Session.get("issuerMetaData");
    }
});

Template.ChildCertificate.helpers({
    sundryData: function () {
        return _.map(this.Address, function (value, key) {
            return {
                key: key,
                value: value
            };
        });
    }
});

Template.UpdateCertificateForm.helpers({
    updateCertificateSearchResults: function () {
        return Session.get("updateCertificateSearchResults");
    }
});

Template.CandidateSearch.events({
    "click .searchType": function (event) {
        Session.set("searchType", event.target.value);
        Session.set("certificateSearchResults", null);
    },

    "submit .candidateSearch": function (event) {
        let template = Template.instance();

        let searchResults;
        let commonMetaData;
        let commonMetaDataText;
        let idHash;
        switch (Session.get("searchType")) {
            case "candidateNameDOB":
                let candidateName = event.target.candidateName.value;
                let candidateDOB = event.target.candidateDOB.value;
                idHash =
                    "0x" +
                    SHA256(
                        candidateName.toString().toLowerCase() +
                        candidateDOB.toString().toLowerCase()
                    )
                        .toString()
                        .toLowerCase();
                searchResults = Certificates.find(
                    {idHash: idHash},
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
            case "candidateIdHash":
                idHash = event.target.idHash.value;
                searchResults = Certificates.find(
                    {idHash: idHash},
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
            case "certificateAddress":
                let certificateAddress = event.target.certificateAddress.value;
                searchResults = Certificates.find(
                    {
                        certificateAddress: certificateAddress
                    }
                ).fetch();
                for (let result in searchResults) {
                    let count = Certificates.find({certificateIssuer: searchResults[result].certificateIssuer}).count();
                    searchResults[result]["issuerMetaData"] = count;
                }
                break;
            case "certificateIssuer":
                let certificateIssuer = event.target.certificateIssuer.value.toLowerCase();
                searchResults = Certificates.find(
                    {
                        certificateIssuer: certificateIssuer
                    },
                    {sort: {timeStamp: -1}}
                ).fetch();
                commonMetaData = searchResults.length;
                commonMetaDataText =
                    "Number of certificates issued by institution: " + commonMetaData;
                break;

        }
        Session.set("certificateSearchResults", searchResults);
        Session.set("commonMetaData", commonMetaData);
        Session.set("commonMetaDataText", commonMetaDataText);
        return false;
    },

    "click .resetSearch": function () {
        Session.set("certificateSearchResults", null);
    }
});

Template.CreateNewCertificateForm.events({
    "submit .newCertificateForm": function (event) {
        let candidateName = event.target.Name.value;
        let candidateDOB = event.target.DOB.value;
        if (candidateName !== "" && candidateName !== undefined) {
            let elements = document.getElementById("newCertificateForm").elements;
            let json = elementToJSON(elements);
            createContract(candidateName, candidateDOB, json);
        } else {
            alert("Please enter a name.")
        }
        return false;
    }
});

function elementToJSON(elements) {
    try {
        let json = "";
        for (let element in elements) {
            if (elements[element].value !== "" && elements[element].value !== undefined && isNaN(parseInt(element, 10)) && element !== "isAnonymous") {
                if ((element === "name" || element === "DOB") && elements["isAnonymous"].checked === true) continue;
                let dictEntry = {};
                dictEntry[element] = elements[element].value;
                let newEntry = JSON.stringify(dictEntry).toString();

                json = json + newEntry.substring(1, newEntry.length - 1) + ",";
            }
        }
        return json.substring(0, json.length - 1);
    }
    catch (err) {
        console.log("Unable to parse JSON of data: " + err);
    }
}

function JSONToMap(json) {
    if (json === "" || json === undefined) return "";
    let map = new Map();
    json = json.substr(1, json.length - 2);
    let arrayOfPairs = json.split('","');
    for (let pair in arrayOfPairs) {
        let jsonPair = '{"' + arrayOfPairs[pair] + '"}';
        let dictPair = JSON.parse(jsonPair);
        let key = Object.keys(dictPair)[0];
        map[key] = dictPair[key];
    }
    return map;
}

Template.DeleteCertificateForm.events({
    "submit .deleteCertificateForm": function (event) {
        let certificateAddress = event.target.certificateAddress.value;
        deleteCertificate(certificateAddress);
    }
});

Template.UpdateCertificateForm.events({
    "submit .updateCertificateForm": function (event) {
        try {
            let certificateAddress = event.target.certificateAddress.value;
            let searchResults = Certificates.find(
                {
                    certificateAddress: certificateAddress
                }
            ).fetch();
            if (searchResults[0].certificateIssuer === Address) {
                Session.set("updateCertificateSearchResults", searchResults);
            } else {
                alert("You did not create this certificate and thus, cannot edit it.");
            }
        } catch (err) {
            console.log("Failed to update certificate: " + err);
        }
        return false
    }
});

Template.UpdateCertificateFormChild.events({
    "submit .updateCertificateFormChild": function(event){
        let template = Template.instance();
        let candidateName = event.target.Name.value;
        let candidateDOB = event.target.DOB.value;
        if (candidateName !== "" && candidateName !== undefined) {
            let elements = document.getElementById("updateCertificateFormChild").elements;
            let json = elementToJSON(elements);
            createContract(candidateName, candidateDOB, json);
            let searchResults = template.data.updateCertificateSearchResults;
            let certificateAddressOld = searchResults[0].certificateAddress;
            deleteCertificate(certificateAddressOld);
        } else {
            alert("Please enter a name.")
        }
        return false;
    }
})