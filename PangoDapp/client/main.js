import {Template} from "meteor/templating";
import {Session} from "meteor/session";
import {Chart} from "chart.js";

import "./main.html";
import "./templates.html";
import "./router.js";


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

// global client variables
let Address;
//The Mongo Collections
Certificates = new Mongo.Collection("certificates");    //The Certificate Index
CertificatesProducedGraph = new Mongo.Collection("certificatesProducedGraph");  //Graph of certificates produced
UniqueIssuerGraph = new Mongo.Collection("uniqueIssuerGraph");  //Graph of unique issuers
UniqueRecipientGraph = new Mongo.Collection("uniqueRecipientGraph");    //Graph of recipients
CertificateTemplates = new Mongo.Collection("certificateTemplates");    //Templates for creating new certificates

Meteor.startup(function () {
    //Set the neccicary variables to be null, empty or 0. Otherwise there can be errors with cookies
    Session.set("updateCertificateSearchResults", null);
    Session.set("accountLocked", false);
    Session.set("Address", "0x");
    Session.set("walletBallance", 0);
    Session.set("numberOfCerts", 0);
    Session.set("showDeletedCertificate", false);

    //Subscribe to the neccicary DBs
    try {
        Meteor.subscribe('theCertificates');
    }
    catch (err) {
        $('#catastrophicError').modal('show');
    }
    //Configure alert packages system wide
    sAlert.config({
        effect: 'flip',
        position: 'bottom',
        timeout: 8000,
        html: true,
        onRouteClose: true,
        stack: true,
        offset: 0,
        beep: false,
        onClose: _.noop
    });

});

function getContract(certificateAddress) {
    //This function returns a web3 contract for later processing.
    try {
        return web3.eth.contract(ABI_ARRAY).at(certificateAddress);
    }
    catch (err) {
        $('#catastrophicError').modal('show');
    }
    return null;
}

function getNetwork(networkId) {
    //This fucntion returns the Ethereum network to which the user is connected.
    switch (networkId) {
        case '1':
            return 'Mainnet';
        case '2':
            return 'Morden';
        case '3':
            return 'Ropsten';
        case '4':
            return 'Rinkeby';
        case '42':
            return 'Kovan';
        default:
            return 'Unknown';
    }
}

function createCertificate(candidateName, candidateDOB, sundryData, idHash = "") {
    //This function creates a new certificate and returns whether or not creation was sucessful via a promise
    return new Promise((resolve, error) => {
        let hash;
        //If an idHash was not passed to the function, create one for the user
        if (idHash === "") {
            hash =
                web3.sha3(
                    candidateName.toString().toLowerCase() +
                    candidateDOB.toString().toLowerCase()
                )
                    .toString()
                    .toLowerCase();

        } else hash = idHash;
        try {
            let certificateContract = web3.eth.contract(ABI_ARRAY); //Create a new, empty contract object
            let certificate = certificateContract.new(
                hash,
                sundryData,
                {
                    from: Address,
                    data: BYTE_CODE,
                    gas: "4000000"
                },
                //Result of contract creation is a callback function
                function (e, contract) {
                    try {
                        //must be contract.address as when function is called initially, it returns a null and later return another contract.
                        if (typeof contract.address !== "undefined") {
                            try {
                                // Request that the server adds the new certificate to the DB on its side
                                Meteor.call('insertCertificate', contract.address);
                                resolve({address: contract.address, txHash: contract.transactionHash});
                            }
                            catch (err) {
                                sAlert.error("Failed to add the certificate to the DB.");
                                error(err);
                            }
                        }
                    } catch (e2) {
                        //The user cancels the transaction in their web3 client
                        $("#reminderToWaitForMining").modal("hide");
                        sAlert.error("It looks like you cancelled the transaction!");
                        error("Error");
                    }
                    if (e) {
                        //Something is thrown while trying to mine the certificate
                        $("#reminderToWaitForMining").modal("hide");
                        sAlert.error("Oh-No! The certificate could not to be mined.");
                        error("Error");
                    }
                }
            );
        }
        catch (err) {
            sAlert.error("Failed to create the certificate.");
            error(err);
        }
    });
}

function getCertificateFromBlockchain(certificateAddress, template) {
    //This pulls a certificate from the blockChain and pushes it to template vars. It should probably be converted into 2 separate functions at some point.
    try {
        //So that certificates aren't shown when the db loads before the blockchain query returns
        TemplateVar.set(template, "isDeleted", true);
        let myContract = getContract(certificateAddress);
        //Populate the variables we know already
        TemplateVar.set(template, "certificateAddress", certificateAddress);
        //Populate the rest of the variables with db results
        myContract.idHash(function (err, res) {
            TemplateVar.set(template, "idHash", res);
        });
        myContract.certificateIssuer(function (err, res) {
            TemplateVar.set(template, "certificateIssuer", res);
        });
        myContract.isDeleted(function (err, res) {
            TemplateVar.set(template, "isDeleted", res);
        });
        myContract.sundryData(function (err, res) {
            //Convert Sundry Data fom JSON on blockhain to a map for populating templates later
            let mapOfJSON = JSONToMap(res);
            //Handle anonymous certificates
            if (mapOfJSON.Name === undefined) {
                TemplateVar.set(template, 'anonymous', true);
                TemplateVar.set(template, 'name', "Anonymous Certificate");
            } else {
                TemplateVar.set(template, 'name', mapOfJSON.Name);
            }
            //If there is a image, populate the template var.
            if (mapOfJSON.logoURL !== undefined) {
                TemplateVar.set(template, "logoURL", mapOfJSON.logoURL);
                delete mapOfJSON.logoURL;
            }
            TemplateVar.set(template, "json", res);
            TemplateVar.set(template, "sundryData", mapOfJSON);
        });
    } catch (err) {
        sAlert.error("Unable to retrieve certificate from Blockchain.");
    }
    ;
}

function JSONToArrayOfObjects(json) {
    if (json === "" || json === undefined) return []; //Deal with empty JSON
    let objectArray = [];   //Array to store object results
    json = json.substr(1, json.length - 2); //Get rid of quotes at start and end of json string, the rest are removed by the string.split below
    let arrayOfPairs = json.split('","');  //Break the JSON into an array
    for (let pair in arrayOfPairs) {
        if (isNaN(parseInt(pair))) continue; // prevents the attempted parsing of extra data sometimes attached to last pair
        //Add the required padding to each key-value pair and process:
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
        //Prevent the user from editing read-only fields
        if ((key == "Name") || (key == "DOB")) {
            elem.readOnly = "readonly";
        }
        if (key == "DOB") elem.type = "date";   //Ensure DOB is a date field
        if (pair == 0 && key != "Name") {   //Deal with anonymous certificates
            sAlert.info("This is an anonymous certificate. If you change Name or Date of Birth, the certificate owner may change.");
            Meteor.defer(function () {
                $("#anonymousUpdate").prop("checked", true);
            });
            //Supply the know fields
            objectArray = [
                {
                    uniqid: Random.id(),
                    keyValue: "Name",
                    value: "",
                    readOnly: "readonly",
                    type: "text"
                }, {
                    uniqid: Random.id(),
                    keyValue: "DOB",
                    value: "",
                    readOnly: "readonly",
                    type: "date"
                }];
        } else if (pair == 0) {
            objectArray = [{
                uniqid: Random.id(),
                keyValue: "Name",
                value: value,
                readOnly: "readonly",
                type: "text"
            }, {
                uniqid: Random.id(),
                keyValue: "DOB",
                value: "",
                readOnly: "readonly",
                type: "date"
            }];
            continue;
        }
        objectArray.push(elem);
    }
    return objectArray;
}

function isContractAddressValidStr(contractAddres) {
    // function returns text to be put into input field css classes for correct and incorrect Contract Addresses
    if (contractAddres.length === 0) return "";
    if (web3.isAddress(contractAddres)) {
        return "has-success";
    }
    return "has-danger";
}

function deleteCertificate(certificateAddress) {
    return new Promise((error) => {
        let myContract = getContract(certificateAddress);
        myContract.deleteCertificate(function (err, res) {  //Unfortunately there is no web3 success message for contract calls currently
            error(err);
        });
    });
}

function updateCertificate(oldCertificateAddress, candidateName = "", candidateDOB = "", sundryData = "") {
    return new Promise((result) => {
        myContract = getContract(oldCertificateAddress);
        myContract.idHash((err, res) => {
            if (!err) {
                let oldIdHash = res;
                let newIdHash = oldIdHash;
                myContract.sundryData((err, res) => {
                    if (!err) {
                        let mapOfJson = JSONToMap(res);
                        if (_.keys(mapOfJson)[0] !== "Name") { //if old cert is anonymous:
                            if (candidateName !== "") { //If a new name has been entered
                                newIdHash =
                                    web3.sha3(
                                        candidateName.toString().toLowerCase() +
                                        candidateDOB.toString().toLowerCase())
                                        .toString()
                                        .toLowerCase();
                            } else {
                                if (candidateDOB !== "") { // if a new DOB has been supplied
                                    sAlert.warning("You cannot change the DOB of an anonymous certificate without also supplying a name.");
                                    return;
                                }
                            }
                        } else { //if old cert is not anonymous
                            if (candidateName !== _.values(mapOfJson)[0] || candidateDOB !== "") {
                                newIdHash =
                                    web3.sha3(
                                        candidateName.toString().toLowerCase() +
                                        candidateDOB.toString().toLowerCase())
                                        .toString()
                                        .toLowerCase();
                            }
                        }
                        if (oldIdHash !== newIdHash) sAlert.warning("You are changing the owner of this certificate.");
                        //First create the certificate, if that is sucessfull, delete the old one.
                        $('#reminderToWaitForMining').modal('show');
                        createCertificate(null, null, sundryData, newIdHash).then((newCertificate) => {
                                if (newCertificate) {
                                    deleteCertificate(oldCertificateAddress);
                                    sAlert.success("The certificate " + newCertificate.address + " has been changed! <strong><a href='https://ropsten.etherscan.io/tx/" + newCertificate.txHash + "' target='_blank'> Click here</a></strong> to view it on the blockchain.");
                                }
                            }
                        )
                        ;
                    }
                });
            }
            else {
                sAlert.warning("Oops! Something went wrong with updating.");
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
        if (isNaN(parseInt(pair))) continue; // prevents the attempted parsing of extra data sometimes attached to last pair
        let jsonPair = '{"' + arrayOfPairs[pair] + '"}';
        let dictPair = JSON.parse(jsonPair);
        let key = Object.keys(dictPair)[0];
        map[key] = dictPair[key];
    }
    return map;
}

function arrayToJSON(array) {
    let json = "";
    let isAnonymous = _.filter(array, function (x) {
        return x.keyValue == "Anonymous";
    })[0]["value"];

    for (input in array) {
        if ((array[input]["keyValue"] === "Name" && isAnonymous) || array[input]["keyValue"] === "DOB" || array[input]["keyValue"] === "Anonymous" || array[input]["KeyValue"] === "" || array[input]["value"] === "") continue;
        let dictEntry = {};
        dictEntry[array[input]["keyValue"]] = array[input]["value"];
        let newEntry = JSON.stringify(dictEntry).toString();
        json = json + newEntry.substring(1, newEntry.length - 1) + ",";
    }
    return json.substring(0, json.length - 2);
}

function isValidSHAStr(idHash) {
    if (idHash.length === 0) {
        return "";
        //  Check if valid Keccak 256 SHA3 hash
    } else if (/^[a-f0-9]{64}$/i.test(idHash)) {
        return "has-success";
    } else {
        return "has-danger";
    }
}

function checkWeb3Status() {
    //This function throws all the modals if the client's browser is incorrectly configured
    if (!web3.isConnected()) { //check for web3
        $('#noWeb3Modal').modal('show');
    } else { //check if connected to correct network
        let network;
        web3.version.getNetwork((error, result) => {
            network = getNetwork(result);
            Session.set("connectedNetwork", network);
            if (network !== "Ropsten") {
                $('#worngNetworkModal').modal('show');
            } else { // Check whether account is locked
                web3.eth.getAccounts(function (err, res) {
                    if (!err) {
                        Address = res[0];
                        if (Address == undefined) {
                            if (!Session.get("accountLocked")) {
                                $('#accountsLockedModal').modal('show');
                                Session.set("accountLocked", true);
                                Session.set("Address", "0x");
                                Session.set("walletBallance", 0);
                                Session.set("numberOfCerts", 0);
                            }
                        } else { // Set all the apropriate variables
                            Session.set("Address", Address);
                            $('#accountsLockedModal').modal('hide');
                            Session.set("accountLocked", false);
                            web3.eth.getBalance(Address, function (err, res) {
                                let ethBlance = Math.round(web3.fromWei(res, "ether") * 10000) / 10000;
                                Session.set("walletBallance", ethBlance);
                            });
                            numberOfCerts = Certificates.find({certificateIssuer: Address}).count();
                            Session.set("numberOfCerts", numberOfCerts);
                        }
                    }
                });
            }
        })
        ;
    }
};

function generateQRCode(qrId, text) {
    $(qrId).empty();
    $(qrId).qrcode({
        size: 150,
        render: 'image',
        text: text
    });
}

function buildTimeGraph(timeframe, template) {
    Date.prototype.getWeek = function () {
        var onejan = new Date(this.getFullYear(), 0, 1);
        return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    };
    var monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    let dateObject = new Date();
    let currentWeek = dateObject.getWeek();
    let currentMonth = monthNames[dateObject.getMonth()];
    let past3Month = monthNames[dateObject.getMonth() - 3];
    let currentYear = dateObject.getFullYear();
    let returnString;

    switch (timeframe) {
        case 7:
            returnString = ("Week " + currentWeek + ", " + currentMonth + " " + currentYear);
            TemplateVar.set(template, "currentTimeFrame", returnString);
            break;
        case 30:
            returnString = (currentMonth + " " + currentYear);
            TemplateVar.set(template, "currentTimeFrame", returnString);
            break;
        case 90:
            returnString = (past3Month + " to " + currentMonth + " " + currentYear);
            TemplateVar.set(template, "currentTimeFrame", returnString);
            break;
    }

    let lineChartData = {
        labels: _.pluck(CertificatesProducedGraph.find({}, {sort: {_id: 1}}).fetch().slice(-timeframe), "_id"),
        datasets: [
            {
                label: 'Certificates',
                backgroundColor: 'rgba(220,220,220,0.2)',
                borderColor: 'rgba(220,220,220,1)',
                pointBackgroundColor: 'rgba(220,220,220,1)',
                pointBorderColor: '#fff',
                data: _.pluck(CertificatesProducedGraph.find({}, {sort: {_id: 1}}).fetch().slice(-timeframe), "count")
            },
            {
                label: 'Unique Issuers',
                backgroundColor: 'rgba(151,187,205,0.2)',
                borderColor: 'rgba(151,187,205,1)',
                pointBackgroundColor: 'rgba(151,187,205,1)',
                pointBorderColor: '#fff',
                data: _.pluck(UniqueIssuerGraph.find({}, {sort: {_id: 1}}).fetch().slice(-timeframe), "count")
            },
            {
                label: 'Unique Recipients',
                backgroundColor: 'rgba(205,196,151,0.2)',
                borderColor: 'rgba(205,196,151,1)',
                pointBackgroundColor: 'rgba(205,196,151,1)',
                pointBorderColor: '#fff',
                data: _.pluck(UniqueRecipientGraph.find({}, {sort: {_id: 1}}).fetch().slice(-timeframe), "count")
            }
        ]
    };
    let ctx = $('#timeGraph');
    chart = new Chart(ctx, {
        type: 'line',
        data: lineChartData,
        options: {
            responsive: true
        }
    });
}

qrScanner.on('scan', function (err, message) {
    if (message !== null) {
        //Test if valid URL
        let urlRegex = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
        if(urlRegex.test(message)){
            return window.location.href = message;
        } else{
            return sAlert.warning("Oops, your QR code doesn't appear to contain a valid url.")
        }
    }
});

Meteor.setInterval(checkWeb3Status, 1000);

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
    Session.set("showQrScanner", null);
});

Template.ChildCertificate.onCreated(function () {
    let template = Template.instance();
    let address = template.data.resultCertificateAddress;
    TemplateVar.set(template, "issuerMetaData", template.data.issuerMetaData);
    getCertificateFromBlockchain(address, template);
});

Template.UpdateCertificate.onCreated(function () {
    Session.set("updateCertificateSearchResults", null);
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

Template.createCertificate.onCreated(function () {
    Meteor.subscribe('certificateTemplates', {
        onReady: function () {
            let templates = CertificateTemplates.find().fetch();
            Session.set("certificatesTemplates", templates);
            defaultInput = _.filter(templates, function (x) {
                return x.id == 0;
            })[0].template;
            Session.set('inputs', defaultInput);
        }
    });
});

Template.candidateDetailsSearch.onRendered(function () {
    $('#searchCandidateDOB').datepicker({
        format: "yyyy-mm-dd",
        endDate: "today",
        container: 'html',
        startView: 3,
        maxViewMode: 3,
        clearBtn: true,
        autoclose: true,
        defaultViewDate: {year: 1970, month: 0, day: 1}
    });
});

Template.injectWOW.onRendered(function () {
    new WOW().init();
});

Template.UsageMetrics.onRendered(function () {
    Meteor.call('pageLoadCount', "IP");
    template = Template.instance();
    //we need all the subscriptions to be loaded before we can populate the respective graphs
    let loadSubCount = 0;
    let subscriptionCount = 3; //number of subscriptions required to process the request
    Meteor.subscribe('certificatesProducedGraph', {
        onReady: function () {
            loadSubCount = loadSubCount + 1;
            if (loadSubCount === subscriptionCount) {
                buildTimeGraph(30, template);
            }
        }
    });
    Meteor.subscribe('uniqueIssuerGraph', {
        onReady: function () {
            loadSubCount = loadSubCount + 1;
            if (loadSubCount === subscriptionCount) {
                buildTimeGraph(30, template);
            }
        }
    });
    Meteor.subscribe('uniqueRecipientGraph', {
        onReady: function () {
            loadSubCount = loadSubCount + 1;
            if (loadSubCount === subscriptionCount) {
                buildTimeGraph(30, template);
            }
        }
    });
});

Template.inputFields.onRendered(function (event) {
    if (this.data.type == 'date') {
        $('#' + this.data.uniqid).datepicker({
            format: "yyyy-mm-dd",
            endDate: "today",
            container: 'html',
            startView: 3,
            maxViewMode: 3,
            clearBtn: true,
            autoclose: true,
            defaultViewDate: {year: 1970, month: 0, day: 1}
        });
    }
});

Template.injectJqueryPopover.onRendered(function () {
    //html:true enabled to put buttons within the popover content
    $('[data-toggle="popover"]').popover({html: true});
    $('.popover-dismiss').popover({
        trigger: 'focus'
    })
    $(".popover-hover").popover({trigger: "manual", html: true, animation: false})
        .on("mouseover", function () {
            var _this = this;
            $(this).popover("show");
            $(".popover").on("mouseleave", function () {
                $(_this).popover('hide');
            });
        }).on("mouseleave", function () {
        var _this = this;
        setTimeout(function () {
            if (!$(".popover:hover").length) {
                $(_this).popover("hide");
            }
        }, 500);
    });

});

Template.injectJqueryTooltip.onRendered(function () {
    $(function () {
        $('[data-toggle="tooltip"]').tooltip({trigger: 'hover'});
    })
});

Template.WalletBallance.helpers({
    walletAddressWidget: function () {
        return Session.get("Address");
    },
    walletBallanceWidget: function () {
        return Session.get("walletBallance");
    },
    numberOfCertsWidget: function () {
        return Session.get("numberOfCerts");
    }
});

Template.modal.helpers({
    connectedNetwork: function () {
        return Session.get("connectedNetwork");
    }
});

Template.main.helpers({
    accountLockedStatus: function () {
        if (Session.get("accountLocked")) return "icon-lock";
        return "icon-lock-open";
    },
    walletAddressWidget: function () {
        return Session.get("Address");
    },
    walletBallanceWidget: function () {
        return Session.get("walletBallance");
    },
    numberOfCertsWidget: function () {
        return Session.get("numberOfCerts");
    },
    accountLockWidget: function () {
        if (Session.get("accountLocked")) return "The account is locked. Please unlock to edit or create new certificates.";
        return "The account is unlocked.";
    }
});

Template.modal.helpers({
    'showQrScanner': function () {
        return Session.get("showQrScanner");
    }
});

Template.CandidateSearch.onRendered(function () {
    $('#myTab a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });
    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        let activeTab = e.target.href.split('#')[1]; // newly activated tab
        Session.set('searchType', activeTab);
        if (activeTab == "qrSearch") { //if the selected tab is the qr search tab, set the visible flag to true.
            Session.set("showQrScanner", true);
        } else {
            Session.set("showQrScanner", null);
        }
    })
});

Template.UpdateCertificateFormChildChild.helpers({
    inputs: function () {
        return Session.get('inputs');
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
    },
    showQrScanner: function () {
        return Session.get("showQrScanner");
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
    },
    Address: function () {
        return Session.get("Address");
    },
    showDeletedCertificate: function () {
        return Session.get("showDeletedCertificate");
    },
});

Template.UpdateCertificateForm.helpers({
    updateCertificateSearchResults: function () {
        return Session.get("updateCertificateSearchResults");
    }
});

Template.UsageMetrics.events({
    'change': function (event) {
        template = Template.instance();
        switch (event.target.outerText) {
            case "Week":
                buildTimeGraph(7, template);
                break;
            case "Month":
                buildTimeGraph(30, template);
                break;
            case "3 Months":
                buildTimeGraph(90, template);
                break;
        }
    }
});

Template.ChildCertificate.events({
    'click #shareCert': function () {
        let template = Template.instance();
        let certificateAddress = TemplateVar.get(template, "certificateAddress");
        Session.set('shareCertificateAddress', certificateAddress);
        $('#shareCertificateModal').modal('show');
        generateQRCode('#shareCertificateQR', 'http://localhost:3000/search/ca/' + certificateAddress);
    }
});

Template.modal.events({
    "click #modalDeleteButtonConfirm": function () {
        $('#deleteConfirmModal').modal('hide');
        $("#deleteCertificateForm").submit();
    },

    'click #closeQrScannerButton': function () {
        Session.set("showQrScanner", null);
    }
});

Template.UpdateCertificateFormChildChild.events({
    'click #add-input': function () {
        template = Template.instance();
        var inputs = Session.get('inputs');
        if (inputs.length >= 10) {
            TemplateVar.set(template, "addNewFieldButtonStatus", "disabled");
        } else {
            TemplateVar.set(template, "addNewFieldButtonStatus", "");
            var uniqid = Random.id(); // Give a unique ID so you can pull _this_ input when you click remove
            inputs.push(
                {
                    uniqid: uniqid,
                    keyValue: "",
                    value: ""
                });
            Session.set('inputs', inputs);
        }
    }
});

Template.HomeCards.events({
    'click #qrScannerWidgetButton': function () {
        Session.set("showQrScanner", true);
        $('#scanQRModal').modal('show');
    }
});

Template.candidateIdSearch.events({
    'change #searchCandidateIDHash': function (event) {
        let template = Template.instance();
        let idHash = document.getElementById("searchCandidateIDHash").value;
        TemplateVar.set(template, "valid", isValidSHAStr(idHash));
    }
});

Template.issuerAddressSearch.events({
    "change #searchCertificateIssuer": function () {
        let certificateAddress = document.getElementById("searchCertificateIssuer").value;
        let template = Template.instance();
        TemplateVar.set(template, "valid", isContractAddressValidStr(certificateAddress));
    }
});

Template.certificateAddressSearch.events({
    "change #searchCertificateAddress": function () {
        let certificateAddress = document.getElementById("searchCertificateAddress").value;
        let template = Template.instance();
        TemplateVar.set(template, "valid", isContractAddressValidStr(certificateAddress));
    }
});

Template.CandidateSearch.events({
    "change #showDeletedCertificate": function () {

        if (Session.get("showDeletedCertificate") == false) {
            sAlert.info("You have chosen to show deleted certificates. Those that have been deleted are shown in red.")
        }
        //let animation finish before pulling the deleted certs
        setTimeout(function () {
            Session.set("showDeletedCertificate", document.getElementById("showDeletedCertificate").checked);
        }, 150);
    },

    "click #searchTab": function (event) {
        let template = Template.instance();
        Session.set("certificateSearchResults", null);
        TemplateVar.set(template, 'valid', "");
    },

    "submit .candidateSearch": function (event) {
        let searchResults = [];
        let commonMetaData;
        let commonMetaDataText;
        let idHash;
        let searchQuery;
        switch (Session.get("searchType")) {
            case "candidateDetailsSearch":
                let candidateName = document.getElementById("searchCandidateName").value;
                let candidateDOB = document.getElementById("searchCandidateDOB").value;
                if (candidateDOB !== null && candidateDOB !== undefined && candidateDOB !== "") {
                    var idHashFull =
                        web3.sha3(
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
                searchQuery = idHashFull;
                var idHashShort =
                    web3.sha3(
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
            case "candidateIdSearch":
                idHash = document.getElementById("searchCandidateIDHash").value.toLowerCase();
                idHash = idHash.substr(idHash.length - 64);
                if (idHash.substr(0, 2) != "0x") idHash = "0x" + idHash;
                searchQuery = idHash;
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
            case "certificateAddressSearch":
                let certificateAddress = document.getElementById("searchCertificateAddress").value.toLowerCase();
                searchQuery = certificateAddress;
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
            case "issuerAddressSearch":
                let certificateIssuer = document.getElementById("searchCertificateIssuer").value.toLowerCase();
                if (certificateIssuer.substr(0, 2) != "0x") certificateIssuer = "0x" + certificateIssuer;
                searchQuery = certificateIssuer;
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
        if (searchResults.length == 0) {
            sAlert.info("There were no certificates found for your search criteria.")
        }
        Session.set("certificateSearchResults", searchResults);
        Session.set("commonMetaData", commonMetaData);
        Session.set("commonMetaDataText", commonMetaDataText);
        let searchTypeDict = {
            candidateDetailsSearch: "cd",
            candidateIdSearch: "id",
            certificateAddressSearch: "ca",
            issuerAddressSearch: "ia"
        };
        window.history.pushState('', '', '/search/' + searchTypeDict[Session.get("searchType")] + "/" + searchQuery);
        event.preventDefault();
    },

    'click #qrSearchTab': function () {
        $('#scanQRModal').modal('show');
        Session.set("showQrScanner", true);
    }
});

Template.DeleteCertificateForm.events({
    "click #deleteCertificateButton": function (event) {
        try {
            let certificateAddress = $("#deleteCertificateAddress").val();
            let searchResults = Certificates.find(
                {
                    certificateAddress: certificateAddress
                }
            ).fetch();
            if (searchResults.length !== 0) {
                if (searchResults[0].certificateIssuer === Address) {
                    myContract = getContract(certificateAddress);
                    myContract.isDeleted(function (err, res) {
                        if (!err && !res) {
                            $('#deleteConfirmModal').modal('show');
                        } else if (!err) {
                            sAlert.warning("This certificate has already been deleted.");
                        } else {
                            sAlert.error("Oops!, something went wrong fetching your certificate.");
                        }
                    });

                } else {
                    sAlert.error("<strong>You did not create this certificate and thus, cannot delete it.</strong>");
                }
            } else {
                sAlert.warning("<strong >No certificates with this address were found.</strong>");

            }
        } catch (err) {
            sAlert.error("Oops! Failed to delete this certificate.")
        }
    },
    "submit #deleteCertificateForm": function (event) {
        try {
            let certificateAddress = event.target.certificateAddress.value;
            let searchResults = Certificates.find(
                {
                    certificateAddress: certificateAddress
                }
            ).fetch();
            if (searchResults.length !== 0) {
                if (searchResults[0].certificateIssuer === Address) {
                    deleteCertificate(certificateAddress).then((error) => {
                        if (!error) {
                            sAlert.success('Certificate successfully deleted.');
                        } else {
                            sAlert.error('Failed to delete certificate');
                        }
                    });
                } else {
                    sAlert.error("<strong>You did not create this certificate and thus, cannot delete it.</strong>");
                }
            } else {
                sAlert.warning("<strong >No certificates with this address were found.</strong>");
            }
        } catch (err) {
            sAlert.error("Oops! Failed to delete this certificate.")
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
                    window.history.pushState('', '', '/change/' + certificateAddress);
                    getContract(searchResults[0].certificateAddress).isDeleted((err, res) => {
                        if (!err && res) {
                            $("#infromDeletedOnUpdate").modal('show');
                        }
                    });
                } else if (!Address === undefined) { //check whether user is logged in before shouting at them
                    sAlert.error("You did not create this certificate and thus, cannot edit it.");
                }
            } else {
                sAlert.info("No certificates with this address were found.");
                Session.set("updateCertificateSearchResults", null);
            }
        } catch (err) {
            sAlert.error("Oops! Your certificate has failed to be updated.");
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
        if ((candidateName === "" || candidateName === undefined) && !document.getElementById("anonymousUpdate").checked) {
            sAlert.warning("Please enter a name as the certificate is not anonymous. Alternatively, you can choose to make the certificate anonymous.")
        } else {
            inputs = _.filter(inputs, function (x) {
                return ((x.keyValue != "" && x.value != "") || x.keyValue == "Anonymous");
            });
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
        template = Template.instance();
        var inputs = Session.get('inputs');
        if (inputs.length >= 10) {
            TemplateVar.set(template, "addNewFieldButtonStatus", "disabled");
        } else {
            TemplateVar.set(template, "addNewFieldButtonStatus", "");
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
        }
    },
    'click #createCertificate': function (event) {
        sundryData = Session.get('inputs');
        candidateName = _.filter(sundryData, function (x) {
            return x.keyValue == "Name";
        })[0]["value"];
        try {
            candidateDOB = _.filter(sundryData, function (x) {
                return x.keyValue == "DOB";
            })[0]["value"];
        } catch (e) {
        }
        if (candidateName == "") {
            sAlert.warning("Please enter at least the name to identify the certificate.")
        } else {
            //later, we will want to minify this URL.
            let universityLogoURL = $('#universityLogoURL').val();
            let elem;
            if (universityLogoURL != "") {
                elem =
                    {
                        uniqid: "logoURL",
                        keyValue: "logoURL",
                        value: universityLogoURL,
                        readOnly: "readonly",
                        type: "text"
                    };
                sundryData.push(elem);
            }
            elem =
                {
                    uniqid: "isAnonymous",
                    keyValue: "Anonymous",
                    value: document.getElementById("anonymousCreate").checked,
                    readOnly: "readonly",
                    type: "checkbox"
                };
            sundryData.push(elem);
            sundryData = _.filter(sundryData, function (x) {
                return ((x.keyValue != "" && x.value != "") || x.keyValue == "Anonymous");
            });
            json = arrayToJSON(sundryData);
            $('#reminderToWaitForMining').modal('show');
            createCertificate(candidateName, candidateDOB, json).then((resolve, err) => {
                $('#reminderToWaitForMining'
                ).modal('hide');
                if (resolve) {
                    sAlert.success("<strong> Certificate added, with address" + resolve.address + ".</strong> <a href='https://ropsten.etherscan.io/tx/" + resolve.txHash + "' target='_blank'> Click here</a> to view it on the blockchain.")
                }
            })
            ;
            event.preventDefault();
        }
    },
    'change #certificatesTemplates': function (event) {
        inputs = _.filter(Session.get("certificatesTemplates"), function (x) {
            return x.id == event.target.value;
        })[0].template;
        Session.set("inputs", inputs);

    },
    'click #universityLogo': function () {
        template = Template.instance();
        TemplateVar.set(template, "universityLogoURL", $('#universityLogoURL').val());
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
        if ($input.context.name == "inputKey") inputs[index].keyValue = $input.val();
        if ($input.context.name == "inputValue") inputs[index].value = $input.val();
        Session.set('inputs', inputs);
    }
});