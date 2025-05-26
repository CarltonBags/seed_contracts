// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";



abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

interface ID3Staking{
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external pure returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function mint(uint amount) external;
    function burn(uint amount) external;
    function getStakingParams(address staker) external view returns (uint balance, uint timestamp);

    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Transfer(address indexed from, address indexed to, uint256 value, uint timestamp);

}

contract D3Staking is ID3Staking, Context{

    //the address of the token that is being staked
    address public tokenAddress;
    
    //the struct that tracks the staking balance and the timestamp of the last staking action
    struct StakingParams{
        uint balance;
        uint timestamp;
    }

    receive() external payable {}
    fallback() external payable {}

    //the mapping that tracks the staking balance of the users
    mapping (address => StakingParams) private _balances;

    //the mapping that tracks the allowances of the users
    mapping (address => mapping (address => uint256)) private _allowances;
    
    
    string private _name;
    string private _symbol;
    uint public _totalSupply;

    constructor(string memory name_, string memory symbol_, address _tokenAddress){
        _name = name_;
        _symbol = symbol_;
        tokenAddress = _tokenAddress;
    }

    error InsufficientStake(uint required, uint balance);
    error ERC20InvalidAmount();
    error InvalidTransfer();
    error InsufficientFunds();
    error InsufficientAllowance();

    function name() external view returns (string memory) {
        return _name;
    }

    function symbol() external view returns (string memory) {
        return _symbol;
    }

    function decimals() external pure returns (uint8) {
        return 18;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account].balance;
    }

    function transfer(address recipient, uint256 amount) private returns (bool) {
        _transfer(address(0), recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) private returns (bool) {
        _transfer(sender, recipient, amount);
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) private {
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    //token transfers should only be allowed between the owner and the staking contract
    //making the contract non-transferable between wallets.
    //the function is private to only be callable from the mint() and burn() functions
    function _transfer(address from, address to, uint256 amount) private {
        if(from != address(0) && to != address(0)){revert InvalidTransfer();}
        if(from == address(0)){
            uint stakedAmount = _balances[to].balance;
            _balances[to] = StakingParams({
                balance: stakedAmount += amount,
                timestamp: block.timestamp
            });
        }
        if(to == address(0)){
            uint stakedAmount = _balances[from].balance;
            if(_allowances[from][address(this)] < amount){revert InsufficientAllowance();}
            _balances[from] = StakingParams({
                balance: stakedAmount -= amount,
                timestamp: block.timestamp
            });
            _allowances[from][address(this)] -= amount;
        }
        emit Transfer(from, to, amount, block.timestamp);
    }

    //allows users to stake their tokens in the staking contract
    function mint(uint amount) external {
        uint balance = IERC20(tokenAddress).balanceOf(_msgSender());
        if(balance < amount){revert InsufficientFunds();}
        if(amount == 0){revert ERC20InvalidAmount();}

        _totalSupply += amount;

        IERC20(tokenAddress).transferFrom(_msgSender(), address(this), amount);
        transfer(_msgSender(), amount);
    }

    //allows users to withdraw their tokens from the staking contract
    function burn(uint amount) external {
        if(_balances[_msgSender()].balance < amount){revert InsufficientFunds();}
        if(IERC20(tokenAddress).balanceOf(address(this)) < amount){revert InsufficientFunds();}

        _totalSupply -= amount;

        transferFrom(_msgSender(), address(0), amount);
        IERC20(tokenAddress).transfer(_msgSender(), amount);
    }

    function getStakingParams(address staker) external view returns (uint balance, uint timestamp){
        return(_balances[staker].balance, _balances[staker].timestamp);
    }

    function getTokenAddress() external view returns (address){
        return tokenAddress;
    }


    
}

