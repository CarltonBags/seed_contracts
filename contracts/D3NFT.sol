pragma solidity =0.8.28;


import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract D3NFT is ERC721 {

    constructor(string memory d3NFT, string memory d3) ERC721(d3NFT, d3){
        address sexy = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        _mint(_msgSender(), 1);
        _mint(_msgSender(), 2);
        _mint(_msgSender(), 3);
        _mint(sexy, 4);
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

