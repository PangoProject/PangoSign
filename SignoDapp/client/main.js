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
    return null;
}

function createCertificate(candidateName, candidateDOB, sundryData, idHash = "") {
    return new Promise((certificateAddress, error) => {
        let hash;
        if (idHash === "") {
            hash =
                "0x" +
                SHA256(
                    candidateName.toString().toLowerCase() +
                    candidateDOB.toString().toLowerCase()
                )
                    .toString()
                    .toLowerCase();

        } else hash = idHash;
        try {
            let certificateContract = web3.eth.contract(ABI_ARRAY);
            let certificate = certificateContract.new(
                hash,
                sundryData,
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
                            certificateAddress(contract.address);
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
    })
        ;
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
            if (mapOfJSON.Name===undefined){
                TemplateVar.set(template,'anonymous',true);
                TemplateVar.set(template,'name',"Anonymous Certificate");
            } else {
                TemplateVar.set(template,'name',mapOfJSON.Name);
            }

            TemplateVar.set(template, "json", res);
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

function JSONToArrayOfObjects(json) {
    if (json === "" || json === undefined) return [];
    let objectArray = [];
    json = json.substr(1, json.length - 2);
    let arrayOfPairs = json.split('","');
    for (let pair in arrayOfPairs) {
        let jsonPair = '{"' + arrayOfPairs[pair] + '"}';
        let dictPair = JSON.parse(jsonPair);
        let key = Object.keys(dictPair)[0];
        let value = dictPair[key];
        elem = {
            uniqid: Random.id(),
            keyValue: key,
            value: value,
            readOnly: "",
            type: "text"
        };
        if ((key == "Name") || (key == "DOB")) {
            elem.readOnly = "readonly";
        }
        if (key == "DOB") elem.type = "date"
        if (pair == 0 && key != "Name") {
            alert("This is an anonymous certificate, so there is no name or DOB loaded. If you enter values here, you will transfer ownership of this certificate unless you enter the same name as before. You can choose to leave them blank and the previous owner will keep ownership.");
            Session.set("updateCheckboxAnonymous", "checked");
            objectArray = [
                {
                    uniqid: "Name",
                    keyValue: "Name",
                    value: "",
                    readOnly: "readonly",
                    type: "text"
                },
                {
                    uniqid: "DOB",
                    keyValue: "DOB",
                    value: "",
                    readOnly: "readonly",
                    type: "date"
                }];
        }

        objectArray.push(elem);
    }
    return objectArray;
}

function isContractAddressValidStr(contractAddres) {
    if (contractAddres.length === 0) return "";
    if (web3.isAddress(contractAddres)) {
        return "has-success";
    }
    return "has-danger";
}

function deleteCertificate(certificateAddress) {
    return new Promise((resolve) => {
        let myContract = getContract(certificateAddress);
        myContract.deleteCertificate(function (err, res) {
            if (!err) resolve(res);
        });
    })
        ;
}

function updateCertificate(oldCertificateAddress, candidateName = "", candidateDOB = "", sundryData = "") {
    return new Promise((result) => {
        myContract = getContract(oldCertificateAddress);
        myContract.idHash((err, res) => {
            if (
                !err
            ) {
                let oldIdHash = res;
                let newIdHash;
                if (candidateName !== "") {
                    newIdHash =
                        "0x" +
                        SHA256(
                            candidateName.toString().toLowerCase() +
                            candidateDOB.toString().toLowerCase()
                        )
                            .toString()
                            .toLowerCase();
                } else newIdHash = oldIdHash;
                if (oldIdHash !== newIdHash) confirm("Are you sure you want to change this certificate, you have changed the owner.");
                createCertificate(null, null, sundryData, newIdHash).then((newCertificateAddress) => {
                        if (newCertificateAddress) {
                            deleteCertificate(oldCertificateAddress).then((resolve) => {
                                    if (resolve) {
                                        console.log("Successfully updated the certificate.");
                                    } else console.log("Failed to delete certificate.")
                                }
                            )
                            ;
                        }
                    }
                )
                ;
            }
            else {
                throw "Something went horribly wrong with updating, please refresh and try again.";
            }
        })
        ;
    })
        ;
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

function arrayToJSON(array) {
    // try {
    let json = "";


    let isAnonymous = _.filter(array, function (x) {
        return x.keyValue == "Anonymous";
    })[0]["value"];

    for (input in array) {
        if (((array[input]["keyValue"] === "Name" || array[input]["keyValue"] === "DOB") && isAnonymous) || array[input]["keyValue"] === "Anonymous" || array[input]["KeyValue"] === "" || array[input]["value"] === "") continue;
        let dictEntry = {};
        dictEntry[array[input]["keyValue"]] = array[input]["value"];
        let newEntry = JSON.stringify(dictEntry).toString();
        json = json + newEntry.substring(1, newEntry.length - 1) + ",";
    }
    return json.substring(0, json.length - 1);
}

function isValidSHAStr(idHash) {
    if (idHash.length === 0) {
        return "";
        //  Check if valid SHA256 hash
    } else if (/[A-Fa-f0-9]{64}/.test(idHash)) {
        return "has-success";
    } else {
        return "has-danger";
    }
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

Template.UpdateCertificateFormChildChild.onCreated(function () {
    let template = Template.instance();
    let json = template.data.json;
    Session.set("inputs", JSONToArrayOfObjects(json));
});

Template.candidateDetailsSearch.onCreated(function(){
    Session.set('searchType', 'candidateNameDOB');
});

Template.candidateIdSearch.onCreated(function(){
    Session.set('searchType', 'candidateIdHash');
});

Template.certificateAddressSearch.onCreated(function(){
    Session.set('searchType', 'certificateAddress');
});

Template.issuerAddressSearch.onCreated(function(){
    Session.set('searchType', 'certificateIssuer');
});

Template.createCertificate.onCreated(function () {

    Session.set("certificatesTemplates", templates);
    defaultInput = _.filter(templates, function (x) {
        return x.id == 0;
    })[0].template;
    Session.set('inputs', defaultInput);
});

Template.candidateDetailsSearch.onRendered(function () {
    $('#searchCandidateDOB').datepicker({
        format: "yyyy-mm-dd",
        endDate: "today",
        startView: 3,
        maxViewMode: 3,
        clearBtn: true,
        autoclose: true,
        defaultViewDate: {year: 1970, month: 0, day: 1}
    });
});

Template.anonymousCertificateIcon.onRendered (function() {
    $('[data-toggle="popover"]').popover();
    $('.popover-dismiss').popover({
        trigger: 'focus'
    })
});

Template.modal.onRendered (function() {
    console.log("render");
    $('#myModal').on('shown.bs.modal', function () {
        $('#myInput').focus()
    });
});

Template.WalletBallance.onRendered(function (){
    try {
        let template = Template.instance();
        web3.eth.getAccounts(function (err, res) {
            if (!err) {
                Address = res[0];
                TemplateVar.set(template, "walletAddress", Address);
                web3.eth.getBalance(Address, function (err, res) {
                    let ethBlance = Math.round(web3.fromWei(res, "ether")*10000)/10000;
                    TemplateVar.set(template, "walletBallance", ethBlance);
                });
                console.log(Certificates.find().fetch());
                numberOfCerts = Certificates.find({certificateIssuer: Address}).count();
                TemplateVar.set(template, "numberOfCerts", numberOfCerts);
            } else {
                console.log("There was an error fetching wallet ballance: " + err);
            }
        });
    } catch (err) {
        console.log("There was an error retrieving web3.")
    }
});

Template.CandidateSearch.onRendered(function () {
    $('#myTab a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });
});

Template.UpdateCertificateFormChild.helpers({
    updateCheckboxAnonymous: function () {
        return Session.get("updateCheckboxAnonymous");
    }
});

Template.UpdateCertificateFormChildChild.helpers({
    inputs: function () {
        return Session.get('inputs'); // reactively watches the Session variable, so when it changes, this result will change and our template will change
    }
});

Template.createCertificate.helpers({
    inputs: function () {
        return Session.get('inputs'); // reactively watches the Session variable, so when it changes, this result will change and our template will change
    },
    certificatesTemplates: function () {
        return Session.get("certificatesTemplates");
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

Template.UpdateCertificateFormChildChild.events({
    'click #add-input': function () {
        var inputs = Session.get('inputs');
        var uniqid = Random.id(); // Give a unique ID so you can pull _this_ input when you click remove
        inputs.push(
            {
                uniqid: uniqid,
                keyValue: "",
                value: ""
            });
        Session.set('inputs', inputs);
    }
});

Template.CandidateSearch.events({
    "click #searchType": function (event) {
        let template = Template.instance();
        Session.set("searchType", event.target.value);
        Session.set("certificateSearchResults", null);
        TemplateVar.set(template, 'valid', "");
    },
    'change #searchCandidateIDHash': function (event) {
        let template = Template.instance();
        let idHash = document.getElementById("searchCandidateIDHash").value;
        TemplateVar.set(template, "valid", isValidSHAStr(idHash));
    },

    "change #searchCertificateIssuer": function () {
        let certificateAddress = document.getElementById("searchCertificateIssuer").value;
        let template = Template.instance();
        TemplateVar.set(template, "valid", isContractAddressValidStr(certificateAddress));
    },
    "change #searchCertificateAddress": function () {
        let certificateAddress = document.getElementById("searchCertificateAddress").value;
        let template = Template.instance();
        TemplateVar.set(template, "valid", isContractAddressValidStr(certificateAddress));
    },

    "submit .candidateSearch": function (event) {
        let searchResults = [];
        let commonMetaData;
        let commonMetaDataText;
        let idHash;
        switch (Session.get("searchType")) {
            case "candidateNameDOB":
                let candidateName = document.getElementById("searchCandidateName").value;
                let candidateDOB = document.getElementById("searchCandidateDOB").value;
                if (candidateDOB !== null && candidateDOB !== undefined && candidateDOB !== "") {
                    var idHashFull =
                        "0x" +
                        SHA256(
                            candidateName.toString().toLowerCase() +
                            candidateDOB.toString().toLowerCase()
                        )
                            .toString()
                            .toLowerCase();
                    searchResults = Certificates.find(
                        {idHash: idHashFull},
                        {sort: {timeStamp: -1}}
                    ).fetch();
                }
                var idHashShort =
                    "0x" +
                    SHA256(
                        candidateName.toString().toLowerCase()
                    )
                        .toString()
                        .toLowerCase();
                searchResults.concat(Certificates.find(
                    {idHash: idHashShort},
                    {sort: {timeStamp: -1}}
                ).fetch());
                commonMetaData = searchResults.length;
                commonMetaDataText =
                    "Number of certificates issued to candidate: " + commonMetaData;
                for (let result in searchResults) {
                    let count = Certificates.find({certificateIssuer: searchResults[result].certificateIssuer}).count();
                    searchResults[result]["issuerMetaData"] = count;
                }
                break;
            case "candidateIdHash":
                idHash = document.getElementById("searchCandidateIDHash").value;
                if (idHash.substr(0, 2) != "0x") idHash = "0x" + idHash;
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
                let certificateAddress = document.getElementById("searchCertificateAddress").value;
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
                let certificateIssuer = document.getElementById("searchCertificateIssuer").value;
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
        event.preventDefault();
    },

    "click #resetSearch": function () {
        Session.set("certificateSearchResults", null);
    }
});

Template.DeleteCertificateForm.events({
    "submit #deleteCertificateForm": function (event) {
        let certificateAddress = event.target.certificateAddress.value;

        try {
            let certificateAddress = event.target.certificateAddress.value;
            let searchResults = Certificates.find(
                {
                    certificateAddress: certificateAddress
                }
            ).fetch();
            if (searchResults.length !== 0) {
                if (searchResults[0].certificateIssuer === Address) {
                    deleteCertificate(certificateAddress);
                } else {
                    alert("You did not create this certificate and thus, cannot delete it.");
                }
            } else {
                alert("No certificates with this address were found.");
            }
        } catch (err) {
            console.log("Failed to delete certificate: " + err);
        }
        event.preventDefault();
    },
    "change #deleteCertificateAddress": function () {
        let certificateAddress = document.getElementById("deleteCertificateAddress").value;
        let template = Template.instance();
        TemplateVar.set(template, "valid", isContractAddressValidStr(certificateAddress));
    }
});

Template.UpdateCertificateForm.events({
    "submit #updateCertificateForm": function (event) {
        try {
            let certificateAddress = event.target.certificateAddress.value;
            let searchResults = Certificates.find(
                {
                    certificateAddress: certificateAddress
                }
            ).fetch();
            if (searchResults.length !== 0) {
                if (searchResults[0].certificateIssuer === Address) {
                    Session.set("updateCertificateSearchResults", searchResults);
                } else {
                    alert("You did not create this certificate and thus, cannot edit it.");
                }
            } else {
                alert("No certificates with this address were found.");
            }
        } catch (err) {
            console.log("Failed to update certificate: " + err);
        }
        event.preventDefault();
    },
    "change #updateCertificateForm": function () {
        let certificateAddress = document.getElementById("updateAddress").value;
        let template = Template.instance();
        TemplateVar.set(template, "valid", isContractAddressValidStr(certificateAddress));
    }
});

Template.UpdateCertificateFormChild.events({
    "click #update": function (event) {
        let template = Template.instance();
        let inputs = Session.get("inputs");
        let elem =
            {
                uniqid: "isAnonymous",
                keyValue: "Anonymous",
                value: document.getElementById("anonymousUpdate").checked,
                readOnly: "readonly",
                type: "checkbox"
            };
        inputs.push(elem);
        let candidateName = _.filter(inputs, function (x) {
            return x.keyValue == "Name";
        })[0].value;
        let candidateDOB = _.filter(inputs, function (x) {
            return x.keyValue == "DOB";
        })[0].value;
        console.log(document.getElementById("anonymousUpdate").checked);
        if ((candidateName === "" || candidateName === undefined) && !document.getElementById("anonymousUpdate").checked) {
            alert("Please enter a name as the certificate is NOT anonymous.")
        } else {
            let json = arrayToJSON(inputs);
            let searchResults = template.data.updateCertificateSearchResults;
            let certificateAddressOld = searchResults[0].certificateAddress;
            updateCertificate(certificateAddressOld, candidateName, candidateDOB, json);

        }
        event.preventDefault();
    }
});

Template.createCertificate.events({
    'click #add-input': function () {
        var inputs = Session.get('inputs');
        var uniqid = Random.id(); // Give a unique ID so you can pull _this_ input when you click remove
        inputs.push(
            {
                uniqid: uniqid,
                keyValue: "",
                value: "",
                readOnly: "",
                type: "text"
            });
        Session.set('inputs', inputs);
    },
    'click #createCertificate': function (event) {
        sundryData = Session.get('inputs');
        candidateName = _.filter(sundryData, function (x) {
            return x.keyValue == "Name";
        })[0]["value"];
        candidateDOB = _.filter(sundryData, function (x) {
            return x.keyValue == "DOB";
        })[0]["value"];
        if (candidateName == "") {
            alert("Please enter at least the name to identify the certificate.")
        } else {
            elem =
                {
                    uniqid: "isAnonymous",
                    keyValue: "Anonymous",
                    value: document.getElementById("anonymousCreate").checked,
                    readOnly: "readonly",
                    type: "checkbox"
                };
            sundryData.push(elem);
            json = arrayToJSON(sundryData);
            createCertificate(candidateName, candidateDOB, json);

            event.preventDefault();
        }
    },
    'change #certificatesTemplates': function (event) {
        inputs = _.filter(Session.get("certificatesTemplates"), function (x) {
            return x.id == event.target.value;
        })[0].template;
        Session.set("inputs", inputs);

    }
});

Template.inputFields.events({
    'click #remove-input': function (event) {
        var uniqid = $(event.currentTarget).attr('uniqid');
        inputs = Session.get('inputs');
        inputs = _.filter(inputs, function (x) {
            return x.uniqid != uniqid;
        });
        Session.set('inputs', inputs);
    },
    'change input': function (event) {
        var $input = $(event.currentTarget);
        var uniqid = $input.attr('uniqid');
        inputs = Session.get('inputs');
        index = inputs.findIndex(function (x) {
            return x.uniqid == uniqid;
        });
        console.log($input.context);
        if ($input.context.name == "inputKey") inputs[index].keyValue = $input.val();
        if ($input.context.name == "inputValue") inputs[index].value = $input.val();
        Session.set('inputs', inputs);
    }
});