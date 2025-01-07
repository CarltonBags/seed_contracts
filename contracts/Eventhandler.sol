// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";



contract Eventhandler is Ownable{

    address [] factories;
    address [] tokens;
    address [] presales;

    mapping (address => bool) validCallers;
    mapping (address => bool) validFactories;



    constructor(address tokenFactory, address presaleFactory) Ownable(_msgSender()){
        validFactories[tokenFactory] = true;
        validFactories[presaleFactory] = true;
    }

    modifier onlyFactory(){
        if(!validFactories[_msgSender()]){revert Unauthorized();}
        _;
    }

    modifier onlyValidCaller(){
        if(!validCallers[_msgSender()]){revert Unauthorized();}
        _;
    }

    event FactoryDeployed(address newFactory, uint timestamp);
    event LNFTCollectionCreated(address collection, string uri, address owner, uint timestamp);
    event LNFTBought(address buyer, address presale, uint amountTokens, uint amountETH, uint timestamp);
    event TokensBought(address buyer, address presale, address token, uint amount, uint amountETH, uint8 round, uint timestamp);
    event TokensWithdrawn(address buyer, address presale, address token, uint amount, uint timestamp);
    event UserETHWithdrawal(address user, address presale, uint amountETH, uint timestamp);
    event PresaleCreated(address presale, address token, uint [] params, address gatingToken, uint timestamp);
    event TokenDeployed(address token, string name, string symbol, address mintedTo, uint mintedAmount, uint timestamp);

    error Unauthorized();


    //EVENT FUNCTIONS
    function lNFTCollectionCreated(address collection, address token, string uri, address owner) public onlyFactory{
        emit LNFTCollectionCreated(collection, token, uri, owner, block.timestamp);
    }

    function lNFTBought(address buyer, address presale, uint amountTokens, uint amountETH) public onlyValidCaller{
        emit LNFTBought(buyer, presale, amountTokens, amountETH, block.timestamp);
    }

    function tokensBought(address buyer, address presale, address token, uint amount, uint amountETH, uint8 round) public onlyValidCaller{
        emit TokensBought(buyer, presale, token, amount, amountETH, round, block.timestamp);
    }

    function tokensWithdrawn(address buyer, address presale, address token, uint amount) public onlyValidCaller{
        emit TokensWithdrawn(buyer, presale, token, amount, block.timestamp);
    }

    function userETHWithdrawal(address user, address presale, uint amountETH) public onlyValidCaller{
        emit UserETHWithdrawal(user, presale, amountETH, block.timestamp);
    }

    function presaleCreated(address presale, address token, uint [] params, address gatingToken) public onlyValidCaller{
        emit PresaleCreated(presale, token, params, gatingToken, block.timestamp);
    }

    function tokenDeployed(address token, string name, string symbol, address mintedTo, uint mintedAmount) public onlyValidCaller{
        emit TokenDeployed(token, name, symbol, mintedTo, mintedAmount, block.timestamp);
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