// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./Presale.sol";


contract PresaleFactory {

    address owner;
    address [] public Presales;
    address eventhandler;
    address nftAddress;
    address usdc;

    error InvalidParam(string);
    error Unauthorized(string);


    constructor(address _eventhandler, address _nftAddress, address _owner, address _usdc) {
        if(_eventhandler == address(0)){revert InvalidParam("eventhandler is zero");}
        if(_owner == address(0)){revert InvalidParam("owner is zero");}
        if(_nftAddress == address(0)){revert InvalidParam("nft address is zero");}
        if(_usdc == address(0)){revert InvalidParam("usdc address is zero");}

        eventhandler = _eventhandler;
        owner = _owner;
        nftAddress = _nftAddress;
        usdc = _usdc;
    }

    function deployPresale(address _tokenAddress, string memory _uri) external {
        if (msg.sender != owner){revert Unauthorized("not the owner");}
        if(_tokenAddress == address(0)){revert InvalidParam("token address is zero");}

        address presale = address(new Presale(
            msg.sender,
            _tokenAddress,
            _uri,
            eventhandler,
            nftAddress,
            usdc
        ));

        Presales.push(presale);

        IEventhandler(eventhandler).lNFTCollectionCreated(presale, _tokenAddress, _uri, msg.sender);
        IEventhandler(eventhandler).setNewCaller(presale);
    }

    function changeOwner(address newOwner) external{
        require(msg.sender == owner, "not the owner");
        owner = newOwner;
    }

}