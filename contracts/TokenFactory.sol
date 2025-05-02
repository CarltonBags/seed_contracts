// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./CustomERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IEventhandler{

    function tokenDeployed(address token, string calldata name, string calldata symbol, address mintedTo, uint mintedAmount) external;
    function setNewCaller(address caller) external;

}

contract TokenFactory is Ownable{

    address [] public ERC20s;
    address private eventhandler;
    bool private active;

    error Inactive();
    error InvalidParam();

    constructor(address _eventhandler) Ownable(_msgSender()){
        eventhandler = _eventhandler;
    }


   function deployERC20(string memory _name, string memory _symbol, uint _amount) external onlyOwner{
        if(!active){revert Inactive();}
        if(_amount == 0){revert InvalidParam();}
        address token = address(new CustomERC20(
            _msgSender(),
            _amount,
            _name,
            _symbol
            
        ));

        ERC20s.push(token);

        IEventhandler(eventhandler).tokenDeployed(token, _name, _symbol, _msgSender(), _amount);
        IEventhandler(eventhandler).setNewCaller(token);

    }

    function setActive(bool _active) external onlyOwner{
        active = _active;
    }


    function receive() public{}
    function fallback()public{}

}