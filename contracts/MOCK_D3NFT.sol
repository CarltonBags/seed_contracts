pragma solidity ^0.8.28;


import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract D3NFT is ERC721 {

    constructor(string memory d3NFT, string memory d3) ERC721(d3NFT, d3){
        address sexy = address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266);
        _mint(_msgSender(), 1);
        _mint(_msgSender(), 2);
        _mint(_msgSender(), 3);
        _mint(_msgSender(), 4);
        _mint(_msgSender(), 5);
        _mint(_msgSender(), 6);
        _mint(_msgSender(), 7);
        _mint(_msgSender(), 8);
        _mint(_msgSender(), 9);
        _mint(_msgSender(), 10);
        _mint(_msgSender(), 11);
        _mint(_msgSender(), 12);
        _mint(_msgSender(), 13);
        _mint(_msgSender(), 14);
        _mint(_msgSender(), 15);
        _mint(_msgSender(), 16);
        _mint(_msgSender(), 17);
        _mint(_msgSender(), 18);
        _mint(_msgSender(), 19);
        _mint(_msgSender(), 20);
        _mint(_msgSender(), 21);
        _mint(_msgSender(), 22);
        _mint(_msgSender(), 23);
        _mint(_msgSender(), 24);
        _mint(_msgSender(), 25);
        _mint(_msgSender(), 26);
        _mint(_msgSender(), 27);
        _mint(_msgSender(), 28);
        _mint(_msgSender(), 29);
        _mint(_msgSender(), 30);
        _mint(_msgSender(), 31);
        _mint(_msgSender(), 32);
        _mint(_msgSender(), 33);
        _mint(_msgSender(), 34);
        _mint(_msgSender(), 35);
        _mint(_msgSender(), 36);
        _mint(_msgSender(), 37);
        _mint(_msgSender(), 38);
        _mint(_msgSender(), 39);
        _mint(_msgSender(), 40);
        _mint(_msgSender(), 41);
        _mint(_msgSender(), 42);
        _mint(_msgSender(), 43);
        _mint(_msgSender(), 44);
        _mint(_msgSender(), 45);
        _mint(_msgSender(), 46);
        _mint(_msgSender(), 47);
        _mint(_msgSender(), 48);
        _mint(_msgSender(), 49);
        _mint(_msgSender(), 50);
        _mint(_msgSender(), 51);
        //_mint(sexy, 31);



    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? baseURI : "";
    }

    function _baseURI() internal view override returns (string memory) {
        return "ipfs://bafkreidlotmc3zfaiypn2hvg3y357rohifxiulqdo6x577bjelxr5abxla";
    }
}

