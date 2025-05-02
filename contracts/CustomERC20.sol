// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CustomERC20 is ERC20 {

    constructor(address receiver, uint amount, string memory _name, string memory _symbol) ERC20(_name, _symbol){
        _mint(receiver, amount);
    }


}