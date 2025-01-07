// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.28;

import "./CustomERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";



contract TokenFactory is Ownable{

address [] public ERC20s;

constructor() Ownable(_msgSender()){}


   function deployERC20(string memory _name, string memory _symbol, uint _amount) external onlyOwner{
        address token = address(new CustomERC20(
            _msgSender(),
            _amount,
            _name,
            _symbol
            
        ));

        ERC20s.push(token);

    }


}