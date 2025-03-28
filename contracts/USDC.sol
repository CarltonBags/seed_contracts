// SPDX-License-Identifier: UNLICENSED

pragma solidity =0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDC is ERC20 {

    constructor(address [] memory receivers, uint amount, string memory _name, string memory _symbol) ERC20(_name, _symbol){
        for(uint i = 0; i < receivers.length; i++){
            _mint(receivers[i], amount);
        }
    }

    function decimals() public view override returns(uint8){
        return 6;
    }

}