// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Context.sol";



contract Eventhandler is Ownable{

    address [] tokenFactories;
    address [] presaleFactories;
    address [] tokens;
    address [] presales;

    mapping (address => bool) validCallers;
    mapping (address => bool) validFactory;



    constructor(address tokenFactory, address presaleFactory) Ownable(_msgSender()){
        validFactory[tokenFactory] = true;
        validFactory[presaleFactory] = true;
    }

    modifier onlyFactory(){
        if(!validFactory[_msgSender()]){revert Unauthorized();}
        _;
    }

    event TokenFactoryDeployed(address newTokenFactory, uint timestamp);
    event PresaleFactoryDeployed(address newPresaleFactory, uint timestamp);
    event LNFTCollectionCreated(address collection, string uri, address owner, uint timestamp);
    event LNFTBought(address buyer, address LNFT, uint amountTokens, uint amountETH, uint timestamp);
    event TokensBought(address buyer, address token, uint amount, uint amountETH, uint8 round, uint timestamp);
    event TokensWithdrawn(address buyer, address token, uint amount, uint timestamp);
    event UserETHWithdrawal(address user, uint amountETH, uint timestamp);
    event PresaleCreated(address LNFT, address token, uint [] params, address gatingToken, uint timestamp);
    event TokenDeployed(address token, string name, string symbol, address mintedTo, uint mintedAmount);

    error Unauthorized();


    //EVENT FUNCITONS

    //CONTROL FUNCTIONS
    function setNewPresaleFactory(address factory, bool valid) external onlyOwner{
        validFactories[factory] = valid;
        presaleFactories.push(presaleFactory);
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