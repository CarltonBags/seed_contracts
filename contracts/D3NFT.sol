pragma solidity =0.8.28;


import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract D3NFT is ERC721 {

    constructor(string memory d3NFT, string memory d3) ERC721(d3NFT, d3){
        address sexy = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        _mint(_msgSender(), 1);
        _mint(_msgSender(), 2);
        _mint(_msgSender(), 3);
        _mint(sexy, 4);


    }
}

