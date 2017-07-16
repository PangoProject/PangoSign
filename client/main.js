// import { Template } from 'meteor/templating';
// import { ReactiveVar } from 'meteor/reactive-var';

import './main.html';

tempAddress = "0x44732c3716316ec04a5506f53f35518eb6a2a96d"
ABIArray = [{ "constant": true, "inputs": [], "name": "uniqueID", "outputs": [{ "name": "", "type": "bytes32" }], "payable": false, "type": "function" }, { "constant": true, "inputs": [], "name": "metaData", "outputs": [{ "name": "", "type": "string" }], "payable": false, "type": "function" }, { "inputs": [{ "name": "ID", "type": "bytes32" }, { "name": "meta", "type": "string" }], "payable": false, "type": "constructor" }]

data = "6060604052341561000f57600080fd5b6040516102ec3803806102ec833981016040528080519060200190919080518201919050505b8160008160001916905550806001908051906020019061005692919061005f565b505b5050610104565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106100a057805160ff19168380011785556100ce565b828001600101855582156100ce579182015b828111156100cd5782518255916020019190600101906100b2565b5b5090506100db91906100df565b5090565b61010191905b808211156100fd5760008160009055506001016100e5565b5090565b90565b6101d9806101136000396000f30060606040526000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff1680638bc533e914610049578063baf2a4eb1461007a575b600080fd5b341561005457600080fd5b61005c610109565b60405180826000191660001916815260200191505060405180910390f35b341561008557600080fd5b61008d61010f565b6040518080602001828103825283818151815260200191508051906020019080838360005b838110156100ce5780820151818401525b6020810190506100b2565b50505050905090810190601f1680156100fb5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b60005481565b60018054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156101a55780601f1061017a576101008083540402835291602001916101a5565b820191906000526020600020905b81548152906001019060200180831161018857829003601f168201915b5050505050815600a165627a7a72305820676835256e91dd651e4432ceadac9dfc3ce8b00bcdf53f20bf851a393890156b0029"




Template.main.helpers({
    wallet() {
        var template = Template.instance();
        web3.eth.getBalance("0xb0dE818928F9CbbFE7e9f98bebBD4Aa673361E23",
            function(err, res) {
                TemplateVar.set(template, "walletvalue", res);
            })
        var accounts = web3.eth.accounts;
        TemplateVar.set("address", accounts);

    },
    certificate() {
        var template = Template.instance();
        //myContract = web3.eth.contract(ABIArray).at(contractAddress);

        myContract = GetContract(tempAddress);
        TemplateVar.set("certAddress", tempAddress)

        myContract.uniqueID(function(err, res) {
            TemplateVar.set(template, "uniqueID", res)
        })
        myContract.metaData(function(err, res) {
            TemplateVar.set(template, "metaData", res)
        })
    },
});

function GetContract(contractAddress) {
    return web3.eth.contract(ABIArray).at(contractAddress);
}

Template.main.events({
    "submit .search-address": function(event, t) {
        var contractAddress = event.target.address.value;

        myContract = GetContract(contractAddress);

        var template = Template.instance();
        TemplateVar.set(template, "certAddress", contractAddress)
        myContract.uniqueID(function(err, res) {
            TemplateVar.set(template, "uniqueID", res)
        })
        myContract.metaData(function(err, res) {
            TemplateVar.set(template, "metaData", res)
        })




        return false;
    }
});