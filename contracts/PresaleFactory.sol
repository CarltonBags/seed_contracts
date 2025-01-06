// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.28;

import "./Presale.sol";
import "@openzeppelin/contracts/access/Ownable.sol";



contract PresaleFactory is Ownable{

address [] public Presales;


constructor() Ownable(_msgSender()){}

    function deployPresale(address _tokenAddress, string memory _uri) external onlyOwner {
        address presale = address(new Presale(
            _msgSender(),
            _tokenAddress,
            _uri
        ));

        Presales.push(presale);
    }


}