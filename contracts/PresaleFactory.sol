// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.28;

import "./Presale.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IEventhandler{

    function lNFTCollectionCreated(address collection, address token, string uri, address owner) public;
    function setNewCaller(address caller) external;
}

contract PresaleFactory is Ownable{

    address [] public Presales;
    address eventhandler;


    constructor(address _eventhandler) Ownable(_msgSender()){
        eventhandler = _eventhandler;
    }

    function deployPresale(address _tokenAddress, string memory _uri) external onlyOwner {
        address presale = address(new Presale(
            _msgSender(),
            _tokenAddress,
            _uri,
            eventhandler
        ));

        Presales.push(presale);

        IEventhandler(eventhandler).lNFTCollectionCreated(presale, _tokenAddress, _uri, _msgSender());
        IEventhandler(eventhandler).setNewCaller(presale);
    }


}