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

function formatDate(unixTimeStamp) {
    const timeStamp = new Date(unixTimeStamp * 1000);
    return moment(timeStamp).format("YYYY-MM-DD");
}

qrScanner.on('scan', function (err, message) {
    if (message !== null) {
        //Test if valid URL
        let urlRegex = /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;
        if (urlRegex.test(message)) {
            return window.location.href = message;
        } else {
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
    return formatDate(date);
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
    $(".popover-hover").popover({trigger: "manual", html: true, animation: false})
        .on("mouseenter", function () {
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
        }, 200);
    });
});

Template.injectJqueryTooltip.onRendered(function () {
    $(function () {
        $('[data-toggle="tooltip"]').tooltip({trigger: 'hover'});
    })
});

Template.injectJqueryAccordion.onRendered(function () {
    $(function () {
        $('[data-toggle="collapse"]').toggle({trigger: 'click'});
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
    },
    shareAnonymous: function () {
        return Session.get("shareAnonymous");
    },
    shareLogoURL: function () {
        return Session.get("shareLogoURL");
    },
    shareSundryData: function () {
        return Session.get("shareSundryData");
    },
    shareCertificateIssuer: function () {
        return Session.get("shareCertificateIssuer");
    },
    shareIdHash: function () {
        return Session.get("shareIdHash");
    },
    shareCertificateAddress: function () {
        return Session.get("shareCertificateAddress");
    },
    shareIsDeleted: function () {
        return Session.get("shareIsDeleted");
    },
    shareTimeStamp: function () {
        return Session.get("shareTimeStamp");
    },
    shareName: function () {
        return Session.get("shareName");
    },
    CurrentPageURL: function () {
        return Session.get("CurrentPageURL");
    },
    shareCertificateURL: function () {
        return Session.get("shareCertificateURL");
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
    });
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
    },
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
//fix persistance popovers on click of certs-published
Template.WalletBallance.events({
    'click #certsPublishedButton': function () {
        $('div').tooltip('hide');
    }
})

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
    // Fix broken popovers on button click.
    'click #changeCertButton': function () {
        $('div').tooltip('hide');
    },
    'click #removeCertButton': function () {
        $('div').tooltip('hide');
    },
    'click #shareCert': function () {
        let template = Template.instance();
        let anonymous = TemplateVar.get(template, "anonymous");
        let logoURL = TemplateVar.get(template, "logoURL");
        let sundryData = TemplateVar.get(template, "sundryData");
        let certificateIssuer = TemplateVar.get(template, "certificateIssuer");
        let certificateAddress = TemplateVar.get(template, "certificateAddress");
        let isDeleted = TemplateVar.get(template, "isDeleted");
        let name = TemplateVar.get(template, "name");
        let idHash = TemplateVar.get(template, "idHash");
        let timeStamp = template.data.resultTimeStamp;
        Session.set("shareCertificateAddress", certificateAddress);
        Session.set("shareAnonymous", anonymous);
        Session.set("shareLogoURL", logoURL);
        Session.set("shareSundryData", sundryData);
        Session.set("shareCertificateIssuer", certificateIssuer);
        Session.set("shareIsDeleted", isDeleted);
        Session.set("shareName", name);
        Session.set("shareTimeStamp", timeStamp);
        Session.set("shareIdHash", idHash);
        Session.set("shareCertificateURL",'http://localhost:3000/search/ca/' + certificateAddress)
        $('#shareCertificateModal').modal('show');
        generateQRCode('#shareCertificateQR', Session.get("shareCertificateURL"));
    }
});

function mapToPdfMakerTable(map) {
    let tableArray = [];
    for (let input in map) {
        // escape all the unnecicary values:
        if ((input === "Name") || input === "DOB" || input === "Anonymous" || input === "" || map[input] === "") continue;
        let arrayEntry = [{text: input, bold: true}, {text: map[input]}];
        tableArray.push(arrayEntry);
    }
    return tableArray;
}

Template.modal.events({
    "click #modalDeleteButtonConfirm": function () {
        $('#deleteConfirmModal').modal('hide');
        $("#deleteCertificateForm").submit();
    },

    'click #closeQrScannerButton': function () {
        Session.set("showQrScanner", null);
    },
    //The folowing events are to hand creating qr code for the share button:
    "click #shareCandidateQrButton": function () {

    },

    "click #printCertificate": function () {
        // Note: Due to CORS violations, there are no images in the PDF. This could potentially be fixed with https://cors-anywhere.herokuapp.com
        //Set all the appropritae variables:
        let certificateAddress = Session.get("shareCertificateAddress");
        let anonymous = Session.get("shareAnonymous");
        let sundryData = Session.get("shareSundryData");
        let certificateIssuer = Session.get("shareCertificateIssuer");
        let name = Session.get("shareName");
        let timeStamp = Session.get("shareTimeStamp");
        let idHash = Session.get("shareIdHash");

        //Hacky hack to get the qr code generated as the qr-code builder doesn't assign an id to it's qr code.
        let qrCodeDataURL = document.getElementById("shareCertificateQR").children[0].src;

        // Replace the name with " Anonymous cert" if cert is anonymous
        if (anonymous) {
            name = "Anonymous Certificate"
        }

        let dateAdded = formatDate(timeStamp);

        //turn the sundry data json object into the table for (2D array)
        let tableSundryData = mapToPdfMakerTable(sundryData);

        // Define the pdf-document
        let docDefinition = {
            content: [
                {
                    stack: [
                        name,
                        {text: 'Pango Certificate of Authenticity', style: 'subHeader'},
                    ],
                    style: 'header'
                },
                {
                    style: 'sundryDataTable',
                    table: {
                        widths: ['auto', '*'],
                        body: tableSundryData
                    },
                    layout: 'noBorders'
                },
                {
                    columns: [
                        {
                            width: 150,
                            image: qrCodeDataURL
                        },
                        {
                            width: '*',
                            alignment: 'right',
                            stack: [
                                {
                                    fit: [10000, 50],
                                    image: 'data:image/png;base64,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'
                                },
                                {
                                    style: 'metaDataTable',
                                    table: {
                                        widths: ['auto', '*'],
                                        body: [
                                            [{text: 'Date Added', style: 'certificateMetaDataText'}, {
                                                text: dateAdded,
                                                style: 'certificateMetaDataText'
                                            }],
                                            [{
                                                text: 'Certificate Address',
                                                style: 'certificateMetaDataText',
                                                noWrap: true
                                            }, {text: certificateAddress, style: 'certificateMetaDataText'}],
                                            [{
                                                text: 'Issuer Address',
                                                style: 'certificateMetaDataText'
                                            }, {text: certificateIssuer, style: 'certificateMetaDataText'}],
                                            [{text: 'Recipient ID', style: 'certificateMetaDataText'}, {
                                                text: idHash,
                                                style: 'certificateMetaDataText'
                                            }]
                                        ],
                                    },
                                    layout: 'noBorders'
                                }
                            ]
                        }
                    ]
                },
            ],
            styles: {
                header: {
                    fontSize: 25,
                    bold: true,
                    alignment: 'right',
                    margin: [0, 190, 0, 80]
                },
                subHeader: {
                    fontSize: 14,
                    color: 'gray'
                },
                sundryDataTable: {
                    margin: [0, 0, 0, 60]
                },
                certificateMetaDataText: {
                    color: 'gray',
                    fontSize: 7
                },
                metaDataTable: {
                    margin: [30, 50, 0, 0]
                }
            }
        };

        // Start the pdf-generation process
        pdfMake.createPdf(docDefinition).download("Certificate.pdf");
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
    "click #shareSearch": function () {
        Session.set("CurrentPageURL", window.location.href);
        $('#ShareSearchModal').modal('show');
        generateQRCode('#shareSearchQR', Session.get("CurrentPageURL"));
    },

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