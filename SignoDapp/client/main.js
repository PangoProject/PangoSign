import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './main.html';

ABIArray = [{"constant":true,"inputs":[],"name":"sundryData","outputs":[{"name":"","type":"string"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"certificateIssuer","outputs":[{"name":"","type":"address"}],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"idHash","outputs":[{"name":"","type":"bytes32"}],"payable":false,"type":"function"},{"constant":false,"inputs":[],"name":"removeCertificate","outputs":[],"payable":false,"type":"function"},{"constant":true,"inputs":[],"name":"isDeleted","outputs":[{"name":"","type":"bool"}],"payable":false,"type":"function"},{"inputs":[{"name":"hash","type":"bytes32"},{"name":"sundry","type":"string"}],"payable":false,"type":"constructor"}];

Address = "0x6ed566a5750d7001735f306a370b1221d11ee306";

Data = "6060604052341561000f57600080fd5b6040516104b13803806104b1833981016040528080519060200190919080518201919050505b336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550816001816000191690555080600290805190602001906100969291906100ba565b506000600360006101000a81548160ff0219169083151502179055505b505061015f565b828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106100fb57805160ff1916838001178555610129565b82800160010185558215610129579182015b8281111561012857825182559160200191906001019061010d565b5b509050610136919061013a565b5090565b61015c91905b80821115610158576000816000905550600101610140565b5090565b90565b6103438061016e6000396000f30060606040526000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff168063083dfe681461006a5780635455e36b146100f9578063aa4107321461014e578063ba4999e41461017f578063d7efb6b714610194575b600080fd5b341561007557600080fd5b61007d6101c1565b6040518080602001828103825283818151815260200191508051906020019080838360005b838110156100be5780820151818401525b6020810190506100a2565b50505050905090810190601f1680156100eb5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b341561010457600080fd5b61010c61025f565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b341561015957600080fd5b610161610284565b60405180826000191660001916815260200191505060405180910390f35b341561018a57600080fd5b61019261028a565b005b341561019f57600080fd5b6101a7610304565b604051808215151515815260200191505060405180910390f35b60028054600181600116156101000203166002900480601f0160208091040260200160405190810160405280929190818152602001828054600181600116156101000203166002900480156102575780601f1061022c57610100808354040283529160200191610257565b820191906000526020600020905b81548152906001019060200180831161023a57829003601f168201915b505050505081565b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60015481565b6000809054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161415156102e557600080fd5b6001600360006101000a81548160ff0219169083151502179055505b5b565b600360009054906101000a900460ff16815600a165627a7a72305820513dc0c325bb01eb4743d032307eaad99bcfbbfcf62ceec0808ce5fdf7aca33c0029";

//Certificates = new Mongo.Collection('certificatesList');
Certificates = new Mongo.Collection('certificates');

Template.CandidateSearch.onCreated(function(){
  
  this.searchResults = new ReactiveVar();
  this.searchResultsCerts = new ReactiveVar();
});


Template.Wallet.helpers({
  'getEthBallance': function(){
    var address = "0x1E981F0fa321aF3b598207574BCd59D76b33dc9A";
    var template = Template.instance();
    var web3var=web3.eth.getBalance(address, function(error, result){
      TemplateVar.set(template, "walletvalue", result);      
    });
  }
})


Template.CandidateSearch.helpers({
  'searchResults': function(){
    
    console.log(Template.instance().searchResults.get());
    
    
    myContract = GetContract(Template.instance().searchResults.get());
    temp = Template.instance();
    myContract.certificateIssuer(function(err, res,temp) {
      
      if(res!=0 && res!=null && res){
        console.log("res set to:");
        console.log(res);
      //  return temp.searchResultsCerts.set(res);
      TemplateVar.set(temp, "testreturn", res);
      }
  })
    
    if(Template.instance().searchResultsCerts.get()){
      console.log("return method:");
      console.log(resTemp);
      //return Template.instance().searchResultsCerts.get();
      TemplateVar.set(template, "testreturn", res);
    }
    
  }
})

Template.CertificateSearch.events({
     "submit .search-address": function(event, t) {
         var contractAddress = event.target.address.value;
 
         myContract = GetContract(contractAddress);
 
         var template = Template.instance();
         GetCertificate(contractAddress, template);
         return false;
     }
 })

// Template.CertificateChild.onCreated(function(){

//       console.log(CertificateChild);

//       // var contractAddress = TemplateVar.get("certificateAddress");
//       // myContract = GetContract(contractAddress);

//       // var template = this.Template.instance();
//       // GetCertificate(contractAddress, template);
//       // return false;
//      }
//  );




Template.CandidateSearch.events({
  "submit .search-candidate": function(event, t) {
    var template = Template.instance();
    var candidateName = event.target.candidateName.value;
    var candidateDOB = event.target.candidateDOB.value;
    var idHash = event.target.idHash.value;
    searchResults = Certificates.find({idHash:idHash}).fetch();
    
    
    console.log(searchResults);
    TemplateVar.set(template, "testreturn", searchResults);

    searchResults.forEach(function(element) {
      GetCertificateForCandidate(element.certificateAddress, template);
    }, this);    
    // TemplateVar.set( "searchResults", searchResults);

    // var tempArray =[];
    
    //TemplateVar.set(template, "testreturn", searchResults);
   
    // console.log(search_results[0].certificateAddress);
    // GetCertificate(search_results[0].certificateAddress,template);

    
    // console.log(search_results[1].certificateAddress);
    // GetCertificate(search_results[1].certificateAddress,template);
    //myContract = GetContract(search_results[0].certificateAddress);
    //Template.instance().searchResults.set(
    //   myContract.certificateIssuer(function(err, res) {
    //     console.log(res);
    //     return res;
    // })
    //search_results[0].certificateAddress);
    //idHash);



    // );
    // search_results.forEach(function(element) {
      
      
      //console.log(TemplateVar.get("search_cert"));
    //   myContract = GetContract(element.certificateAddress);
    //   // var test = new ReactiveVar(null, myContract.idHash(function(err, res) {
    //   //   return res;
    //   // }))

    //   var testReact = new ReactiveVar(12);

    //   testReact.set(
    //     myContract.idHash(function(err, res) {
    //       return res;
    //     })
    //   )
      
    //   tempArray.push(testReact.get());
    //  })

    // TemplateVar.set(template, "search_results", tempArray);
    // console.log("end");
    // console.log(TemplateVar.get("search_results"));
    //console.log(tempArray);

    //TemplateVar.set(template, "search_results", search_results);
    // var certificatesObjects = [];

    // search_results.forEach(function(element) {
      
    //   //GetCertificate(element.certificateAddress,template)
      
    //   //certificatesObjects.push(GetCertificate(element.certificateAddress,template));
            
    //   //console.log(TemplateVar.get("search_cert"));

    //   TemplateVar.set(template, "search_cert",[TemplateVar.get("search_cert"),11]);
    //   console.log(TemplateVar.get("search_cert"));
    // }, this);
    //console.log(certificatesObjects);
    //TemplateVar.set(template, "search_cert", search_results);

    //console.log(search_results[0].certificateAddress);
    // GetCertificate(certificateAddress)
    return false;
  }
})

function GetContract(contractAddress) {
  return web3.eth.contract(ABIArray).at(contractAddress);
}

function GetCertificate(contractAddress, template){
  myContract = GetContract(contractAddress);

  TemplateVar.set(template, "certificateAddress", contractAddress)
  myContract.idHash(function(err, res) {
      TemplateVar.set(template, "uniqueID", res)
  })
  myContract.certificateIssuer(function(err, res) {
      TemplateVar.set(template, "certificateIssuer", res)
  })
  myContract.sundryData(function(err, res) {
      TemplateVar.set(template, "metaData", res)
  })
}


function GetCertificateValues(contractAddress){
  

}