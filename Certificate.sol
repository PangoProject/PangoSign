pragma solidity ^ 0.4.13;
contract Certificate {
    address public certificateIssuer;
    bytes32 public idHash;
    string public sundryData;
    
    function Certificate(bytes32 hash, string sundry){
        certificateIssuer = msg.sender;
        idHash = hash;
        sundryData = sundry;
    }
    
    modifier isCertificateOwner() {
        if (msg.sender != certificateIssuer) revert();
        _;
    }
    
    function removeCertificate() public isCertificateOwner{
        suicide(msg.sender);
    }
}