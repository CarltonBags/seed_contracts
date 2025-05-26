// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;


abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

contract Ownable is Context {
    address private _owner;

    error OwnableUnauthorizedAccount(address account);
    error OwnableInvalidOwner(address owner);

    constructor () {
        address msgSender = _msgSender();
        _owner = msgSender;
        emit OwnershipTransferred(address(0), msgSender);
    }

    function owner() public view returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function _checkOwner() internal view virtual {
        if (_owner != _msgSender()) revert OwnableUnauthorizedAccount(_msgSender());
    }

    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) revert OwnableInvalidOwner(address(0));
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

contract Eventhandler is Ownable{

    address [] factories;
    address [] tokens;
    address [] presales;

    mapping (address => bool) validCallers;
    mapping (address => bool) validFactories;



    modifier onlyFactory(){
        if(!validFactories[_msgSender()]){revert Unauthorized();}
        _;
    }

    modifier onlyValidCaller(){
        if(!validCallers[_msgSender()]){revert Unauthorized();}
        _;
    }

    event FactoryDeployed(address newFactory, uint timestamp);
    event LNFTCollectionCreated(address collection, address token, string uri, address owner, uint timestamp);
    event LNFTBought(address buyer, address presale, uint amountTokens, uint amountUSDC, uint timestamp);
    event TokensBought(address buyer, address presale, address token, uint amount, uint amountUSDC, uint8 round, uint timestamp);
    event TokensWithdrawn(address buyer, address presale, address token, uint amount, uint timestamp);
    event UserUSDCWithdrawal(address user, address presale, uint amountUSDC, uint timestamp);
    event PresaleCreated(address presale, address token, uint [] params, address gatingToken, uint timestamp);
    event TokenDeployed(address token, string name, string symbol, address mintedTo, uint mintedAmount, uint timestamp);
    event PresaleMoved(address presale, uint delay, uint timestamp);
    event PresalePaused(address presale, bool paused, uint timestamp);
    event PresaleCanceled(address presale, bool canceled, uint timestamp);
    event PresaleFinalised(address presale, uint timestamp);

    error Unauthorized();


    //EVENT FUNCTIONS
    function lNFTCollectionCreated(address collection, address token, string calldata uri, address owner) external onlyFactory{
        emit LNFTCollectionCreated(collection, token, uri, owner, block.timestamp);
    }

    function lNFTBought(address buyer, address presale, uint amountTokens, uint amountUSDC) external onlyValidCaller{
        emit LNFTBought(buyer, presale, amountTokens, amountUSDC, block.timestamp);
    }

    function tokensBought(address buyer, address presale, address token, uint amount, uint amountUSDC, uint8 round) external onlyValidCaller{
        emit TokensBought(buyer, presale, token, amount, amountUSDC, round, block.timestamp);
    }

    function tokensWithdrawn(address buyer, address presale, address token, uint amount) external onlyValidCaller{
        emit TokensWithdrawn(buyer, presale, token, amount, block.timestamp);
    }

    function userUSDCWithdrawal(address user, address presale, uint amountUSDC) external onlyValidCaller{
        emit UserUSDCWithdrawal(user, presale, amountUSDC, block.timestamp);
    }

    function presaleCreated(address presale, address token, uint [] calldata params, address gatingToken) external onlyValidCaller{
        emit PresaleCreated(presale, token, params, gatingToken, block.timestamp);
    }

    function tokenDeployed(address token, string calldata name, string calldata symbol, address mintedTo, uint mintedAmount) external onlyFactory{
        emit TokenDeployed(token, name, symbol, mintedTo, mintedAmount, block.timestamp);
    }

    function presaleMoved(address presale, uint delay) onlyValidCaller external{
        emit PresaleMoved(presale, delay, block.timestamp);
    }

    function presalePaused(address presale, bool paused) onlyValidCaller external{
        emit PresalePaused(presale, paused, block.timestamp);
    }

    function presaleCanceled(address presale, bool canceled) onlyValidCaller external{
        emit PresaleCanceled(presale, canceled, block.timestamp);
    }

    function presaleFinalised(address presale) onlyValidCaller external{
        emit PresaleFinalised(presale, block.timestamp);
    }

    //CONTROL FUNCTIONS
    function setNewFactory(address factory, bool valid) external onlyOwner{
        validFactories[factory] = valid;
        factories.push(factory);
        emit FactoryDeployed(factory, block.timestamp);
    }

    function setNewCaller(address caller) external onlyFactory {
        validCallers[caller] = true;
    }

    function isValidPresaleFactory(address factory) public view returns (bool){
        if(validCallers[factory]){
            return true;
        } else{
            return false;
        }
    }



    
}