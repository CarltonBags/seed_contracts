// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./Presale.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract PresaleFactory is Ownable {

    address [] public Presales;
    address eventhandler;
    address nftAddress;
    address usdc;

    error InvalidParam(string);
    error Unauthorized(string);


    constructor(address _eventhandler, address _nftAddress, address _usdc) Ownable(_msgSender()) {
        if(_eventhandler == address(0)){revert InvalidParam("eventhandler is zero");}
        if(_nftAddress == address(0)){revert InvalidParam("nft address is zero");}
        if(_usdc == address(0)){revert InvalidParam("usdc address is zero");}

        eventhandler = _eventhandler;
        nftAddress = _nftAddress;
        usdc = _usdc;
    }

    function deployPresale(address _tokenAddress, string memory _uri) external onlyOwner{
        if(_tokenAddress == address(0)){revert InvalidParam("token address is zero");}

        address presale = address(new Presale(
            _msgSender(),
            _tokenAddress,
            _uri,
            eventhandler,
            nftAddress,
            usdc
        ));

        Presales.push(presale);

        IEventhandler(eventhandler).lNFTCollectionCreated(presale, _tokenAddress, _uri, _msgSender());
        IEventhandler(eventhandler).setNewCaller(presale);
    }

    function changeNFTAddress(address newNFTAddress) external onlyOwner{
        if(newNFTAddress == address(0)){revert InvalidParam("nft address is zero");}
        nftAddress = newNFTAddress;
    }

    function changeUSDCAddress(address newUSDCAddress) external onlyOwner{
        if(newUSDCAddress == address(0)){revert InvalidParam("usdc address is zero");}
        usdc = newUSDCAddress;
    }

    function changeEventHandler(address newEventHandler) external onlyOwner{
        if(newEventHandler == address(0)){revert InvalidParam("eventhandler address is zero");}
        eventhandler = newEventHandler;
    }

}