// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.28;

import "./Presale.sol";




contract PresaleFactory {

    address owner;
    address [] public Presales;
    address eventhandler;
    address nftAddress;
    bool private active;

    error Inactive();
    error InvalidParam();
    error Unauthorized();


    constructor(address _eventhandler, address _nftAddress) {
        eventhandler = _eventhandler;
        owner = msg.sender;
        nftAddress = _nftAddress;
    }

    function deployPresale(address _tokenAddress, string memory _uri) external {
        if (msg.sender != owner){revert Unauthorized();}
        if(!active){revert Inactive();}
        if(_tokenAddress == address(0)){revert InvalidParam();}
        address presale = address(new Presale(
            msg.sender,
            _tokenAddress,
            _uri,
            eventhandler,
            nftAddress
        ));

        Presales.push(presale);

        IEventhandler(eventhandler).lNFTCollectionCreated(presale, _tokenAddress, _uri, msg.sender);
        IEventhandler(eventhandler).setNewCaller(presale);
    }

    function setActive(bool _active) external {
        if (msg.sender != owner){revert Unauthorized();}
        active = _active;
    }


}